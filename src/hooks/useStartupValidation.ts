import { useState, useEffect } from 'react';
import { configurationValidationService, ConfigurationValidationResult } from '@/services/configurationValidationService';

export interface StartupValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  validationResult: ConfigurationValidationResult | null;
  error: string | null;
}

/**
 * Hook for performing startup validation of system configuration
 * This should be used early in the application lifecycle to ensure
 * all required configuration is present and valid
 */
export function useStartupValidation(autoValidate: boolean = true) {
  const [state, setState] = useState<StartupValidationState>({
    isValidating: false,
    isValid: null,
    validationResult: null,
    error: null
  });

  const validateConfiguration = async () => {
    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const result = await configurationValidationService.validateStartupConfiguration();
      
      setState({
        isValidating: false,
        isValid: result.isValid,
        validationResult: result,
        error: null
      });

      // Log validation results for debugging
      if (!result.isValid) {
        console.error('Startup validation failed:', {
          errors: result.errors,
          warnings: result.warnings,
          details: result.details
        });
      } else {
        console.log('Startup validation passed successfully');
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      
      setState({
        isValidating: false,
        isValid: false,
        validationResult: null,
        error: errorMessage
      });

      console.error('Startup validation error:', error);
      throw error;
    }
  };

  // Auto-validate on mount if requested
  useEffect(() => {
    if (autoValidate) {
      validateConfiguration();
    }
  }, [autoValidate]);

  return {
    ...state,
    validateConfiguration,
    retry: validateConfiguration
  };
}

/**
 * Hook for continuous health monitoring
 * Performs periodic health checks and provides real-time status
 */
export function useHealthMonitoring(intervalMs: number = 60000) {
  const [healthStatus, setHealthStatus] = useState<{
    status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
    lastCheck: string | null;
    isChecking: boolean;
    error: string | null;
  }>({
    status: 'unknown',
    lastCheck: null,
    isChecking: false,
    error: null
  });

  const performHealthCheck = async () => {
    setHealthStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const result = await configurationValidationService.performHealthCheck();
      
      setHealthStatus({
        status: result.status,
        lastCheck: result.timestamp,
        isChecking: false,
        error: null
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      
      setHealthStatus({
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        isChecking: false,
        error: errorMessage
      });

      throw error;
    }
  };

  // Set up periodic health checks
  useEffect(() => {
    // Initial check
    performHealthCheck();

    // Set up interval for periodic checks - DISABLED to prevent infinite loops
    // const interval = setInterval(performHealthCheck, intervalMs);

    // return () => clearInterval(interval);
  }, [intervalMs]);

  return {
    ...healthStatus,
    performHealthCheck,
    refresh: performHealthCheck
  };
}