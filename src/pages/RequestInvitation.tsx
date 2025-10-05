
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mail, User, Calendar, MessageCircle, Info } from 'lucide-react';
import { createInvitationRequest } from '@/services/invitationService';
import CaptchaChallenge from '@/components/Common/CaptchaChallenge';
import { AsyncOperationManager } from '@/utils/asyncOperationManager';
import { UserFeedback } from '@/components/Common/UserFeedback';
import { useUserFeedback } from '@/hooks/useUserFeedback';
import { UserFriendlyErrorGenerator } from '@/utils/userFriendlyErrors';
import { EnhancedUserFeedback, useEnhancedUserFeedback } from '@/components/Common/EnhancedUserFeedback';
import { detectRLSError, generateRLSErrorMessage, type RLSErrorContext } from '@/utils/errorHandling/rlsErrorHandler';
import { usePerformanceMonitoring, useRequestDeduplication } from '@/hooks/usePerformanceMonitoring';
import { useAuth } from '@/hooks/useAuth';

interface FormSubmissionState {
  isSubmitting: boolean;
  submissionId: string | null;
  timeoutId: NodeJS.Timeout | null;
  retryCount: number;
  startTime: number | null;
}

interface AuthenticationContext {
  isAuthenticated: boolean;
  user: any | null;
  role: 'anon' | 'authenticated' | 'service_role';
  canSubmitInvitation: boolean;
}

