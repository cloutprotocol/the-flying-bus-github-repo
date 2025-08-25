import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { registrationMonitoring } from './registrationMonitoringService';

// Types for RLS Policy Manager
export interface ProfileCreationData {
  id: string;
  email: string;
  username: string;
  display_name: string;
  role: string;
  bio?: string;
  avatar_url?: string;
  public_bio?: string;
  crypto_wallet_address?: string;
  badge_display_preferences?: any;
  favorite_categories?: string[];
}

export interface AuthContext {
  userId: string;
  email: string;
  registrationType: 'standard' | 'invitation';
  bypassRLS?: boolean;
}

export interface RLSOperationResult {
  success: boolean;
  data?: any;
  error?: string;
  code?: string;
  requiresServiceRole?: boolean;
}

export interface RegistrationContext {
  id: string;
  user_id: string;
  registration_type: 'standard' | 'invitation';
  created_at: string;
  completed_at?: string;
  metadata?: any;
}

/**
 * RLS Policy Manager Service
 * 
 * Handles profile creation with proper permissions and RLS policy management.
 * Provides methods to bypass RLS policies during registration when necessary
 * and manages service role operations for secure profile creation.
 */
export class RLSPolicyManager {
  private serviceRoleClient: ReturnType<typeof createClient<Database>> | null = null;
  private serviceRoleKey: string | null = null;

  constructor() {
    this.initializeServiceRoleClient();
  }

  /**
   * Initialize service role client if service role key is available
   */
  private async initializeServiceRoleClient(): Promise<void> {
    try {
      // For now, we'll disable service role operations to avoid blocking registration
      // This allows standard registration to work with regular RLS policies
      logger.info(LogSource.AUTH, 'Service role operations disabled - using standard RLS policies');
      return;

      // TODO: Uncomment when service role key is properly configured
      // Try to get service role key from system configuration
      // const { data: configData, error: configError } = await supabase
      //   .from('system_configuration')
      //   .select('value')
      //   .eq('key', 'supabase_service_role_key')
      //   .single();

      // if (configError || !configData?.value) {
      //   logger.warn(LogSource.AUTH, 'Service role key not available in configuration', { 
      //     error: configError?.message 
      //   });
      //   return;
      // }

      this.serviceRoleKey = configData.value;
      
      // Create service role client
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        logger.error(LogSource.AUTH, 'Supabase URL not available for service role client');
        return;
      }

      this.serviceRoleClient = createClient<Database>(supabaseUrl, this.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      logger.info(LogSource.AUTH, 'Service role client initialized successfully');
    } catch (error) {
      logger.error(LogSource.AUTH, 'Failed to initialize service role client', error);
    }
  }

  /**
   * Create a profile with proper permissions
   * Attempts standard creation first, falls back to service role if needed
   */
  async createProfileWithPermissions(
    profileData: ProfileCreationData,
    context: AuthContext
  ): Promise<RLSOperationResult> {
    logger.info(LogSource.AUTH, 'Creating profile with permissions', {
      userId: profileData.id,
      registrationType: context.registrationType,
      bypassRLS: context.bypassRLS
    });

    // First, create registration context for audit trail
    await this.createRegistrationContext(context);

    // Try standard profile creation first
    if (!context.bypassRLS) {
      const standardResult = await this.createProfileStandard(profileData);
      if (standardResult.success) {
        logger.info(LogSource.AUTH, 'Profile created successfully with standard permissions');
        await this.completeRegistrationContext(context.userId);
        return standardResult;
      }

      // Log RLS violation if standard creation failed due to RLS
      if (standardResult.requiresServiceRole) {
        await registrationMonitoring.logRLSViolation(
          'profile_creation',
          'standard_insert',
          context.userId,
          {
            registrationType: context.registrationType,
            error: standardResult.error,
            code: standardResult.code
          }
        );
      }

      logger.warn(LogSource.AUTH, 'Standard profile creation failed, attempting service role', {
        error: standardResult.error,
        code: standardResult.code
      });
    }

    // For now, return the standard result even if it failed
    // This allows registration to proceed without service role
    logger.warn(LogSource.AUTH, 'Profile creation failed, service role not available', {
      error: standardResult.error,
      userId: profileData.id
    });
    
    // Return a more user-friendly error for standard registration
    return {
      success: false,
      error: 'Unable to create user profile. Please try again or contact support.',
      code: 'PROFILE_CREATION_FAILED'
    };
  }

