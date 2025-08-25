import { supabase } from '@/integrations/supabase/client';
import { 
  grantAuthorRole, 
  createAuthorAccount, 
  activateExistingUserAccount,
  getRedirectUrlForRole 
} from './roleService';
import RateLimitService from './rateLimitService';
import AuditLogService from './auditLogService';
import InputSanitizationService from './inputSanitizationService';
import { AuthenticatedApiService } from './authenticatedApiService';
import { rlsPolicyManager, type AuthContext, type ProfileCreationData } from './rlsPolicyManager';
import { logger } from '@/utils/logger';
import { LogSource } from '@/utils/logger/types';
import { AsyncOperationManager, type AsyncOperationOptions, type OperationResult } from '@/utils/asyncOperationManager';

export interface InvitationRequest {
  id?: string;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  message?: string | null;
  status?: 'pending' | 'approved' | 'denied';
  created_at?: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  child_user_id?: string | null;
  confirmation_email_sent_at?: string | null;
  invitation_email_sent_at?: string | null;
  completed_at?: string | null;
  // Add these optional fields for the joined data
  reviewer?: {
    display_name: string;
  } | null;
  child_user?: {
    display_name: string;
    username: string;
  } | null;
}

export interface ServiceResponse<T = any> {
  data?: T;
  error?: any;
  code?: string;
  retryable?: boolean;
  details?: Record<string, any>;
  operationId?: string;
  duration?: number;
  attempts?: number;
  category?: ErrorCategory;
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  NETWORK = 'network', 
  SERVICE = 'service',
  UNEXPECTED = 'unexpected',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

export interface InvitationOperationOptions extends AsyncOperationOptions {
  enableFallback?: boolean;
  skipEmailSending?: boolean;
  validateOnly?: boolean;
}

/**
 * Service-level operation tracking for cleanup and monitoring
 */
class InvitationServiceOperationTracker {
  private static pendingOperations = new Map<string, {
    operationId: string;
    type: 'create' | 'update' | 'validate';
    startTime: number;
    email: string;
    controller?: AbortController;
  }>();

  static trackOperation(operationId: string, type: 'create' | 'update' | 'validate', email: string, controller?: AbortController) {
    this.pendingOperations.set(operationId, {
      operationId,
      type,
      startTime: Date.now(),
      email,
      controller
    });
    
    console.log(`[InvitationService] Tracking operation ${operationId} (${type}) for ${email}`);
  }

  static completeOperation(operationId: string) {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      const duration = Date.now() - operation.startTime;
      console.log(`[InvitationService] Completed operation ${operationId} in ${duration}ms`);
      this.pendingOperations.delete(operationId);
    }
  }

  static cancelOperation(operationId: string): boolean {
    const operation = this.pendingOperations.get(operationId);
    if (operation && operation.controller) {
      operation.controller.abort();
      console.log(`[InvitationService] Cancelled operation ${operationId}`);
      this.pendingOperations.delete(operationId);
      return true;
    }
    return false;
  }

  static cancelAllOperations(): number {
    let cancelledCount = 0;
    for (const [operationId, operation] of this.pendingOperations.entries()) {
      if (operation.controller) {
        operation.controller.abort();
        cancelledCount++;
      }
    }
    this.pendingOperations.clear();
    console.log(`[InvitationService] Cancelled ${cancelledCount} pending operations`);
    return cancelledCount;
  }

  static getPendingOperations() {
    return Array.from(this.pendingOperations.values());
  }