const RequestInvitation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMountedRef = useRef(true);
  const activeOperationRef = useRef<string | null>(null);
  
  // Authentication context
  const { currentUser, isLoggedIn, session, isLoading: authLoading, isInitialized } = useAuth();
  
  // Performance monitoring
  const {
    startFormSubmission,
    endFormSubmission,
    recordMemoryUsage
  } = usePerformanceMonitoring({
    component: 'RequestInvitation',
    enableMemoryMonitoring: true,
    enableAutoCleanup: true
  });
  
  const { executeWithDeduplication } = useRequestDeduplication();
  
  // Enhanced user feedback system
  const {
    feedback,
    showError,
    showSuccess,
    showLoading,
    updateProgress,
    updateRetryInfo,
    clearFeedback,
    retry,
    setRetryCallback
  } = useEnhancedUserFeedback();
  
  const [submissionState, setSubmissionState] = useState<FormSubmissionState>({
    isSubmitting: false,
    submissionId: null,
    timeoutId: null,
    retryCount: 0,
    startTime: null
  });
  
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    parentName: '',
    parentEmail: '',
    childName: '',
    childAge: '',
    message: ''
  });

  // Authentication context detection
  const getAuthenticationContext = (): AuthenticationContext => {
    const isAuthenticated = isLoggedIn && !!currentUser;
    const user = currentUser || session?.user || null;
    
    let role: 'anon' | 'authenticated' | 'service_role' = 'anon';
    if (isAuthenticated && currentUser) {
      role = 'authenticated';
    } else if (session?.user) {
      role = 'authenticated';
    }
    
    // Both authenticated and anonymous users can submit invitations
    const canSubmitInvitation = true;
    
    return {
      isAuthenticated,
      user,
      role,
      canSubmitInvitation
    };
  };

  const authContext = getAuthenticationContext();

  // Cleanup function for pending operations
  const cleanupPendingOperations = () => {
    console.log('[RequestInvitation] Cleaning up pending operations');
    
    // Cancel active async operation if exists
    if (activeOperationRef.current) {
      console.log(`[RequestInvitation] Cancelling active operation: ${activeOperationRef.current}`);
      AsyncOperationManager.cancelOperation(activeOperationRef.current);
      activeOperationRef.current = null;
    }
    
    // Clear timeout if exists
    if (submissionState.timeoutId) {
      console.log('[RequestInvitation] Clearing submission timeout');
      clearTimeout(submissionState.timeoutId);
    }
    
    // Reset submission state if component is still mounted
    if (isMountedRef.current) {
      setSubmissionState({
        isSubmitting: false,
        submissionId: null,
        timeoutId: null,
        retryCount: 0,
        startTime: null
      });
    }
  };

  // Component lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    console.log('[RequestInvitation] Component mounted, setting up cleanup');
    
    return () => {
      console.log('[RequestInvitation] Component unmounting, cleaning up operations');
      isMountedRef.current = false;
      cleanupPendingOperations();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get current authentication context
    const currentAuthContext = getAuthenticationContext();
    
    console.log(`[RequestInvitation] Form submission started with auth context`, {
      isAuthenticated: currentAuthContext.isAuthenticated,
      role: currentAuthContext.role,
      hasUser: !!currentAuthContext.user,
      canSubmitInvitation: currentAuthContext.canSubmitInvitation,
      userId: currentAuthContext.user?.id,
      userEmail: currentAuthContext.user?.email
    });
    
    // Check if user can submit invitations
    if (!currentAuthContext.canSubmitInvitation) {
      const authError = UserFriendlyErrorGenerator.generateFormSubmissionError(
        { message: 'You do not have permission to submit invitation requests', code: 'PERMISSION_DENIED' },
        { operation: 'form_submission', component: 'RequestInvitation', userAction: 'submit_form' }
      );
      
      showError(authError.message, {
        title: authError.title,
        details: authError.details,
        nextSteps: authError.nextSteps
      });
      
      return;
    }
    
    // Start performance monitoring for form submission
    const performanceTimerId = startFormSubmission('invitation-request', {
      formFields: Object.keys(formData).length,
      hasMessage: !!formData.message,
      messageLength: formData.message?.length || 0,
      captchaVerified: isCaptchaVerified,
      authContext: {
        isAuthenticated: currentAuthContext.isAuthenticated,
        role: currentAuthContext.role,
        hasUser: !!currentAuthContext.user
      }
    });
    
    // Record memory usage at start of submission
    recordMemoryUsage('form-submission-start');
    
    // Clear any existing feedback
    clearFeedback();
    
    // Generate unique submission ID for tracking
    const submissionId = `invitation_submit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`[RequestInvitation] Form submission started`, {
      submissionId,
      performanceTimerId,
      timestamp: new Date().toISOString(),
      formData: {
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        childName: formData.childName,
        childAge: formData.childAge,
        hasMessage: !!formData.message,
        messageLength: formData.message?.length || 0
      },
      isCaptchaVerified,
      captchaId
    });

    // Show loading feedback with progress
    showLoading('Submitting your invitation request...', {
      showProgress: true,
      progress: 10,
      estimatedTime: '30 seconds'
    });

    // Update submission state immediately
    setSubmissionState(prev => ({
      ...prev,
      isSubmitting: true,
      submissionId,
      startTime,
      retryCount: 0
    }));

    // Set up 30-second timeout mechanism
    const timeoutId = setTimeout(() => {
      console.error(`[RequestInvitation] Submission timeout after 30 seconds`, {
        submissionId,
        duration: Date.now() - startTime
      });
      
      if (isMountedRef.current) {
        toast({
          title: "Submission Timeout",
          description: "The request is taking longer than expected. Please try again.",
          variant: "destructive",
        });
        
        // Cancel the operation and reset state
        if (activeOperationRef.current) {
          AsyncOperationManager.cancelOperation(activeOperationRef.current);
          activeOperationRef.current = null;
        }
        
        setSubmissionState({
          isSubmitting: false,
          submissionId: null,
          timeoutId: null,
          retryCount: 0,
          startTime: null
        });
      }
    }, 30000);

    // Update state with timeout ID
    setSubmissionState(prev => ({
      ...prev,
      timeoutId
    }));

    try {
      // Validate CAPTCHA
      if (!isCaptchaVerified) {
        console.warn(`[RequestInvitation] CAPTCHA validation failed`, {
          submissionId,
          isCaptchaVerified,
          captchaId
        });
        
        const error = { message: 'CAPTCHA verification required', status: 400 };
        const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(error, {
          operation: 'form_submission',
          component: 'RequestInvitation',
          userAction: 'submit_form'
        });
        
        showError(userError.message, {
          title: userError.title,
          details: userError.details,
          nextSteps: userError.nextSteps
        });
        
        // End performance monitoring with failure
        endFormSubmission(performanceTimerId, 'failed', {
          errorType: 'captcha_validation',
          errorMessage: 'CAPTCHA verification required'
        });
        
        clearTimeout(timeoutId);
        setSubmissionState({
          isSubmitting: false,
          submissionId: null,
          timeoutId: null,
          retryCount: 0,
          startTime: null
        });
        return;
      }

      // Validate age
      const age = parseInt(formData.childAge);
      if (age < 8 || age > 14) {
        console.warn(`[RequestInvitation] Age validation failed`, {
          submissionId,
          childAge: formData.childAge,
          parsedAge: age
        });
        
        const error = { message: 'Invalid age range', status: 400 };
        const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(error, {
          operation: 'form_submission',
          component: 'RequestInvitation',
          userAction: 'submit_form'
        });
        
        showError('Child must be between 8-14 years old.', {
          title: 'Invalid Age',
          details: `Provided age: ${formData.childAge}`,
          nextSteps: [
            'Enter a valid age between 8 and 14',
            'Double-check the age is correct',
            'Contact support if you need assistance'
          ]
        });
        
        // End performance monitoring with failure
        endFormSubmission(performanceTimerId, 'failed', {
          errorType: 'age_validation',
          errorMessage: 'Invalid age range',
          providedAge: formData.childAge
        });
        
        clearTimeout(timeoutId);
        setSubmissionState({
          isSubmitting: false,
          submissionId: null,
          timeoutId: null,
          retryCount: 0,
          startTime: null
        });
        return;
      }

      console.log(`[RequestInvitation] Validation passed, starting async operation`, {
        submissionId,
        validatedAge: age
      });

      // Update progress - validation complete
      updateProgress(30, '25 seconds');

      // Prepare invitation data with authentication context
      const invitationData = {
        parent_name: formData.parentName,
        parent_email: formData.parentEmail,
        child_name: formData.childName,
        child_age: age,
        message: formData.message || null
      };

      // Log authentication context for debugging
      console.log(`[RequestInvitation] Submitting with authentication context`, {
        submissionId,
        authContext: {
          isAuthenticated: currentAuthContext.isAuthenticated,
          role: currentAuthContext.role,
          userId: currentAuthContext.user?.id,
          userEmail: currentAuthContext.user?.email,
          sessionExists: !!session
        },
        invitationData: {
          parent_email: invitationData.parent_email,
          child_name: invitationData.child_name,
          child_age: invitationData.child_age
        }
      });

      // Update progress - data prepared
      updateProgress(50, '20 seconds');

      // Set up retry handler for user feedback
      setRetryCallback(() => {
        console.log('[RequestInvitation] Retry handler called');
        handleSubmit(e);
      });

      // Use request deduplication and AsyncOperationManager for reliable submission
      const requestKey = `invitation-request-${formData.parentEmail}-${formData.childName}`;
      
      const operationResult = await executeWithDeduplication(
        requestKey,
        () => AsyncOperationManager.executeWithRetry(
          async (signal) => {
            console.log(`[RequestInvitation] Executing createInvitationRequest`, {
              submissionId,
              requestKey,
              attempt: submissionState.retryCount + 1,
              signal: signal?.aborted ? 'aborted' : 'active'
            });
            
            // Update progress - sending request
            updateProgress(70, '15 seconds');
            
            // Check if operation was cancelled
            if (signal?.aborted) {
              throw new Error('Operation was cancelled');
            }
            
            const result = await createInvitationRequest(invitationData);
            
            // Update progress - request sent
            updateProgress(90, '5 seconds');
            
            return result;
          },
        {
          timeout: 25000, // 25 seconds (less than our 30-second form timeout)
          maxRetries: 2,
          retryDelay: 1000,
          exponentialBackoff: true,
          operationId: submissionId,
          onProgress: (step, attempt) => {
            console.log(`[RequestInvitation] Progress update`, {
              submissionId,
              step,
              attempt,
              duration: Date.now() - startTime
            });
            
            if (isMountedRef.current && attempt) {
              setSubmissionState(prev => ({
                ...prev,
                retryCount: attempt - 1
              }));
            }
          },
          onError: (error, attempt, willRetry) => {
            console.error(`[RequestInvitation] Attempt ${attempt} failed`, {
              submissionId,
              error: error.message,
              willRetry,
              duration: Date.now() - startTime
            });
          },
          onSuccess: (result, attempt) => {
            console.log(`[RequestInvitation] Operation succeeded`, {
              submissionId,
              attempt,
              duration: Date.now() - startTime,
              hasData: !!result?.data,
              hasError: !!result?.error
            });
          }
        }
        ),
        30000 // 30 second deduplication window
      );

      // Store operation reference for cleanup
      activeOperationRef.current = submissionId;

      // Clear timeout since operation completed
      clearTimeout(timeoutId);

      console.log(`[RequestInvitation] AsyncOperation completed`, {
        submissionId,
        success: operationResult.success,
        attempts: operationResult.attempts,
        duration: operationResult.duration,
        timedOut: operationResult.timedOut,
        cancelled: operationResult.cancelled
      });

      // Handle operation results
      if (!operationResult.success) {
        const error = operationResult.error || {};

        if (operationResult.cancelled) {
          console.log(`[RequestInvitation] Operation was cancelled`, { submissionId });
          const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(
            { message: 'Operation cancelled', code: 'CANCELLED' },
            { operation: 'form_submission', component: 'RequestInvitation' }
          );
          showError(userError.message, {
            title: userError.title,
            details: userError.details,
            nextSteps: userError.nextSteps,
            showRetry: userError.retryable,
            retryLabel: userError.retryLabel
          });
        } else if (operationResult.timedOut) {
          console.error(`[RequestInvitation] Operation timed out`, { 
            submissionId, 
            attempts: operationResult.attempts 
          });
          const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(
            { message: 'Request timeout', code: 'TIMEOUT', timeout: 25 },
            { operation: 'form_submission', component: 'RequestInvitation' }
          );
          showError(userError.message, {
            title: userError.title,
            details: userError.details,
            nextSteps: userError.nextSteps,
            showRetry: userError.retryable,
            retryLabel: userError.retryLabel
          });
        } else if (error) {
          console.error(`[RequestInvitation] Operation failed with error`, {
            submissionId,
            error: error.message,
            attempts: operationResult.attempts,
            authContext: {
              isAuthenticated: currentAuthContext.isAuthenticated,
              role: currentAuthContext.role,
              userId: currentAuthContext.user?.id
            }
          });
          
          // Check for authentication-related errors
          const isAuthError = error.message?.toLowerCase().includes('auth') || 
                             error.message?.toLowerCase().includes('permission') ||
                             error.message?.toLowerCase().includes('unauthorized') ||
                             error.code === 'PGRST301' || // RLS policy violation
                             error.code === 'PGRST116'; // JWT expired
          
          let userError;
          if (isAuthError) {
            userError = UserFriendlyErrorGenerator.generateFormSubmissionError(
              { 
                message: 'Authentication issue detected during form submission', 
                code: 'AUTH_CONTEXT_ERROR',
                originalError: error.message 
              },
              { 
                operation: 'form_submission', 
                component: 'RequestInvitation', 
                userAction: 'submit_invitation_request',
                authContext: currentAuthContext
              }
            );
            
            // Add authentication-specific next steps
            userError.nextSteps = [
              ...(userError.nextSteps || []),
              'Try refreshing the page and submitting again',
              'If you are logged in, try logging out and submitting as an anonymous user',
              'Contact support if the issue persists'
            ];
          } else {
            userError = UserFriendlyErrorGenerator.generateFormSubmissionError(error, {
              operation: 'form_submission',
              component: 'RequestInvitation',
              userAction: 'submit_invitation_request'
            });
          }
          
          showError(userError.message, {
            title: userError.title,
            details: userError.details,
            nextSteps: userError.nextSteps,
            showRetry: userError.retryable,
            retryLabel: userError.retryLabel
          });
        }

        // Reset state
        setSubmissionState({
          isSubmitting: false,
          submissionId: null,
          timeoutId: null,
          retryCount: 0,
          startTime: null
        });
        
        activeOperationRef.current = null;
        return;
      }

      // Handle successful submission
      const result = operationResult.data;
      
      if (result?.error) {
        console.error(`[RequestInvitation] Service returned error`, {
          submissionId,
          error: result.error,
          code: result.code
        });
        
        const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(
          { message: result.error.message || result.error, code: result.code },
          { operation: 'form_submission', component: 'RequestInvitation' }
        );
        
        showError(userError.message, {
          title: userError.title,
          details: userError.details,
          nextSteps: userError.nextSteps,
          showRetry: userError.retryable,
          retryLabel: userError.retryLabel
        });
        
        setSubmissionState({
          isSubmitting: false,
          submissionId: null,
          timeoutId: null,
          retryCount: 0,
          startTime: null
        });
        
        activeOperationRef.current = null;
        return;
      }

      // Success!
      const finalDuration = Date.now() - startTime;
      console.log(`[RequestInvitation] Submission successful`, {
        submissionId,
        duration: finalDuration,
        invitationId: result?.data?.id,
        emailSent: result?.details?.emailSent
      });

      // End performance monitoring with success
      endFormSubmission(performanceTimerId, 'completed', {
        invitationId: result?.data?.id,
        emailSent: result?.details?.emailSent,
        totalDuration: finalDuration
      });

      // Record memory usage at success
      recordMemoryUsage('form-submission-success');

      // Update progress to complete
      updateProgress(100, 'Complete');

      // Generate success message with next steps
      const successMessage = UserFriendlyErrorGenerator.generateSuccessMessage('form_submission', {
        operation: 'invitation_request',
        component: 'RequestInvitation'
      });

      let customNextSteps = [...successMessage.nextSteps];
      
      if (result?.details?.emailSent === false) {
        customNextSteps.unshift('Note: Confirmation email delivery failed, but your request was saved successfully');
      }

      showSuccess(successMessage.message, {
        title: successMessage.title,
        nextSteps: customNextSteps
      });

      // Reset form and redirect
      setFormData({
        parentName: '',
        parentEmail: '',
        childName: '',
        childAge: '',
        message: ''
      });
      setIsCaptchaVerified(false);
      setCaptchaId(null);

      // Reset submission state
      setSubmissionState({
        isSubmitting: false,
        submissionId: null,
        timeoutId: null,
        retryCount: 0,
        startTime: null
      });
      
      activeOperationRef.current = null;

      // Redirect after 2 seconds
      setTimeout(() => {
        if (isMountedRef.current) {
          navigate('/');
        }
      }, 2000);

    } catch (error) {
      console.error(`[RequestInvitation] Unexpected error in handleSubmit`, {
        submissionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
        authContext: {
          isAuthenticated: currentAuthContext.isAuthenticated,
          role: currentAuthContext.role,
          userId: currentAuthContext.user?.id,
          sessionExists: !!session
        }
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // End performance monitoring with failure
      endFormSubmission(performanceTimerId, 'failed', {
        errorType: 'unexpected_error',
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        totalDuration: Date.now() - startTime
      });
      
      // Record memory usage at error
      recordMemoryUsage('form-submission-error');
      
      // Generate user-friendly error message with authentication context
      const isAuthRelatedError = error instanceof Error && (
        error.message?.toLowerCase().includes('auth') ||
        error.message?.toLowerCase().includes('permission') ||
        error.message?.toLowerCase().includes('unauthorized') ||
        error.message?.toLowerCase().includes('rls') ||
        error.message?.toLowerCase().includes('policy')
      );
      
      const userError = UserFriendlyErrorGenerator.generateFormSubmissionError(
        error instanceof Error ? error : { message: String(error) },
        { 
          operation: 'form_submission', 
          component: 'RequestInvitation',
          authContext: currentAuthContext,
          isAuthRelated: isAuthRelatedError
        }
      );
      
      // Add authentication-specific guidance for auth-related errors
      if (isAuthRelatedError) {
        userError.nextSteps = [
          ...(userError.nextSteps || []),
          'This may be an authentication-related issue',
          'Try refreshing the page and submitting again',
          'If you are logged in, consider logging out and submitting anonymously',
          'Contact support if the problem persists'
        ];
      }
      
      showError(userError.message, {
        title: userError.title,
        details: userError.details,
        nextSteps: userError.nextSteps,
        showRetry: userError.retryable,
        retryLabel: userError.retryLabel
      });
      
      // Reset state
      setSubmissionState({
        isSubmitting: false,
        submissionId: null,
        timeoutId: null,
        retryCount: 0,
        startTime: null
      });
      
      activeOperationRef.current = null;
    }
  };

  // Show loading state while authentication is initializing
  if (!isInitialized && authLoading) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
              </div>
              <p className="text-gray-600 mt-4">Initializing...</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
              Request Invitation
            </CardTitle>
            <p className="text-gray-600">
              Get your child started as a young journalist on The Flying Bus
            </p>
          </CardHeader>
          
          <CardContent>
            {/* Authentication Status Indicator */}
            {isInitialized && (
              <div className={`mb-6 p-4 rounded-lg border ${
                authContext.isAuthenticated 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {authContext.isAuthenticated 
                      ? `Submitting as: ${currentUser?.display_name || currentUser?.email || 'Authenticated User'}`
                      : 'Submitting as: Anonymous User'
                    }
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {authContext.isAuthenticated 
                    ? 'You are logged in. This invitation request will be associated with your account.'
                    : 'You are not logged in. This invitation request will be submitted anonymously.'
                  }
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="parentName">Parent/Guardian Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="parentName"
                    name="parentName"
                    type="text"
                    placeholder="Your full name"
                    className="pl-10"
                    value={formData.parentName}
                    onChange={handleInputChange}
                    disabled={submissionState.isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentEmail">Parent/Guardian Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="parentEmail"
                    name="parentEmail"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    value={formData.parentEmail}
                    onChange={handleInputChange}
                    disabled={submissionState.isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="childName">Child's Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="childName"
                    name="childName"
                    type="text"
                    placeholder="Child's full name"
                    className="pl-10"
                    value={formData.childName}
                    onChange={handleInputChange}
                    disabled={submissionState.isSubmitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="childAge">Child's Age *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <Input
                    id="childAge"
                    name="childAge"
                    type="number"
                    min="8"
                    max="14"
                    placeholder="Age (8-14)"
                    className="pl-10"
                    value={formData.childAge}
                    onChange={handleInputChange}
                    disabled={submissionState.isSubmitting}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Children must be between 8-14 years old to participate.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Additional Message (Optional)</Label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3 text-gray-500 h-4 w-4" />
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us why your child is interested in journalism or any other information you'd like to share..."
                    className="pl-10 min-h-[100px]"
                    value={formData.message}
                    onChange={handleInputChange}
                    disabled={submissionState.isSubmitting}
                  />
                </div>
              </div>

              <CaptchaChallenge
                onVerified={setIsCaptchaVerified}
                onChallengeGenerated={setCaptchaId}
                className="border-t pt-6"
                required={true}
              />

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• We'll review your request within 2-3 business days</li>
                  <li>• If approved, you'll receive an email with signup instructions</li>
                  <li>• Your child will be able to start writing and submitting articles</li>
                  <li>• All content is moderated to ensure safety and quality</li>
                </ul>
              </div>

              {/* User Feedback Component */}
              {feedback && (
                <UserFeedback
                  type={feedback.type}
                  title={feedback.title}
                  message={feedback.message}
                  details={feedback.details}
                  showRetry={feedback.showRetry}
                  onRetry={retry}
                  retryLabel={feedback.retryLabel}
                  showProgress={feedback.showProgress}
                  progress={feedback.progress}
                  estimatedTime={feedback.estimatedTime}
                  nextSteps={feedback.nextSteps}
                  className="mb-4"
                />
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submissionState.isSubmitting || !isCaptchaVerified || !authContext.canSubmitInvitation}
                size="lg"
              >
                {submissionState.isSubmitting 
                  ? `Submitting Request...${submissionState.retryCount > 0 ? ` (Attempt ${submissionState.retryCount + 1})` : ''}`
                  : authContext.isAuthenticated 
                    ? 'Submit Invitation Request (Authenticated)'
                    : 'Submit Invitation Request (Anonymous)'
                }
              </Button>
              
              {submissionState.isSubmitting && !feedback && (
                <div className="text-sm text-gray-600 text-center mt-2">
                  <p>Processing your request... This may take up to 30 seconds.</p>
                  {submissionState.submissionId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Submission ID: {submissionState.submissionId}
                    </p>
                  )}
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default RequestInvitation;