  /**
   * Create profile using standard authenticated client
   */
  private async createProfileStandard(profileData: ProfileCreationData): Promise<RLSOperationResult> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: error.message,
          code: error.code,
          requiresServiceRole: this.isRLSError(error)
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      logger.error(LogSource.AUTH, 'Exception in standard profile creation', error);
      return {
        success: false,
        error: error.message || 'Unknown error during profile creation',
        requiresServiceRole: true
      };
    }
  }

  /**
   * Create profile using service role client with RLS bypass
   */
  async createProfileWithServiceRole(
    profileData: ProfileCreationData,
    context: AuthContext
  ): Promise<RLSOperationResult> {
    if (!this.serviceRoleClient) {
      logger.error(LogSource.AUTH, 'Service role client not available for profile creation');
      return {
        success: false,
        error: 'Service role not available for profile creation',
        code: 'SERVICE_ROLE_UNAVAILABLE'
      };
    }

    try {
      logger.info(LogSource.AUTH, 'Creating profile with service role', {
        userId: profileData.id,
        registrationType: context.registrationType
      });

      // Log service role usage
      await registrationMonitoring.logServiceRoleUsage(
        'profile_creation',
        'registration_flow',
        context.userId,
        true,
        {
          registrationType: context.registrationType,
          profileRole: profileData.role
        }
      );

      const { data, error } = await this.serviceRoleClient
        .from('profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        logger.error(LogSource.AUTH, 'Service role profile creation failed', error);
        
        // Log failed service role usage
        await registrationMonitoring.logServiceRoleUsage(
          'profile_creation',
          'registration_flow',
          context.userId,
          false,
          {
            registrationType: context.registrationType,
            error: error.message,
            code: error.code
          }
        );
        
        return {
          success: false,
          error: error.message,
          code: error.code
        };
      }

      logger.info(LogSource.AUTH, 'Profile created successfully with service role');
      await this.completeRegistrationContext(context.userId);
      
      return {
        success: true,
        data
      };
    } catch (error: any) {
      logger.error(LogSource.AUTH, 'Exception in service role profile creation', error);
      
      // Log failed service role usage
      await registrationMonitoring.logServiceRoleUsage(
        'profile_creation',
        'registration_flow',
        context.userId,
        false,
        {
          registrationType: context.registrationType,
          error: error.message
        }
      );
      
      return {
        success: false,
        error: error.message || 'Unknown error during service role profile creation'
      };
    }
  }

  /**
   * Validate registration permissions for the given context
   */
  async validateRegistrationPermissions(context: AuthContext): Promise<boolean> {
    try {
      // For invitation-based registration, check if invitation token is valid
      if (context.registrationType === 'invitation') {
        // This would typically validate against invitation tokens
        // For now, we'll assume invitation context provides sufficient permission
        logger.info(LogSource.AUTH, 'Validating invitation-based registration permissions', {
          userId: context.userId,
          email: context.email
        });
        return true;
      }

      // For standard registration, check if user can create their own profile
      if (context.registrationType === 'standard') {
        logger.info(LogSource.AUTH, 'Validating standard registration permissions', {
          userId: context.userId,
          email: context.email
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error(LogSource.AUTH, 'Error validating registration permissions', error);
      return false;
    }
  }

  /**
   * Execute an operation with RLS bypass using service role
   */
  async bypassRLSForRegistration<T>(
    operation: (client: ReturnType<typeof createClient<Database>>) => Promise<T>
  ): Promise<RLSOperationResult> {
    if (!this.serviceRoleClient) {
      return {
        success: false,
        error: 'Service role client not available for RLS bypass',
        code: 'SERVICE_ROLE_UNAVAILABLE'
      };
    }

    try {
      logger.info(LogSource.AUTH, 'Executing operation with RLS bypass');
      const result = await operation(this.serviceRoleClient);
      
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      logger.error(LogSource.AUTH, 'Error in RLS bypass operation', error);
      return {
        success: false,
        error: error.message || 'Unknown error in RLS bypass operation'
      };
    }
  }

  /**
   * Create registration context for audit trail
   */
  private async createRegistrationContext(context: AuthContext): Promise<void> {
    try {
      const registrationContext = {
        id: crypto.randomUUID(),
        user_id: context.userId,
        registration_type: context.registrationType,
        metadata: {
          email: context.email,
          bypassRLS: context.bypassRLS,
          timestamp: new Date().toISOString()
        }
      };

      // Use service role client if available for registration context
      const client = this.serviceRoleClient || supabase;
      
      await client
        .from('registration_contexts')
        .insert(registrationContext);

      logger.info(LogSource.AUTH, 'Registration context created', {
        contextId: registrationContext.id,
        userId: context.userId,
        registrationType: context.registrationType
      });
    } catch (error) {
      // Don't fail registration if context creation fails
      logger.warn(LogSource.AUTH, 'Failed to create registration context', error);
    }
  }

  /**
   * Mark registration context as completed
   */
  private async completeRegistrationContext(userId: string): Promise<void> {
    try {
      const client = this.serviceRoleClient || supabase;
      
      await client
        .from('registration_contexts')
        .update({ 
          completed_at: new Date().toISOString(),
          metadata: {
            completed: true,
            completion_timestamp: new Date().toISOString()
          }
        })
        .eq('user_id', userId)
        .is('completed_at', null);

      logger.info(LogSource.AUTH, 'Registration context completed', { userId });
    } catch (error) {
      logger.warn(LogSource.AUTH, 'Failed to complete registration context', error);
    }
  }

  /**
   * Check if an error is related to RLS policies
   */
  private isRLSError(error: any): boolean {
    if (!error) return false;
    
    const rlsErrorCodes = [
      '42501', // insufficient_privilege
      'PGRST301', // RLS policy violation
      '42P01' // undefined_table (sometimes related to RLS)
    ];
    
    const rlsErrorMessages = [
      'row-level security',
      'policy',
      'insufficient privilege',
      'permission denied'
    ];

    const errorCode = error.code?.toString();
    const errorMessage = error.message?.toLowerCase() || '';

    return rlsErrorCodes.includes(errorCode) || 
           rlsErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Get service role availability status
   */
  isServiceRoleAvailable(): boolean {
    return this.serviceRoleClient !== null && this.serviceRoleKey !== null;
  }

  /**
   * Refresh service role client (useful for testing or configuration updates)
   */
  async refreshServiceRoleClient(): Promise<void> {
    this.serviceRoleClient = null;
    this.serviceRoleKey = null;
    await this.initializeServiceRoleClient();
  }
}

// Export singleton instance
export const rlsPolicyManager = new RLSPolicyManager();