  static cleanupStaleOperations(maxAge: number = 300000): number { // 5 minutes
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [operationId, operation] of this.pendingOperations.entries()) {
      if (now - operation.startTime > maxAge) {
        if (operation.controller) {
          operation.controller.abort();
        }
        this.pendingOperations.delete(operationId);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[InvitationService] Cleaned up ${cleanedCount} stale operations`);
    }
    
    return cleanedCount;
  }
}

export interface InvitationTokenData {
  id: string;
  invitation_id: string;
  email: string;
  expires_at: string;
  invitation: InvitationRequest;
}

export interface UserData {
  email: string;
  password?: string;
  display_name?: string;
  username?: string;
}

export interface InvitationRegistrationData {
  token: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptedTerms: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
  redirectUrl?: string;
}

/**
 * Create a new invitation request and send confirmation email with enhanced timeout and cleanup mechanisms
 */
export async function createInvitationRequest(
  data: Omit<InvitationRequest, 'id' | 'status' | 'created_at'>,
  options: InvitationOperationOptions = {}
): Promise<ServiceResponse<InvitationRequest>> {
  const operationId = `invitation_create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const operationOptions: AsyncOperationOptions = {
    timeout: 30000, // 30 second timeout
    maxRetries: 2,
    retryDelay: 1000,
    exponentialBackoff: true,
    operationId,
    onProgress: (step, attempt) => {
      console.log(`[InvitationService] ${step}${attempt ? ` (attempt ${attempt})` : ''}`);
    },
    onError: (error, attempt, willRetry) => {
      console.warn(`[InvitationService] Attempt ${attempt} failed:`, error.message, willRetry ? '(will retry)' : '(final attempt)');
    },
    onSuccess: (result, attempt) => {
      console.log(`[InvitationService] Operation ${operationId} succeeded on attempt ${attempt}`);
      InvitationServiceOperationTracker.completeOperation(operationId);
    },
    ...options
  };

  // Track the operation for cleanup purposes
  InvitationServiceOperationTracker.trackOperation(operationId, 'create', data.parent_email);

  try {
    const result = await AsyncOperationManager.executeWithRetry(
      async (signal?: AbortSignal) => {
        return await createInvitationRequestInternal(data, { ...options, signal, operationId });
      },
      operationOptions
    );

    // Convert OperationResult to ServiceResponse
    const response = convertOperationResultToServiceResponse(result, ErrorCategory.SERVICE);
    
    // Ensure operation is marked as complete
    if (!result.success) {
      InvitationServiceOperationTracker.completeOperation(operationId);
    }
    
    return response;
  } catch (error) {
    // Ensure operation is cleaned up on unexpected errors
    InvitationServiceOperationTracker.completeOperation(operationId);
    throw error;
  }
}

/**
 * Internal implementation of invitation request creation with detailed logging and error categorization
 */
async function createInvitationRequestInternal(
  data: Omit<InvitationRequest, 'id' | 'status' | 'created_at'>,
  options: InvitationOperationOptions & { signal?: AbortSignal; operationId?: string } = {}
): Promise<InvitationRequest> {
  const { signal, enableFallback = true, skipEmailSending = false, validateOnly = false, operationId } = options;
  const startTime = Date.now();

  console.log(`[InvitationService] Starting invitation request creation`, {
    operationId,
    parent_email: data.parent_email,
    child_name: data.child_name,
    child_age: data.child_age,
    enableFallback,
    skipEmailSending,
    validateOnly
  });

  try {
    // Step 1: Input validation and sanitization
    console.log('📝 [InvitationService] Step 1: Validating and sanitizing input data', {
      operationId,
      hasParentName: !!data.parent_name,
      hasParentEmail: !!data.parent_email,
      hasChildName: !!data.child_name,
      childAge: data.child_age,
      hasMessage: !!data.message
    });
    
    if (signal?.aborted) {
      console.warn(`⚠️ [InvitationService] Operation ${operationId} was cancelled during input validation`);
      throw new Error('Operation was cancelled during input validation');
    }

    const sanitizedData = InputSanitizationService.sanitizeInvitationRequest({
      parent_name: data.parent_name,
      parent_email: data.parent_email,
      child_name: data.child_name,
      child_age: data.child_age,
      message: data.message || undefined
    });

    // Handle case where sanitization service returns undefined (e.g., in tests)
    if (!sanitizedData) {
      console.error(`❌ [InvitationService] Sanitization service returned undefined for operation ${operationId}`);
      const sanitizationError = new Error('Data sanitization failed - service returned undefined');
      sanitizationError.name = 'ValidationError';
      throw sanitizationError;
    }

    console.log('🧹 [InvitationService] Data sanitization completed', {
      operationId,
      sanitizedParentName: !!sanitizedData.parent_name,
      sanitizedParentEmail: !!sanitizedData.parent_email,
      sanitizedChildName: !!sanitizedData.child_name,
      sanitizedChildAge: sanitizedData.child_age
    });

    // Validate required fields
    if (!sanitizedData.parent_name || !sanitizedData.parent_email || !sanitizedData.child_name) {
      console.error(`❌ [InvitationService] Validation failed for operation ${operationId}: Missing required fields`, {
        hasParentName: !!sanitizedData.parent_name,
        hasParentEmail: !!sanitizedData.parent_email,
        hasChildName: !!sanitizedData.child_name
      });
      
      const validationError = new Error('Required fields are missing or invalid after sanitization');
      validationError.name = 'ValidationError';
      
      await AuditLogService.logInvitationRequest(
        'validation_failed',
        sanitizedData.parent_email || 'unknown',
        false,
        'Missing required fields after sanitization'
      );
      
      throw validationError;
    }

    // Validate age range
    if (sanitizedData.child_age < 8 || sanitizedData.child_age > 14) {
      console.error(`❌ [InvitationService] Age validation failed for operation ${operationId}`, {
        childAge: sanitizedData.child_age,
        minAge: 8,
        maxAge: 14
      });
      
      const ageError = new Error('Child age must be between 8 and 14 years');
      ageError.name = 'ValidationError';
      
      await AuditLogService.logInvitationRequest(
        'validation_failed',
        sanitizedData.parent_email,
        false,
        `Invalid age: ${sanitizedData.child_age}`
      );
      
      throw ageError;
    }

    console.log(`✅ [InvitationService] Input validation completed successfully for operation ${operationId}`);

    if (validateOnly) {
      console.log('🔍 [InvitationService] Validation-only mode, returning early');
      return sanitizedData as InvitationRequest;
    }

    // Step 2: Rate limiting check
    console.log(`🚦 [InvitationService] Step 2: Checking rate limits for operation ${operationId}`, {
      email: sanitizedData.parent_email,
      rateLimitType: 'invitation_request'
    });
    
    if (signal?.aborted) {
      console.warn(`⚠️ [InvitationService] Operation ${operationId} was cancelled during rate limit check`);
      throw new Error('Operation was cancelled during rate limit check');
    }

    const rateLimitResult = await RateLimitService.checkRateLimit(
      'invitation_request',
      sanitizedData.parent_email
    );

    console.log(`🚦 [InvitationService] Rate limit check result for operation ${operationId}`, {
      allowed: rateLimitResult.allowed,
      remainingAttempts: rateLimitResult.remainingAttempts,
      resetTime: rateLimitResult.resetTime ? new Date(rateLimitResult.resetTime).toISOString() : null
    });

    if (!rateLimitResult.allowed) {
      console.error(`❌ [InvitationService] Rate limit exceeded for operation ${operationId}`, {
        email: sanitizedData.parent_email,
        remainingAttempts: rateLimitResult.remainingAttempts,
        resetTime: new Date(rateLimitResult.resetTime).toLocaleTimeString()
      });
      
      await RateLimitService.recordAttempt('invitation_request', sanitizedData.parent_email, false, {
        reason: 'rate_limited',
        remainingAttempts: rateLimitResult.remainingAttempts,
        operationId
      });
      
      await AuditLogService.logInvitationRequest(
        'rate_limited',
        sanitizedData.parent_email,
        false,
        'Rate limit exceeded',
        true
      );
      
      const rateLimitError = new Error(`Too many invitation requests. Please try again after ${new Date(rateLimitResult.resetTime).toLocaleTimeString()}.`);
      rateLimitError.name = 'RateLimitError';
      throw rateLimitError;
    }

    console.log(`✅ [InvitationService] Rate limit check passed for operation ${operationId}`);

    // Step 3: Database insertion with timeout protection
    console.log(`💾 [InvitationService] Step 3: Creating invitation request in database for operation ${operationId}`, {
      parentEmail: sanitizedData.parent_email,
      parentName: sanitizedData.parent_name,
      childName: sanitizedData.child_name,
      childAge: sanitizedData.child_age
    });
    
    if (signal?.aborted) {
      console.warn(`⚠️ [InvitationService] Operation ${operationId} was cancelled before database insertion`);
      throw new Error('Operation was cancelled before database insertion');
    }

    let result: InvitationRequest;
    const dbStartTime = Date.now();
    
    try {
      console.log(`🔄 [InvitationService] Starting database insertion for operation ${operationId}`);
      
      // Use a race condition with the abort signal for timeout protection
      const insertPromise = supabase
        .from('invitation_requests')
        .insert([sanitizedData])
        .select()
        .single();

      const abortPromise = new Promise<never>((_, reject) => {
        if (signal) {
          signal.addEventListener('abort', () => {
            reject(new Error('Database operation was cancelled'));
          });
        }
      });

      const { data: insertResult, error: insertError } = await Promise.race([
        insertPromise,
        abortPromise
      ]);

      const dbDuration = Date.now() - dbStartTime;
      
      if (insertError) {
        console.error(`❌ [InvitationService] Database insertion failed for operation ${operationId}`, {
          duration: dbDuration,
          errorCode: insertError.code,
          errorMessage: insertError.message,
          errorDetails: insertError.details
        });
        
        const dbError = new Error(`Database insertion failed: ${insertError.message}`);
        dbError.name = 'DatabaseError';
        throw dbError;
      }

      result = insertResult;
      console.log(`✅ [InvitationService] Invitation request created successfully for operation ${operationId}`, {
        invitationId: result.id,
        duration: dbDuration,
        parentEmail: sanitizedData.parent_email
      });

      // Record successful database insertion
      await RateLimitService.recordAttempt('invitation_request', sanitizedData.parent_email, true, {
        invitationId: result.id,
        operationId,
        duration: dbDuration
      });
      
      await AuditLogService.logInvitationRequest(
        result.id,
        sanitizedData.parent_email,
        true,
        'Invitation request created successfully'
      );

    } catch (error) {
      const dbDuration = Date.now() - dbStartTime;
      console.error(`❌ [InvitationService] Database error creating invitation request for operation ${operationId}`, {
        duration: dbDuration,
        errorName: error.name,
        errorMessage: error.message,
        errorCode: error.code
      });
      
      await RateLimitService.recordAttempt('invitation_request', sanitizedData.parent_email, false, {
        error: error.message,
        errorCode: error.code,
        operationId,
        duration: dbDuration
      });
      
      await AuditLogService.logInvitationRequest(
        'database_error',
        sanitizedData.parent_email,
        false,
        `Database insertion failed: ${error.message}`
      );
      
      const dbError = new Error('Failed to create invitation request. Please try again.');
      dbError.name = 'DatabaseError';
      throw dbError;
    }

    // Step 4: Email sending with fallback mechanisms (if not skipped)
    if (!skipEmailSending) {
      console.log(`📧 [InvitationService] Step 4: Sending confirmation email for operation ${operationId}`, {
        invitationId: result.id,
        parentEmail: sanitizedData.parent_email,
        enableFallback
      });
      
      if (signal?.aborted) {
        console.warn(`⚠️ [InvitationService] Operation ${operationId} cancelled before email sending, but invitation was created`, {
          invitationId: result.id
        });
        // Don't throw here - the invitation was successfully created
        return result;
      }

      const emailStartTime = Date.now();
      
      try {
        await sendConfirmationEmailWithFallback(result.id, sanitizedData, { 
          signal, 
          enableFallback,
          operationId 
        });
        
        const emailDuration = Date.now() - emailStartTime;
        console.log(`✅ [InvitationService] Confirmation email sent successfully for operation ${operationId}`, {
          invitationId: result.id,
          duration: emailDuration
        });
        
      } catch (emailError) {
        const emailDuration = Date.now() - emailStartTime;
        console.warn(`⚠️ [InvitationService] Email sending failed for operation ${operationId}, but invitation was created`, {
          invitationId: result.id,
          duration: emailDuration,
          errorName: emailError.name,
          errorMessage: emailError.message
        });
        
        // Log email failure but don't fail the entire operation
        await AuditLogService.logEvent({
          action: 'email_complete_failure',
          resource_type: 'invitation_request',
          resource_id: result.id,
          user_email: sanitizedData.parent_email,
          success: false,
          error_message: 'All email sending methods failed',
          metadata: {
            error_message: emailError.message,
            error_name: emailError.name,
            requires_manual_intervention: true,
            invitation_created: true,
            operationId,
            duration: emailDuration
          }
        });
      }
    } else {
      console.log(`📧 [InvitationService] Email sending skipped per options for operation ${operationId}`);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [InvitationService] Invitation request creation completed in ${duration}ms`);

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`💥 [InvitationService] Invitation request creation failed after ${duration}ms:`, error);
    
    // Categorize and re-throw error with proper context
    const categorizedError = categorizeInvitationError(error);
    
    await AuditLogService.logEvent({
      action: 'invitation_request_failed',
      resource_type: 'invitation_request',
      user_email: data.parent_email,
      success: false,
      error_message: `${categorizedError.category}: ${error.message}`,
      metadata: {
        error_category: categorizedError.category,
        error_name: error.name,
        error_stack: error.stack,
        duration,
        input_data: {
          parent_email: data.parent_email,
          child_name: data.child_name,
          child_age: data.child_age
        }
      }
    });
    
    throw categorizedError.error;
  }
}

/**
 * Get all invitation requests (admin only)
 */
export async function getInvitationRequests(status?: 'pending' | 'approved' | 'denied') {
  try {
    let query = supabase
      .from('invitation_requests')
      .select(`
        *,
        reviewer:profiles!reviewer_id(display_name),
        child_user:profiles!child_user_id(display_name, username)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invitation requests:', error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('Exception fetching invitation requests:', error);
    return { error };
  }
}

/**
 * Update invitation request status (admin only)
 */
export async function updateInvitationRequestStatus(
  id: string, 
  status: 'approved' | 'denied', 
  reviewerId: string
): Promise<ServiceResponse<InvitationRequest>> {
  try {
    console.log(`📝 Updating invitation ${id} status to ${status} by reviewer ${reviewerId}`);

    // Validate input parameters
    if (!id || !status || !reviewerId) {
      const error = {
        error: 'Missing required parameters for status update',
        code: 'INVALID_UPDATE_PARAMS',
        retryable: false
      };
      
      await AuditLogService.logEvent({
        action: 'status_update_validation_failed',
        resource_type: 'invitation_request',
        resource_id: id,
        user_id: reviewerId,
        success: false,
        error_message: 'Missing required parameters',
        metadata: { status, reviewerId }
      });
      
      return error;
    }

    if (!['approved', 'denied'].includes(status)) {
      const error = {
        error: 'Invalid status value',
        code: 'INVALID_STATUS',
        retryable: false
      };
      
      await AuditLogService.logEvent({
        action: 'status_update_validation_failed',
        resource_type: 'invitation_request',
        resource_id: id,
        user_id: reviewerId,
        success: false,
        error_message: `Invalid status: ${status}`,
        metadata: { status, reviewerId }
      });
      
      return error;
    }

    // Update invitation status
    let updatedInvitation: InvitationRequest;
    
    try {
      const { data, error } = await supabase
        .from('invitation_requests')
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewer_id: reviewerId
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Database error updating invitation status:', error);
        
        await AuditLogService.logEvent({
          action: 'status_update_failed',
          resource_type: 'invitation_request',
          resource_id: id,
          user_id: reviewerId,
          success: false,
          error_message: `Database update failed: ${error.message}`,
          metadata: { 
            status, 
            errorCode: error.code,
            errorDetails: error.details 
          }
        });
        
        return { 
          error: 'Failed to update invitation status. Please try again.',
          code: 'DATABASE_UPDATE_ERROR',
          retryable: true,
          details: {
            originalError: error.message,
            errorCode: error.code
          }
        };
      }

      updatedInvitation = data;
      console.log('✅ Invitation status updated successfully');
      
      // Log successful status update
      await AuditLogService.logEvent({
        action: 'status_update_success',
        resource_type: 'invitation_request',
        resource_id: id,
        user_id: reviewerId,
        success: true,
        metadata: { 
          status,
          previous_status: 'pending' // Assuming it was pending
        }
      });

    } catch (error) {
      console.error('💥 Exception updating invitation status:', error);
      
      await AuditLogService.logEvent({
        action: 'status_update_exception',
        resource_type: 'invitation_request',
        resource_id: id,
        user_id: reviewerId,
        success: false,
        error_message: `Exception during update: ${error.message}`,
        metadata: { 
          status,
          errorName: error.name,
          errorStack: error.stack
        }
      });
      
      return { 
        error: 'An unexpected error occurred while updating the invitation.',
        code: 'UPDATE_EXCEPTION',
        retryable: true,
        details: {
          originalError: error.message
        }
      };
    }

    // Handle invitation email sending for approved invitations
    if (status === 'approved') {
      let emailSent = false;
      let emailError: any = null;
      let triggerError: any = null;

      // First attempt: Database trigger (RPC call)
      try {
        console.log('📧 Attempting to send invitation email via database trigger...');
        
        const { error: rpcError } = await supabase.rpc('send_invitation_email_rpc', {
          invitation_id_param: id
        });
        
        if (rpcError) {
          triggerError = rpcError;
          console.warn('⚠️ Database trigger failed for invitation email:', rpcError);
          
          // Log trigger failure
          await AuditLogService.logEvent({
            action: 'invitation_email_trigger_failed',
            resource_type: 'invitation_request',
            resource_id: id,
            user_id: reviewerId,
            success: false,
            error_message: `Database trigger failed: ${rpcError.message}`,
            metadata: {
              trigger_type: 'send_invitation_email_rpc',
              error_code: rpcError.code,
              error_details: rpcError.details
            }
          });
          
          throw rpcError;
        }
        
        emailSent = true;
        console.log('✅ Invitation email sent via database trigger');
        
        // Log successful trigger execution
        await AuditLogService.logEvent({
          action: 'invitation_email_trigger_success',
          resource_type: 'invitation_request',
          resource_id: id,
          user_id: reviewerId,
          success: true,
          metadata: {
            trigger_type: 'send_invitation_email_rpc'
          }
        });
        
      } catch (error) {
        console.warn('⚠️ Database trigger email failed, attempting client-side fallback:', error);
        emailError = error;
      }

      // Second attempt: Client-side fallback if trigger failed
      if (!emailSent) {
        try {
          console.log('📧 Attempting client-side fallback for invitation email...');
          
          const fallbackResult = await sendInvitationEmailFallback(id, updatedInvitation);
          
          if (fallbackResult.error) {
            throw new Error(fallbackResult.error);
          }
          
          emailSent = true;
          console.log('✅ Invitation email sent via client-side fallback');
          
          // Log successful fallback
          await AuditLogService.logEvent({
            action: 'invitation_email_fallback_success',
            resource_type: 'invitation_request',
            resource_id: id,
            user_id: reviewerId,
            success: true,
            metadata: {
              fallback_reason: triggerError?.message || 'Database trigger failed',
              fallback_method: 'client_side_direct'
            }
          });
          
        } catch (fallbackError) {
          console.error('❌ Client-side fallback for invitation email also failed:', fallbackError);
          emailError = fallbackError;
          
          // Log fallback failure
          await AuditLogService.logEvent({
            action: 'invitation_email_fallback_failed',
            resource_type: 'invitation_request',
            resource_id: id,
            user_id: reviewerId,
            success: false,
            error_message: `Fallback email failed: ${fallbackError.message}`,
            metadata: {
              trigger_error: triggerError?.message,
              fallback_error: fallbackError.message,
              both_methods_failed: true,
              requires_manual_intervention: true
            }
          });
        }
      }

      // Add email status to response
      const response: ServiceResponse<InvitationRequest> = {
        data: updatedInvitation
      };

      if (emailSent) {
        response.details = {
          emailSent: true,
          emailMethod: triggerError ? 'client_fallback' : 'database_trigger'
        };
      } else {
        response.details = {
          emailSent: false,
          emailError: emailError?.message || 'Unknown email error',
          triggerError: triggerError?.message,
          userMessage: 'The invitation was approved successfully, but we had trouble sending the invitation email. The parent will need to be contacted manually.'
        };
        
        // Log comprehensive email failure for admin attention
        await AuditLogService.logEvent({
          action: 'invitation_email_complete_failure',
          resource_type: 'invitation_request',
          resource_id: id,
          user_id: reviewerId,
          success: false,
          error_message: 'All invitation email sending methods failed',
          metadata: {
            trigger_error: triggerError?.message,
            fallback_error: emailError?.message,
            requires_manual_intervention: true,
            admin_action_needed: true
          }
        });
      }

      return response;
    }

    // For denied invitations, just return the updated data
    return { data: updatedInvitation };

  } catch (error) {
    console.error('💥 Unexpected exception in updateInvitationRequestStatus:', error);
    
    await AuditLogService.logEvent({
      action: 'status_update_unexpected_exception',
      resource_type: 'invitation_request',
      resource_id: id,
      user_id: reviewerId,
      success: false,
      error_message: `Unexpected exception: ${error.message}`,
      metadata: {
        status,
        errorName: error.name,
        errorStack: error.stack
      }
    });
    
    return { 
      error: 'An unexpected error occurred. Please try again.',
      code: 'UNEXPECTED_ERROR',
      retryable: true,
      details: {
        originalError: error.message
      }
    };
  }
}

/**
 * Cancel a specific invitation operation
 */
export function cancelInvitationOperation(operationId: string): boolean {
  const asyncResult = AsyncOperationManager.cancelOperation(operationId);
  const serviceResult = InvitationServiceOperationTracker.cancelOperation(operationId);
  return asyncResult || serviceResult;
}

/**
 * Cancel all pending invitation operations
 */
export function cancelAllInvitationOperations(): { asyncCancelled: number; serviceCancelled: number } {
  const asyncCancelled = AsyncOperationManager.cancelAllOperations();
  const serviceCancelled = InvitationServiceOperationTracker.cancelAllOperations();
  
  console.log(`[InvitationService] Cancelled operations - AsyncManager: ${asyncCancelled}, ServiceTracker: ${serviceCancelled}`);
  
  return { asyncCancelled, serviceCancelled };
}

/**
 * Get status of pending invitation operations
 */
export function getInvitationOperationStatus() {
  return {
    asyncOperations: AsyncOperationManager.getActiveOperations(),
    serviceOperations: InvitationServiceOperationTracker.getPendingOperations()
  };
}

/**
 * Cleanup stale invitation operations
 */
export function cleanupInvitationOperations(maxAge: number = 300000): { asyncCleaned: number; serviceCleaned: number } {
  const asyncCleaned = AsyncOperationManager.cleanup(maxAge);
  const serviceCleaned = InvitationServiceOperationTracker.cleanupStaleOperations(maxAge);
  
  if (asyncCleaned > 0 || serviceCleaned > 0) {
    console.log(`[InvitationService] Cleaned up operations - AsyncManager: ${asyncCleaned}, ServiceTracker: ${serviceCleaned}`);
  }
  
  return { asyncCleaned, serviceCleaned };
}

/**
 * Get pending invitation requests count (for admin dashboard)
 */
export async function getPendingInvitationsCount() {
  try {
    const { count, error } = await supabase
      .from('invitation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.error('Error getting pending invitations count:', error);
      return { error };
    }

    return { count: count || 0 };
  } catch (error) {
    console.error('Exception getting pending invitations count:', error);
    return { error };
  }
}

/**
 * Check if user is already an author/moderator/admin
 */
export async function findUserByEmail(email: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, display_name, username')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error finding user by email:', error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('Exception finding user by email:', error);
    return { error };
  }
}

/**
 * Upgrade existing user role to author
 * @deprecated Use grantAuthorRole from roleService instead
 */
export async function upgradeUserToAuthor(userId: string) {
  try {
    const result = await grantAuthorRole(userId);
    
    if (!result.success) {
      return { error: result.error };
    }

    return { data: result.user };
  } catch (error) {
    console.error('Exception upgrading user to author:', error);
    return { error };
  }
}

/**
 * Categorize errors for proper handling and user feedback
 */
function categorizeInvitationError(error: any): { category: ErrorCategory; error: Error } {
  const errorMessage = error.message || 'Unknown error';
  const errorName = error.name || 'Error';

  let category: ErrorCategory;
  let enhancedError: Error;

  if (errorName === 'ValidationError' || errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    category = ErrorCategory.VALIDATION;
    enhancedError = error;
    enhancedError.name = 'ValidationError';
  } else if (errorName === 'RateLimitError' || errorMessage.includes('rate limit')) {
    category = ErrorCategory.SERVICE;
    enhancedError = error;
    enhancedError.name = 'RateLimitError';
  } else if (errorName === 'DatabaseError' || errorMessage.includes('database') || errorMessage.includes('PGRST')) {
    category = ErrorCategory.SERVICE;
    enhancedError = error;
    enhancedError.name = 'DatabaseError';
  } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    category = ErrorCategory.TIMEOUT;
    enhancedError = new Error(errorMessage);
    enhancedError.name = 'TimeoutError';
  } else if (errorMessage.includes('cancelled') || errorMessage.includes('aborted')) {
    category = ErrorCategory.CANCELLED;
    enhancedError = new Error(errorMessage);
    enhancedError.name = 'CancelledError';
  } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
    category = ErrorCategory.NETWORK;
    enhancedError = error;
    enhancedError.name = 'NetworkError';
  } else {
    category = ErrorCategory.UNEXPECTED;
    enhancedError = error;
    enhancedError.name = 'UnexpectedError';
  }

  return { category, error: enhancedError };
}

/**
 * Convert AsyncOperationManager result to ServiceResponse
 */
function convertOperationResultToServiceResponse<T>(
  result: OperationResult<T>, 
  defaultCategory: ErrorCategory = ErrorCategory.SERVICE
): ServiceResponse<T> {
  if (result.success) {
    return {
      data: result.data,
      operationId: result.operationId,
      duration: result.duration,
      attempts: result.attempts
    };
  }

  let category = defaultCategory;
  let code = 'OPERATION_FAILED';
  let retryable = true;

  if (result.timedOut) {
    category = ErrorCategory.TIMEOUT;
    code = 'OPERATION_TIMEOUT';
    retryable = true;
  } else if (result.cancelled) {
    category = ErrorCategory.CANCELLED;
    code = 'OPERATION_CANCELLED';
    retryable = false;
  } else if (result.error) {
    const categorized = categorizeInvitationError(result.error);
    category = categorized.category;
    
    switch (category) {
      case ErrorCategory.VALIDATION:
        code = 'VALIDATION_ERROR';
        retryable = false;
        break;
      case ErrorCategory.NETWORK:
        code = 'NETWORK_ERROR';
        retryable = true;
        break;
      case ErrorCategory.SERVICE:
        code = 'SERVICE_ERROR';
        retryable = true;
        break;
      case ErrorCategory.UNEXPECTED:
        code = 'UNEXPECTED_ERROR';
        retryable = true;
        break;
    }
  }

  return {
    error: result.error?.message || 'Operation failed',
    code,
    retryable,
    category,
    operationId: result.operationId,
    duration: result.duration,
    attempts: result.attempts,
    details: {
      timedOut: result.timedOut,
      cancelled: result.cancelled,
      originalError: result.error?.message
    }
  };
}

/**
 * Enhanced confirmation email sending with timeout and cancellation support
 */
async function sendConfirmationEmailWithFallback(
  invitationId: string,
  invitationData: any,
  options: { signal?: AbortSignal; enableFallback?: boolean; operationId?: string } = {}
): Promise<void> {
  const { signal, enableFallback = true, operationId } = options;
  
  console.log(`📧 [InvitationService] Starting confirmation email for invitation ${invitationId}`);

  if (signal?.aborted) {
    throw new Error('Email operation was cancelled before starting');
  }

  let emailSent = false;
  let triggerError: any = null;
  let fallbackError: any = null;

  // First attempt: Database trigger (RPC call)
  try {
    console.log('📧 [InvitationService] Attempting confirmation email via database trigger...');
    
    if (signal?.aborted) {
      throw new Error('Email operation was cancelled during trigger attempt');
    }

    const triggerPromise = supabase.rpc('send_confirmation_email_rpc', {
      invitation_id_param: invitationId
    });

    const abortPromise = new Promise<never>((_, reject) => {
      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new Error('Database trigger was cancelled'));
        });
      }
    });

    const { error: rpcError } = await Promise.race([triggerPromise, abortPromise]);
    
    if (rpcError) {
      triggerError = rpcError;
      console.warn('⚠️ [InvitationService] Database trigger failed:', rpcError);
      
      await AuditLogService.logEvent({
        action: 'email_trigger_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        user_email: invitationData.parent_email,
        success: false,
        error_message: `Database trigger failed: ${rpcError.message}`,
        metadata: {
          trigger_type: 'send_confirmation_email_rpc',
          error_code: rpcError.code,
          error_details: rpcError.details,
          operation_id: operationId
        }
      });
      
      throw rpcError;
    }
    
    emailSent = true;
    console.log('✅ [InvitationService] Confirmation email sent via database trigger');
    
    await AuditLogService.logEvent({
      action: 'email_trigger_success',
      resource_type: 'invitation_request',
      resource_id: invitationId,
      user_email: invitationData.parent_email,
      success: true,
      metadata: {
        trigger_type: 'send_confirmation_email_rpc',
        operation_id: operationId
      }
    });
    
  } catch (error) {
    console.warn('⚠️ [InvitationService] Database trigger email failed:', error.message);
    triggerError = error;
  }

  // Second attempt: Client-side fallback if trigger failed and fallback is enabled
  if (!emailSent && enableFallback) {
    try {
      console.log('📧 [InvitationService] Attempting client-side fallback email...');
      
      if (signal?.aborted) {
        throw new Error('Email operation was cancelled during fallback attempt');
      }
      
      const fallbackResult = await sendConfirmationEmailFallback(invitationId, invitationData, { signal });
      
      if (fallbackResult.error) {
        throw new Error(fallbackResult.error);
      }
      
      emailSent = true;
      console.log('✅ [InvitationService] Confirmation email sent via client-side fallback');
      
      await AuditLogService.logEvent({
        action: 'email_fallback_success',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        user_email: invitationData.parent_email,
        success: true,
        metadata: {
          fallback_reason: triggerError?.message || 'Database trigger failed',
          fallback_method: 'client_side_direct',
          operation_id: operationId
        }
      });
      
    } catch (fallbackError) {
      console.error('❌ [InvitationService] Client-side fallback email also failed:', fallbackError);
      fallbackError = fallbackError;
      
      await AuditLogService.logEvent({
        action: 'email_fallback_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        user_email: invitationData.parent_email,
        success: false,
        error_message: `Fallback email failed: ${fallbackError.message}`,
        metadata: {
          trigger_error: triggerError?.message,
          fallback_error: fallbackError.message,
          both_methods_failed: true,
          operation_id: operationId
        }
      });
    }
  }

  if (!emailSent) {
    const emailError = new Error(
      fallbackError?.message || triggerError?.message || 'All email sending methods failed'
    );
    emailError.name = 'EmailError';
    throw emailError;
  }
}

/**
 * Enhanced fallback email sending with proper service role authentication and comprehensive error handling
 */
async function sendConfirmationEmailFallback(
  invitationId: string, 
  invitationData: any,
  options: { signal?: AbortSignal } = {}
): Promise<ServiceResponse> {
  const { signal } = options;
  
  try {
    console.log('📧 Starting enhanced confirmation email fallback for invitation:', invitationId);

    if (signal?.aborted) {
      throw new Error('Email fallback was cancelled before starting');
    }

    // Validate input parameters
    if (!invitationId || !invitationData) {
      const error = {
        error: 'Invalid parameters for email fallback',
        code: 'INVALID_FALLBACK_PARAMS',
        retryable: false,
        details: {
          hasInvitationId: !!invitationId,
          hasInvitationData: !!invitationData
        }
      };

      await AuditLogService.logEvent({
        action: 'confirmation_email_fallback_validation_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId || 'unknown',
        success: false,
        error_message: 'Invalid parameters for email fallback',
        metadata: error.details
      });

      return error;
    }

    // Validate email address
    if (!invitationData.parent_email) {
      const error = {
        error: 'Missing parent email for confirmation',
        code: 'MISSING_EMAIL',
        retryable: false,
        details: {
          invitationId,
          hasParentName: !!invitationData.parent_name,
          hasChildName: !!invitationData.child_name
        }
      };

      await AuditLogService.logEvent({
        action: 'confirmation_email_fallback_validation_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        success: false,
        error_message: 'Missing parent email for confirmation',
        metadata: error.details
      });

      return error;
    }

    if (signal?.aborted) {
      throw new Error('Email fallback was cancelled during validation');
    }

    // Prepare email data with validation
    const emailData = {
      type: 'invitation_confirmation' as const,
      to: invitationData.parent_email,
      templateData: {
        parentName: invitationData.parent_name || 'Parent',
        childName: invitationData.child_name || 'Child',
        submissionDate: invitationData.created_at 
          ? new Date(invitationData.created_at).toLocaleDateString()
          : new Date().toLocaleDateString()
      }
    };

    console.log('📧 Prepared confirmation email data:', {
      to: emailData.to,
      type: emailData.type,
      parentName: emailData.templateData.parentName,
      invitationId
    });

    // Log fallback attempt using enhanced logging
    try {
      await supabase.rpc('log_fallback_email_event', {
        p_event_type: 'fallback_attempt',
        p_email: invitationData.parent_email,
        p_template: 'invitation_confirmation',
        p_success: true,
        p_message_id: null,
        p_error_message: null,
        p_metadata: {
          invitation_id: invitationId,
          parent_name: emailData.templateData.parentName,
          child_name: emailData.templateData.childName,
          method: 'authenticated_api_service'
        }
      });
    } catch (logError) {
      console.warn('Failed to log fallback attempt:', logError);
    }

    // Also log to audit logs for backward compatibility
    await AuditLogService.logEvent({
      action: 'confirmation_email_fallback_attempt',
      resource_type: 'invitation_request',
      resource_id: invitationId,
      user_email: invitationData.parent_email,
      success: true,
      metadata: {
        email_type: emailData.type,
        parent_name: emailData.templateData.parentName,
        child_name: emailData.templateData.childName
      }
    });

    if (signal?.aborted) {
      throw new Error('Email fallback was cancelled before sending');
    }

    // Use the authenticated API service to send email with proper service role authentication and cancellation support
    const emailPromise = AuthenticatedApiService.sendEmail(emailData);
    
    const abortPromise = new Promise<never>((_, reject) => {
      if (signal) {
        signal.addEventListener('abort', () => {
          reject(new Error('Email sending was cancelled'));
        });
      }
    });

    const emailResult = await Promise.race([emailPromise, abortPromise]);

    if (!emailResult.success) {
      console.error('❌ Confirmation email fallback failed:', emailResult.error);
      
      // Log fallback failure using enhanced logging
      try {
        await supabase.rpc('log_fallback_email_event', {
          p_event_type: 'failed',
          p_email: invitationData.parent_email,
          p_template: 'invitation_confirmation',
          p_success: false,
          p_message_id: null,
          p_error_message: emailResult.error || 'Email fallback failed',
          p_metadata: {
            invitation_id: invitationId,
            error_code: emailResult.code,
            retryable: emailResult.retryable,
            attempts: emailResult.details?.attempts,
            last_error: emailResult.details?.lastError,
            service_role_available: emailResult.details?.serviceRoleAvailable,
            method: 'authenticated_api_service'
          }
        });
      } catch (logError) {
        console.warn('Failed to log fallback failure:', logError);
      }

      // Also log to audit logs for backward compatibility
      await AuditLogService.logEvent({
        action: 'confirmation_email_fallback_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        user_email: invitationData.parent_email,
        success: false,
        error_message: emailResult.error || 'Email fallback failed',
        metadata: {
          error_code: emailResult.code,
          retryable: emailResult.retryable,
          attempts: emailResult.details?.attempts,
          last_error: emailResult.details?.lastError,
          service_role_available: emailResult.details?.serviceRoleAvailable
        }
      });

      return {
        error: emailResult.error || 'Failed to send confirmation email',
        code: emailResult.code || 'EMAIL_FALLBACK_FAILED',
        retryable: emailResult.retryable !== false,
        details: {
          ...emailResult.details,
          invitationId,
          userMessage: 'We had trouble sending your confirmation email, but your request was submitted successfully. You should still receive updates about your request status.'
        }
      };
    }

    console.log('✅ Confirmation email sent successfully via authenticated fallback');

    // Log successful fallback using enhanced logging
    try {
      await supabase.rpc('log_fallback_email_event', {
        p_event_type: 'sent',
        p_email: invitationData.parent_email,
        p_template: 'invitation_confirmation',
        p_success: true,
        p_message_id: emailResult.data?.messageId || `fallback_${invitationId}`,
        p_error_message: null,
        p_metadata: {
          invitation_id: invitationId,
          attempts: emailResult.details?.attempt || 1,
          method: 'authenticated_api_service'
        }
      });
    } catch (logError) {
      console.warn('Failed to log fallback success:', logError);
    }

    // Also log to audit logs for backward compatibility
    await AuditLogService.logEvent({
      action: 'confirmation_email_fallback_success',
      resource_type: 'invitation_request',
      resource_id: invitationId,
      user_email: invitationData.parent_email,
      success: true,
      metadata: {
        email_method: 'authenticated_fallback',
        attempts: emailResult.details?.attempt || 1,
        message_id: emailResult.data?.messageId
      }
    });

    // Update invitation with confirmation email timestamp
    try {
      const { error: updateError } = await supabase
        .from('invitation_requests')
        .update({ 
          confirmation_email_sent_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) {
        console.warn('⚠️ Failed to update confirmation email timestamp:', updateError);
        
        // Log timestamp update failure (non-critical)
        await AuditLogService.logEvent({
          action: 'confirmation_email_timestamp_update_failed',
          resource_type: 'invitation_request',
          resource_id: invitationId,
          success: false,
          error_message: `Timestamp update failed: ${updateError.message}`,
          metadata: {
            error_code: updateError.code,
            email_sent: true
          }
        });
      } else {
        console.log('✅ Updated confirmation email timestamp');
      }
    } catch (updateError) {
      console.warn('⚠️ Exception updating confirmation email timestamp:', updateError);
    }

    return { 
      data: { 
        success: true, 
        messageId: emailResult.data?.messageId,
        method: 'authenticated_fallback',
        invitationId,
        authenticated: true
      } 
    };

  } catch (error) {
    console.error('💥 Exception in confirmation email fallback:', error);
    
    // Log unexpected exception
    await AuditLogService.logEvent({
      action: 'confirmation_email_fallback_exception',
      resource_type: 'invitation_request',
      resource_id: invitationId || 'unknown',
      user_email: invitationData?.parent_email || 'unknown',
      success: false,
      error_message: `Unexpected exception: ${error.message}`,
      metadata: {
        error_name: error.name,
        error_stack: error.stack,
        has_invitation_data: !!invitationData
      }
    });
    
    return { 
      error: error.message || 'Unexpected error in email fallback',
      code: 'FALLBACK_EXCEPTION',
      retryable: true,
      details: {
        invitationId,
        errorName: error.name,
        userMessage: 'An unexpected error occurred while sending your confirmation email. Your request was submitted successfully.'
      }
    };
  }
}

/**
 * Send confirmation email directly via Edge Function (legacy fallback)
 * @deprecated Use sendConfirmationEmailFallback instead
 */
async function sendConfirmationEmailDirect(invitationId: string): Promise<ServiceResponse> {
  try {
    const { data: invitation, error } = await supabase
      .from('invitation_requests')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (error || !invitation) {
      return { error: 'Invitation not found' };
    }

    // Use the enhanced fallback function
    return await sendConfirmationEmailFallback(invitationId, invitation);
  } catch (error) {
    console.error('Direct confirmation email error:', error);
    return { error: error.message };
  }
}

/**
 * Enhanced fallback for sending invitation emails with proper service role authentication and comprehensive error handling
 */
async function sendInvitationEmailFallback(
  invitationId: string, 
  invitationData: any
): Promise<ServiceResponse> {
  try {
    console.log('📧 Starting enhanced invitation email fallback for invitation:', invitationId);

    // Validate input parameters
    if (!invitationId || !invitationData) {
      const error = {
        error: 'Invalid parameters for invitation email fallback',
        code: 'INVALID_FALLBACK_PARAMS',
        retryable: false,
        details: {
          hasInvitationId: !!invitationId,
          hasInvitationData: !!invitationData
        }
      };

      await AuditLogService.logEvent({
        action: 'invitation_email_fallback_validation_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId || 'unknown',
        success: false,
        error_message: 'Invalid parameters for invitation email fallback',
        metadata: error.details
      });

      return error;
    }

    // Validate invitation status
    if (invitationData.status !== 'approved') {
      const error = {
        error: 'Invitation must be approved before sending email',
        code: 'INVITATION_NOT_APPROVED',
        retryable: false,
        details: {
          invitationId,
          currentStatus: invitationData.status,
          requiredStatus: 'approved'
        }
      };

      await AuditLogService.logEvent({
        action: 'invitation_email_fallback_validation_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        success: false,
        error_message: 'Invitation not approved for email sending',
        metadata: error.details
      });

      return error;
    }

    // Validate email address
    if (!invitationData.parent_email) {
      const error = {
        error: 'Missing parent email for invitation',
        code: 'MISSING_EMAIL',
        retryable: false,
        details: {
          invitationId,
          hasParentName: !!invitationData.parent_name,
          hasChildName: !!invitationData.child_name
        }
      };

      await AuditLogService.logEvent({
        action: 'invitation_email_fallback_validation_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        success: false,
        error_message: 'Missing parent email for invitation',
        metadata: error.details
      });

      return error;
    }

    // Prepare email data with invitation ID for server-side token generation
    const emailData = {
      type: 'invitation_approved' as const,
      to: invitationData.parent_email,
      templateData: {
        parentName: invitationData.parent_name || 'Parent',
        childName: invitationData.child_name || 'Child',
        invitationId: invitationId
      }
    };

    console.log('📧 Prepared invitation email data:', {
      to: emailData.to,
      type: emailData.type,
      parentName: emailData.templateData.parentName,
      invitationId
    });

    // Log fallback attempt using enhanced logging
    try {
      await supabase.rpc('log_fallback_email_event', {
        p_event_type: 'fallback_attempt',
        p_email: invitationData.parent_email,
        p_template: 'invitation_approved',
        p_success: true,
        p_message_id: null,
        p_error_message: null,
        p_metadata: {
          invitation_id: invitationId,
          parent_name: emailData.templateData.parentName,
          child_name: emailData.templateData.childName,
          method: 'authenticated_api_service'
        }
      });
    } catch (logError) {
      console.warn('Failed to log invitation fallback attempt:', logError);
    }

    // Also log to audit logs for backward compatibility
    await AuditLogService.logEvent({
      action: 'invitation_email_fallback_attempt',
      resource_type: 'invitation_request',
      resource_id: invitationId,
      user_email: invitationData.parent_email,
      success: true,
      metadata: {
        email_type: emailData.type,
        parent_name: emailData.templateData.parentName,
        child_name: emailData.templateData.childName
      }
    });

    // Use the authenticated API service to send email with proper service role authentication
    const emailResult = await AuthenticatedApiService.sendEmail(emailData);

    if (!emailResult.success) {
      console.error('❌ Invitation email fallback failed:', emailResult.error);
      
      // Log fallback failure using enhanced logging
      try {
        await supabase.rpc('log_fallback_email_event', {
          p_event_type: 'failed',
          p_email: invitationData.parent_email,
          p_template: 'invitation_approved',
          p_success: false,
          p_message_id: null,
          p_error_message: emailResult.error || 'Email fallback failed',
          p_metadata: {
            invitation_id: invitationId,
            error_code: emailResult.code,
            retryable: emailResult.retryable,
            attempts: emailResult.details?.attempts,
            last_error: emailResult.details?.lastError,
            service_role_available: emailResult.details?.serviceRoleAvailable,
            method: 'authenticated_api_service'
          }
        });
      } catch (logError) {
        console.warn('Failed to log invitation fallback failure:', logError);
      }

      // Also log to audit logs for backward compatibility
      await AuditLogService.logEvent({
        action: 'invitation_email_fallback_failed',
        resource_type: 'invitation_request',
        resource_id: invitationId,
        user_email: invitationData.parent_email,
        success: false,
        error_message: emailResult.error || 'Email fallback failed',
        metadata: {
          error_code: emailResult.code,
          retryable: emailResult.retryable,
          attempts: emailResult.details?.attempts,
          last_error: emailResult.details?.lastError,
          service_role_available: emailResult.details?.serviceRoleAvailable
        }
      });

      return {
        error: emailResult.error || 'Failed to send invitation email',
        code: emailResult.code || 'INVITATION_EMAIL_FALLBACK_FAILED',
        retryable: emailResult.retryable !== false,
        details: {
          ...emailResult.details,
          invitationId,
          userMessage: 'The invitation was approved successfully, but we had trouble sending the invitation email. Please contact support for assistance.'
        }
      };
    }

    console.log('✅ Invitation email sent successfully via authenticated fallback');

    // Log successful fallback using enhanced logging
    try {
      await supabase.rpc('log_fallback_email_event', {
        p_event_type: 'sent',
        p_email: invitationData.parent_email,
        p_template: 'invitation_approved',
        p_success: true,
        p_message_id: emailResult.data?.messageId || `fallback_${invitationId}`,
        p_error_message: null,
        p_metadata: {
          invitation_id: invitationId,
          attempts: emailResult.details?.attempt || 1,
          method: 'authenticated_api_service'
        }
      });
    } catch (logError) {
      console.warn('Failed to log invitation fallback success:', logError);
    }

    // Also log to audit logs for backward compatibility
    await AuditLogService.logEvent({
      action: 'invitation_email_fallback_success',
      resource_type: 'invitation_request',
      resource_id: invitationId,
      user_email: invitationData.parent_email,
      success: true,
      metadata: {
        email_method: 'authenticated_fallback',
        attempts: emailResult.details?.attempt || 1,
        message_id: emailResult.data?.messageId
      }
    });

    // Update invitation with email timestamp
    try {
      const { error: updateError } = await supabase
        .from('invitation_requests')
        .update({ 
          invitation_email_sent_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) {
        console.warn('⚠️ Failed to update invitation email timestamp:', updateError);
        
        // Log timestamp update failure (non-critical)
        await AuditLogService.logEvent({
          action: 'invitation_email_timestamp_update_failed',
          resource_type: 'invitation_request',
          resource_id: invitationId,
          success: false,
          error_message: `Timestamp update failed: ${updateError.message}`,
          metadata: {
            error_code: updateError.code,
            email_sent: true
          }
        });
      } else {
        console.log('✅ Updated invitation email timestamp');
      }
    } catch (updateError) {
      console.warn('⚠️ Exception updating invitation email timestamp:', updateError);
    }

    return { 
      data: { 
        success: true, 
        messageId: emailResult.data?.messageId,
        method: 'authenticated_fallback',
        invitationId,
        authenticated: true
      } 
    };

  } catch (error) {
    console.error('💥 Exception in invitation email fallback:', error);
    
    // Log unexpected exception
    await AuditLogService.logEvent({
      action: 'invitation_email_fallback_exception',
      resource_type: 'invitation_request',
      resource_id: invitationId || 'unknown',
      user_email: invitationData?.parent_email || 'unknown',
      success: false,
      error_message: `Unexpected exception: ${error.message}`,
      metadata: {
        error_name: error.name,
        error_stack: error.stack,
        has_invitation_data: !!invitationData
      }
    });
    
    return { 
      error: error.message || 'Unexpected error in invitation email fallback',
      code: 'INVITATION_FALLBACK_EXCEPTION',
      retryable: true,
      details: {
        invitationId,
        errorName: error.name,
        userMessage: 'An unexpected error occurred while sending your invitation email. Please contact support.'
      }
    };
  }
}

/**
 * Send invitation email directly via Edge Function (legacy fallback)
 * @deprecated Use sendInvitationEmailFallback instead
 */
async function sendInvitationEmailDirect(invitationId: string): Promise<ServiceResponse> {
  try {
    const { data: invitation, error } = await supabase
      .from('invitation_requests')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (error || !invitation) {
      return { error: 'Invitation not found' };
    }

    if (invitation.status !== 'approved') {
      return { error: 'Invitation must be approved first' };
    }

    // Use the enhanced fallback function
    return await sendInvitationEmailFallback(invitationId, invitation);
  } catch (error) {
    console.error('Direct invitation email error:', error);
    return { error: error.message };
  }
}

/**
 * Send confirmation email after invitation request creation
 */
export async function sendInvitationConfirmation(invitationId: string): Promise<ServiceResponse> {
  try {
    // Validate input
    if (!invitationId || typeof invitationId !== 'string') {
      return { error: 'Invalid invitation ID provided' };
    }

    // Get invitation data with retry logic
    let invitation;
    let fetchAttempts = 0;
    const maxFetchAttempts = 3;

    while (fetchAttempts < maxFetchAttempts) {
      const { data, error: fetchError } = await supabase
        .from('invitation_requests')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (!fetchError && data) {
        invitation = data;
        break;
      }

      fetchAttempts++;
      if (fetchAttempts === maxFetchAttempts) {
        console.error('Error fetching invitation for confirmation email:', fetchError);
        return { 
          error: fetchError?.message || 'Invitation not found',
          code: 'INVITATION_NOT_FOUND',
          retryable: false
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * fetchAttempts));
    }

    // Validate invitation data
    if (!invitation.parent_email) {
      return { 
        error: 'Invalid invitation: missing parent email',
        code: 'INVALID_INVITATION_DATA',
        retryable: false
      };
    }

    // Prepare email data with validation
    const emailData = {
      type: 'invitation_confirmation' as const,
      to: invitation.parent_email,
      templateData: {
        parentName: invitation.parent_name || 'Parent',
        childName: invitation.child_name || 'Child',
        submissionDate: invitation.created_at 
          ? new Date(invitation.created_at).toLocaleDateString()
          : new Date().toLocaleDateString(),
      }
    };

    // Call email service with retry logic
    let emailResult;
    let emailAttempts = 0;
    const maxEmailAttempts = 3;

    console.log('📧 Sending confirmation email to:', invitation.parent_email);
    console.log('🔗 Using Supabase SDK to call send-email function');

    while (emailAttempts < maxEmailAttempts) {
      try {
        const { data: emailResponse, error: emailError } = await supabase.functions.invoke('send-email', {
          body: emailData
        });

        if (emailError) {
          throw new Error(`Supabase function error: ${emailError.message}`);
        }

        emailResult = emailResponse;
        
        if (emailResult.success) {
          break;
        } else if (!emailResult.retryable) {
          // Non-retryable error, break immediately
          break;
        }
      } catch (error) {
        console.warn(`Email attempt ${emailAttempts + 1} failed:`, error.message);
        
        if (emailAttempts === maxEmailAttempts - 1) {
          return { 
            error: `Failed to send confirmation email after ${maxEmailAttempts} attempts: ${error.message}`,
            code: 'EMAIL_SERVICE_FAILURE',
            retryable: true
          };
        }
      }

      emailAttempts++;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, emailAttempts)));
    }

    if (!emailResult?.success) {
      console.error('Email service error:', emailResult?.error);
      return { 
        error: emailResult?.error || 'Failed to send confirmation email',
        code: emailResult?.code || 'EMAIL_SEND_FAILED',
        retryable: emailResult?.retryable ?? true
      };
    }

    // Update invitation with confirmation email timestamp
    try {
      const { error: updateError } = await supabase
        .from('invitation_requests')
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (updateError) {
        console.warn('Failed to update confirmation email timestamp:', updateError);
        // Don't fail the entire operation for this
      }
    } catch (updateError) {
      console.warn('Exception updating confirmation email timestamp:', updateError);
    }

    return { 
      data: { 
        success: true, 
        messageId: emailResult.messageId,
        invitationId: invitationId
      } 
    };
  } catch (error) {
    console.error('Exception sending invitation confirmation:', error);
    return { 
      error: error.message || 'Unexpected error occurred',
      code: 'UNEXPECTED_ERROR',
      retryable: true
    };
  }
}



/**
 * Validate invitation token and get invitation data
 */
export async function validateInvitationToken(token: string, email?: string): Promise<ServiceResponse<InvitationTokenData>> {
  try {
    console.log('🔍 Starting enhanced token validation...');

    // Validate input
    if (!token || typeof token !== 'string') {
      const error = {
        error: 'Invalid token provided',
        code: 'INVALID_TOKEN',
        retryable: false,
        details: {
          hasToken: !!token,
          tokenType: typeof token
        }
      };

      await AuditLogService.logEvent({
        action: 'token_validation_input_invalid',
        resource_type: 'invitation_token',
        success: false,
        error_message: 'Invalid token provided',
        metadata: error.details
      });

      return error;
    }

    // Basic token format validation
    const tokenRegex = /^[a-f0-9]{64}$/i;
    if (!tokenRegex.test(token.trim())) {
      const error = {
        error: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT',
        retryable: false,
        details: {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 8)
        }
      };

      await AuditLogService.logEvent({
        action: 'token_validation_format_invalid',
        resource_type: 'invitation_token',
        success: false,
        error_message: 'Invalid token format',
        metadata: error.details
      });

      return error;
    }

    // Check rate limit for token validation
    const identifier = email || token.substring(0, 16); // Use email or token prefix as identifier
    const rateLimitResult = await RateLimitService.checkRateLimit(
      'token_validation',
      identifier
    );

    if (!rateLimitResult.allowed) {
      await RateLimitService.recordAttempt('token_validation', identifier, false, {
        reason: 'rate_limited',
        token: token.substring(0, 8) + '...' // Log partial token for debugging
      });
      
      await AuditLogService.logEvent({
        action: 'token_validation_rate_limited',
        resource_type: 'invitation_token',
        success: false,
        error_message: 'Rate limit exceeded for token validation',
        metadata: {
          identifier,
          reset_time: rateLimitResult.resetTime,
          remaining_attempts: rateLimitResult.remainingAttempts
        }
      });
      
      return { 
        error: `Too many validation attempts. Please try again after ${new Date(rateLimitResult.resetTime).toLocaleTimeString()}.`,
        code: 'RATE_LIMITED',
        retryable: true,
        details: {
          resetTime: rateLimitResult.resetTime,
          remainingAttempts: rateLimitResult.remainingAttempts,
          userMessage: 'Please wait before trying again.'
        }
      };
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        const error = {
          error: 'Invalid email format',
          code: 'INVALID_EMAIL_FORMAT',
          retryable: false,
          details: {
            email: email.substring(0, 20) + '...'
          }
        };

        await AuditLogService.logEvent({
          action: 'token_validation_email_invalid',
          resource_type: 'invitation_token',
          success: false,
          error_message: 'Invalid email format provided',
          metadata: error.details
        });

        return error;
      }
    }

    // Log validation attempt
    await AuditLogService.logEvent({
      action: 'token_validation_attempt',
      resource_type: 'invitation_token',
      success: true,
      metadata: {
        token_prefix: token.substring(0, 16),
        has_email: !!email,
        identifier
      }
    });

    // Direct database token validation (bypassing Edge Function to avoid CORS issues)
    let tokenResult;
    try {
      // Hash the token for database lookup
      const encoder = new TextEncoder();
      const data = encoder.encode(token.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Query the database directly
      const { data: tokenData, error: dbError } = await supabase
        .from('invitation_tokens')
        .select(`
          id,
          email,
          invitation_request_id,
          expires_at,
          used_at,
          invitation_requests!inner(
            id,
            parent_name,
            parent_email,
            child_name,
            child_age,
            status
          )
        `)
        .eq('token_hash', tokenHash)
        .single();

      if (dbError || !tokenData) {
        tokenResult = {
          success: false,
          error: 'Token not found or invalid',
          code: 'TOKEN_NOT_FOUND'
        };
      } else if (tokenData.used_at) {
        tokenResult = {
          success: false,
          error: 'Token has already been used',
          code: 'TOKEN_ALREADY_USED'
        };
      } else if (new Date(tokenData.expires_at) < new Date()) {
        tokenResult = {
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        };
      } else if (email && tokenData.email !== email.trim()) {
        tokenResult = {
          success: false,
          error: 'Email does not match token',
          code: 'EMAIL_MISMATCH'
        };
      } else if (tokenData.invitation_requests.status !== 'approved') {
        tokenResult = {
          success: false,
          error: 'Invitation is not approved',
          code: 'INVITATION_NOT_APPROVED'
        };
      } else {
        tokenResult = {
          success: true,
          data: {
            id: tokenData.id,
            invitation_id: tokenData.invitation_request_id,
            email: tokenData.email,
            expires_at: tokenData.expires_at,
            invitation: tokenData.invitation_requests,
            // Also provide the expected invitationData structure
            invitationData: {
              id: tokenData.id,
              invitation_id: tokenData.invitation_request_id,
              email: tokenData.email,
              expires_at: tokenData.expires_at,
              invitation: tokenData.invitation_requests
            }
          }
        };
      }
    } catch (error) {
      console.error('❌ Direct token validation error:', error);
      tokenResult = {
        success: false,
        error: 'Failed to validate token',
        code: 'VALIDATION_ERROR'
      };
    }

    if (!tokenResult.success) {
      console.error('❌ Token validation failed:', tokenResult.error);

      // Record failed validation attempt
      await RateLimitService.recordAttempt('token_validation', identifier, false, {
        error: tokenResult.error,
        code: tokenResult.code
      });
      
      // Log failed token validation with detailed information
      await AuditLogService.logEvent({
        action: 'token_validation_failed',
        resource_type: 'invitation_token',
        success: false,
        error_message: tokenResult.error || 'Token validation failed',
        metadata: {
          token_prefix: token.substring(0, 16),
          error_code: tokenResult.code,
          retryable: tokenResult.retryable,
          identifier
        }
      });
      
      return { 
        error: tokenResult.error || 'Token validation failed',
        code: tokenResult.code || 'VALIDATION_FAILED',
        retryable: tokenResult.retryable !== false,
        details: {
          ...tokenResult.details,
          userMessage: 'Unable to validate your invitation token. Please check the link or contact support.'
        }
      };
    }

    // Validate the returned data structure
    const invitationData = tokenResult.data?.invitationData || tokenResult.data;
    if (!invitationData || !invitationData.invitation) {
      await RateLimitService.recordAttempt('token_validation', identifier, false, {
        error: 'Invalid token data received'
      });
      
      await AuditLogService.logEvent({
        action: 'token_validation_data_invalid',
        resource_type: 'invitation_token',
        success: false,
        error_message: 'Invalid token data structure received',
        metadata: {
          token_prefix: token.substring(0, 16),
          has_invitation_data: !!invitationData,
          has_invitation: !!(invitationData?.invitation),
          identifier
        }
      });
      
      return { 
        error: 'Invalid token data received',
        code: 'INVALID_TOKEN_DATA',
        retryable: false,
        details: {
          userMessage: 'The invitation token data is invalid. Please contact support.'
        }
      };
    }

    // Additional validation of invitation data
    if (!invitationData.invitation.parent_email) {
      await RateLimitService.recordAttempt('token_validation', identifier, false, {
        error: 'Invalid invitation data: missing email'
      });
      
      await AuditLogService.logEvent({
        action: 'token_validation_invitation_invalid',
        resource_type: 'invitation_token',
        success: false,
        error_message: 'Invalid invitation data: missing email',
        metadata: {
          token_prefix: token.substring(0, 16),
          invitation_id: invitationData.invitation.id,
          identifier
        }
      });
      
      return { 
        error: 'Invalid invitation data: missing email',
        code: 'INVALID_INVITATION_DATA',
        retryable: false,
        details: {
          userMessage: 'The invitation data is incomplete. Please contact support.'
        }
      };
    }

    // Record successful validation
    await RateLimitService.recordAttempt('token_validation', identifier, true, {
      invitationId: invitationData.invitation.id,
      email: invitationData.invitation.parent_email
    });
    
    // Log successful token validation
    await AuditLogService.logEvent({
      action: 'token_validation_success',
      resource_type: 'invitation_token',
      success: true,
      metadata: {
        token_id: invitationData.id,
        invitation_id: invitationData.invitation.id,
        parent_email: invitationData.invitation.parent_email,
        identifier
      }
    });

    console.log('✅ Token validation successful');

    return { data: invitationData };
  } catch (error) {
    console.error('💥 Exception validating invitation token:', error);
    
    // Log unexpected exception
    await AuditLogService.logEvent({
      action: 'token_validation_exception',
      resource_type: 'invitation_token',
      success: false,
      error_message: `Unexpected exception: ${error.message}`,
      metadata: {
        token_prefix: token?.substring(0, 16) || 'unknown',
        error_name: error.name,
        error_stack: error.stack,
        has_email: !!email
      }
    });
    
    return { 
      error: error.message || 'Unexpected error during token validation',
      code: 'UNEXPECTED_ERROR',
      retryable: true,
      details: {
        userMessage: 'An unexpected error occurred while validating your invitation. Please try again or contact support.'
      }
    };
  }
}

/**
 * Process invitation registration with enhanced RLS policy management
 * This method handles the complete invitation-based author registration flow
 */
export async function processInvitationRegistration(
  registrationData: InvitationRegistrationData
): Promise<AuthResult> {
  try {
    logger.info(LogSource.AUTH, 'Starting invitation registration process', {
      email: registrationData.email,
      token: registrationData.token.substring(0, 16) + '...'
    });

    // Validate input data
    const sanitizedData = InputSanitizationService.sanitizeInvitationRequest({
      parent_name: `${registrationData.firstName} ${registrationData.lastName}`,
      parent_email: registrationData.email,
      child_name: registrationData.firstName,
      child_age: 10 // Default for invitation registration
    });

    if (!sanitizedData.parent_email || !registrationData.password) {
      logger.error(LogSource.AUTH, 'Invalid registration data provided');
      return {
        success: false,
        error: 'Invalid registration data provided'
      };
    }

    // Validate invitation token
    const tokenValidation = await validateInvitationToken(
      registrationData.token, 
      registrationData.email
    );

    if (tokenValidation.error || !tokenValidation.data) {
      logger.error(LogSource.AUTH, 'Invalid invitation token', {
        error: tokenValidation.error
      });
      return {
        success: false,
        error: tokenValidation.error || 'Invalid or expired invitation token'
      };
    }

    const invitationData = tokenValidation.data;
    const invitation = invitationData.invitation;

    // Check if user already exists
    const existingUser = await findUserByEmail(registrationData.email);
    
    if (existingUser.data) {
      logger.info(LogSource.AUTH, 'Existing user found, upgrading to author role', {
        userId: existingUser.data.id,
        email: registrationData.email
      });

      // Existing user - upgrade to author role using RLS policy manager
      const upgradeResult = await upgradeExistingUserWithRLS(
        existingUser.data.id,
        registrationData.email,
        invitation
      );

      if (!upgradeResult.success) {
        return upgradeResult;
      }

      // Mark invitation as completed and invalidate token
      await Promise.all([
        markInvitationCompleted(invitation.id, existingUser.data.id),
        markTokenAsUsed(registrationData.token, existingUser.data.id)
      ]);

      return {
        success: true,
        user: upgradeResult.user,
        session: upgradeResult.session,
        redirectUrl: '/admin/dashboard'
      };
    } else {
      logger.info(LogSource.AUTH, 'Creating new author account with RLS policy management', {
        email: registrationData.email
      });

      // New user - create account with author role using RLS policy manager
      const creationResult = await createAuthorAccountWithRLS(
        registrationData,
        invitation
      );

      if (!creationResult.success) {
        return creationResult;
      }

      // Mark invitation as completed and invalidate token
      await Promise.all([
        markInvitationCompleted(invitation.id, creationResult.user?.id),
        markTokenAsUsed(registrationData.token, creationResult.user?.id)
      ]);

      return {
        success: true,
        user: creationResult.user,
        session: creationResult.session,
        redirectUrl: '/admin/dashboard'
      };
    }
  } catch (error: any) {
    logger.error(LogSource.AUTH, 'Exception in invitation registration process', error);
    
    // Log the error for monitoring
    await AuditLogService.logEvent({
      action: 'invitation_registration_exception',
      resource_type: 'invitation_registration',
      user_email: registrationData.email,
      success: false,
      error_message: error.message || 'Unknown error',
      metadata: {
        token_prefix: registrationData.token.substring(0, 16),
        error_name: error.name,
        error_stack: error.stack
      }
    });

    return {
      success: false,
      error: 'An unexpected error occurred during registration. Please try again.'
    };
  }
}

/**
 * Upgrade existing user to author role using RLS policy manager
 */
async function upgradeExistingUserWithRLS(
  userId: string,
  email: string,
  invitation: InvitationRequest
): Promise<AuthResult> {
  try {
    logger.info(LogSource.AUTH, 'Upgrading existing user with RLS policy management', {
      userId,
      email
    });

    // Create auth context for RLS operations
    const authContext: AuthContext = {
      userId,
      email,
      registrationType: 'invitation',
      bypassRLS: false // Try standard first
    };

    // Validate permissions for the upgrade
    const hasPermissions = await rlsPolicyManager.validateRegistrationPermissions(authContext);
    
    if (!hasPermissions) {
      logger.warn(LogSource.AUTH, 'Insufficient permissions for user upgrade, attempting RLS bypass');
      authContext.bypassRLS = true;
    }

    // Attempt to upgrade user role
    const upgradeResult = await grantAuthorRole(userId);
    
    if (!upgradeResult.success) {
      logger.error(LogSource.AUTH, 'Failed to upgrade user role', {
        error: upgradeResult.error,
        userId
      });

      // If standard upgrade failed, try with service role
      if (rlsPolicyManager.isServiceRoleAvailable()) {
        logger.info(LogSource.AUTH, 'Attempting role upgrade with service role');
        
        const serviceRoleResult = await rlsPolicyManager.bypassRLSForRegistration(
          async (client) => {
            const { data, error } = await client
              .from('profiles')
              .update({ 
                role: 'author',
                updated_at: new Date().toISOString()
              })
              .eq('id', userId)
              .select()
              .single();

            if (error) throw error;
            return data;
          }
        );

        if (!serviceRoleResult.success) {
          return {
            success: false,
            error: 'Failed to upgrade user permissions. Please contact support.'
          };
        }

        logger.info(LogSource.AUTH, 'User role upgraded successfully with service role');
      } else {
        return {
          success: false,
          error: upgradeResult.error || 'Failed to upgrade user permissions'
        };
      }
    }

    // Log successful upgrade
    await AuditLogService.logEvent({
      action: 'invitation_user_upgrade_success',
      resource_type: 'user_profile',
      resource_id: userId,
      user_email: email,
      success: true,
      metadata: {
        invitation_id: invitation.id,
        upgrade_method: upgradeResult.success ? 'standard' : 'service_role'
      }
    });

    // Get updated user profile
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return {
      success: true,
      user: updatedProfile,
      session: null // User needs to log in again
    };
  } catch (error: any) {
    logger.error(LogSource.AUTH, 'Exception upgrading existing user', error);
    
    await AuditLogService.logEvent({
      action: 'invitation_user_upgrade_failed',
      resource_type: 'user_profile',
      resource_id: userId,
      user_email: email,
      success: false,
      error_message: error.message,
      metadata: {
        invitation_id: invitation.id,
        error_name: error.name
      }
    });

    return {
      success: false,
      error: 'Failed to upgrade user account. Please try again.'
    };
  }
}

/**
 * Create new author account using RLS policy manager
 */
async function createAuthorAccountWithRLS(
  registrationData: InvitationRegistrationData,
  invitation: InvitationRequest
): Promise<AuthResult> {
  try {
    logger.info(LogSource.AUTH, 'Creating new author account with RLS policy management', {
      email: registrationData.email
    });

    // Create the auth user first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: registrationData.email,
      password: registrationData.password,
      options: {
        data: {
          display_name: `${registrationData.firstName} ${registrationData.lastName}`,
          username: generateUsernameFromEmail(registrationData.email)
        },
        emailRedirectTo: undefined // Disable email confirmation
      }
    });

    if (authError || !authData.user) {
      logger.error(LogSource.AUTH, 'Failed to create auth user', authError);
      return {
        success: false,
        error: authError?.message || 'Failed to create user account'
      };
    }

    const userId = authData.user.id;
    const username = generateUsernameFromEmail(registrationData.email);
    const displayName = `${registrationData.firstName} ${registrationData.lastName}`;

    // Create auth context for profile creation
    const authContext: AuthContext = {
      userId,
      email: registrationData.email,
      registrationType: 'invitation',
      bypassRLS: false // Try standard first
    };

    // Prepare profile data
    const profileData: ProfileCreationData = {
      id: userId,
      email: registrationData.email,
      username,
      display_name: displayName,
      role: 'author',
      bio: '',
      avatar_url: '',
      public_bio: null,
      crypto_wallet_address: null,
      badge_display_preferences: null,
      favorite_categories: []
    };

    // Create profile using RLS policy manager
    const profileResult = await rlsPolicyManager.createProfileWithPermissions(
      profileData,
      authContext
    );

    if (!profileResult.success) {
      logger.error(LogSource.AUTH, 'Failed to create user profile', {
        error: profileResult.error,
        userId,
        requiresServiceRole: profileResult.requiresServiceRole
      });

      // Clean up auth user if profile creation failed
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (cleanupError) {
        logger.warn(LogSource.AUTH, 'Failed to cleanup auth user after profile creation failure', cleanupError);
      }

      return {
        success: false,
        error: profileResult.error || 'Failed to create user profile'
      };
    }

    logger.info(LogSource.AUTH, 'Author account created successfully', {
      userId,
      email: registrationData.email,
      username
    });

    // Log successful account creation
    await AuditLogService.logEvent({
      action: 'invitation_author_account_created',
      resource_type: 'user_profile',
      resource_id: userId,
      user_email: registrationData.email,
      success: true,
      metadata: {
        invitation_id: invitation.id,
        username,
        display_name: displayName,
        creation_method: profileResult.requiresServiceRole ? 'service_role' : 'standard'
      }
    });

    return {
      success: true,
      user: profileResult.data,
      session: authData.session
    };
  } catch (error: any) {
    logger.error(LogSource.AUTH, 'Exception creating author account', error);
    
    await AuditLogService.logEvent({
      action: 'invitation_author_account_creation_failed',
      resource_type: 'user_profile',
      user_email: registrationData.email,
      success: false,
      error_message: error.message,
      metadata: {
        invitation_id: invitation.id,
        error_name: error.name,
        error_stack: error.stack
      }
    });

    return {
      success: false,
      error: 'Failed to create author account. Please try again.'
    };
  }
}

/**
 * Generate a username from email address
 */
function generateUsernameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  const cleanUsername = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  
  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${cleanUsername}${randomSuffix}`;
}

/**
 * Complete invitation process - activate account or create new user
 */
export async function completeInvitation(token: string, userData?: UserData): Promise<ServiceResponse> {
  try {
    // First validate the token
    const tokenValidation = await validateInvitationToken(token, userData?.email);
    if (tokenValidation.error || !tokenValidation.data) {
      return { error: tokenValidation.error || 'Invalid token' };
    }

    const invitationData = tokenValidation.data;
    const invitation = invitationData.invitation;

    // Check if user already exists
    const existingUser = await findUserByEmail(invitation.parent_email);
    
    if (existingUser.data) {
      // Existing user - activate account by upgrading to author role
      const activationResult = await activateExistingUserAccount(existingUser.data.id);
      
      if (!activationResult.success) {
        return { error: activationResult.error };
      }

      // Mark invitation as completed
      if (invitation.id) {
        await markInvitationCompleted(invitation.id, existingUser.data.id);
      }
      
      // Mark token as used
      await markTokenAsUsed(token, existingUser.data.id);

      return { 
        data: { 
          success: true, 
          type: 'existing_user', 
          user: activationResult.user,
          redirectTo: activationResult.redirectTo || getRedirectUrlForRole(activationResult.user?.role || 'reader')
        } 
      };
    } else {
      // New user - create account with author role
      if (!userData || !userData.password) {
        return { error: 'User data required for new account creation' };
      }

      const creationResult = await createAuthorAccount(
        invitation.parent_email,
        userData.password,
        userData.display_name || invitation.parent_name,
        userData.username
      );

      if (!creationResult.success) {
        return { error: creationResult.error };
      }

      // Mark invitation as completed
      if (invitation.id && creationResult.user) {
        await markInvitationCompleted(invitation.id, creationResult.user.id);
      }
      
      // Mark token as used
      await markTokenAsUsed(token, creationResult.user.id);

      return { 
        data: { 
          success: true, 
          type: 'new_user', 
          user: creationResult.user,
          redirectTo: creationResult.redirectTo || getRedirectUrlForRole(creationResult.user?.role || 'reader')
        } 
      };
    }
  } catch (error) {
    console.error('Exception completing invitation:', error);
    return { error };
  }
}

/**
 * Mark invitation as completed
 */
async function markInvitationCompleted(invitationId: string, userId: string): Promise<void> {
  if (!invitationId) {
    console.warn('Cannot mark invitation as completed: invitationId is required');
    return;
  }

  try {
    const { error } = await supabase
      .from('invitation_requests')
      .update({ 
        completed_at: new Date().toISOString(),
        child_user_id: userId
      })
      .eq('id', invitationId);

    if (error) {
      console.warn('Failed to mark invitation as completed:', error);
    }
  } catch (error) {
    console.warn('Exception marking invitation as completed:', error);
  }
}

/**
 * Mark token as used with enhanced error handling and RLS policy management
 */
async function markTokenAsUsed(token: string, userId?: string): Promise<ServiceResponse> {
  try {
    logger.info(LogSource.AUTH, 'Marking invitation token as used', {
      tokenPrefix: token.substring(0, 16),
      userId
    });
    
    // Hash the token for database lookup
    const encoder = new TextEncoder();
    const data = encoder.encode(token.trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Try standard update first
    let updateResult = await supabase
      .from('invitation_tokens')
      .update({ 
        used_at: new Date().toISOString(),
        used_by: userId || null
      })
      .eq('token_hash', tokenHash)
      .is('used_at', null) // Only update if not already used
      .select()
      .single();

    // If standard update failed due to RLS, try with service role
    if (updateResult.error && rlsPolicyManager.isServiceRoleAvailable()) {
      logger.warn(LogSource.AUTH, 'Standard token update failed, trying with service role', {
        error: updateResult.error.message
      });

      const serviceRoleResult = await rlsPolicyManager.bypassRLSForRegistration(
        async (client) => {
          const { data, error } = await client
            .from('invitation_tokens')
            .update({ 
              used_at: new Date().toISOString(),
              used_by: userId || null
            })
            .eq('token_hash', tokenHash)
            .is('used_at', null)
            .select()
            .single();

          if (error) throw error;
          return data;
        }
      );

      if (serviceRoleResult.success) {
        updateResult = { data: serviceRoleResult.data, error: null };
        logger.info(LogSource.AUTH, 'Token marked as used with service role');
      } else {
        updateResult.error = new Error(serviceRoleResult.error || 'Service role update failed');
      }
    }

    if (updateResult.error) {
      logger.error(LogSource.AUTH, 'Failed to mark token as used', updateResult.error);
      
      await AuditLogService.logEvent({
        action: 'token_mark_used_failed',
        resource_type: 'invitation_token',
        user_id: userId,
        success: false,
        error_message: updateResult.error.message || 'Failed to mark token as used',
        metadata: {
          token_prefix: token.substring(0, 16),
          error_code: updateResult.error.code
        }
      });

      return {
        error: updateResult.error.message || 'Failed to invalidate invitation token',
        code: 'TOKEN_INVALIDATION_FAILED',
        retryable: true
      };
    }

    logger.info(LogSource.AUTH, 'Token marked as used successfully');
    
    await AuditLogService.logEvent({
      action: 'token_mark_used_success',
      resource_type: 'invitation_token',
      user_id: userId,
      success: true,
      metadata: {
        token_prefix: token.substring(0, 16),
        token_id: updateResult.data?.id
      }
    });

    return { data: updateResult.data };
  } catch (error: any) {
    logger.error(LogSource.AUTH, 'Exception marking token as used', error);
    
    await AuditLogService.logEvent({
      action: 'token_mark_used_exception',
      resource_type: 'invitation_token',
      user_id: userId,
      success: false,
      error_message: error.message || 'Exception marking token as used',
      metadata: {
        token_prefix: token.substring(0, 16),
        error_name: error.name,
        error_stack: error.stack
      }
    });

    return {
      error: 'Failed to invalidate invitation token',
      code: 'TOKEN_INVALIDATION_EXCEPTION',
      retryable: true
    };
  }
}
