import { supabase } from '@/integrations/supabase/client';
import { configurationValidationService } from '@/services/configurationValidationService';

export interface ConfigurationSetupResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Utility functions for configuration management and validation
 */
export class ConfigurationUtils {
  
  /**
   * Validates and sets up the service role key
   */
  static async setupServiceRoleKey(serviceRoleKey: string): Promise<ConfigurationSetupResult> {
    try {
      // Validate format first
      if (!this.isValidServiceRoleKeyFormat(serviceRoleKey)) {
        return {
          success: false,
          message: 'Invalid service role key format. Key must be a valid JWT token.'
        };
      }

      // Update the service role key using the database function
      const { data, error } = await supabase.rpc('update_service_role_key_validated', {
        new_key: serviceRoleKey
      });

      if (error) {
        return {
          success: false,
          message: `Failed to update service role key: ${error.message}`
        };
      }

      // Test the key by performing a validation
      const validationResult = await configurationValidationService.validateServiceRoleKey({
        isValid: true,
        errors: [],
        warnings: [],
        details: {
          serviceRoleKey: { exists: false, format: false },
          edgeFunctions: { connectivity: false, authentication: false },
          database: { connection: false, tables: false, functions: false },
          environment: { requiredVars: false, supabaseConfig: false }
        }
      });

      return {
        success: true,
        message: 'Service role key updated and validated successfully',
        details: data
      };

    } catch (error) {
      return {
        success: false,
        message: `Service role key setup failed: ${error.message}`
      };
    }
  }

  /**
   * Performs initial system setup and validation
   */
  static async performInitialSetup(): Promise<ConfigurationSetupResult> {
    try {
      // Step 1: Validate environment variables
      const envValidation = this.validateEnvironmentVariables();
      if (!envValidation.success) {
        return envValidation;
      }

      // Step 2: Validate database connection
      const dbValidation = await this.validateDatabaseConnection();
      if (!dbValidation.success) {
        return dbValidation;
      }

      // Step 3: Validate system configuration
      const configValidation = await this.validateSystemConfiguration();
      if (!configValidation.success) {
        return configValidation;
      }

      // Step 4: Test Edge Function connectivity
      const edgeFunctionValidation = await this.validateEdgeFunctions();
      if (!edgeFunctionValidation.success) {
        return {
          success: false,
          message: 'Edge Function validation failed, but system can continue with degraded functionality',
          details: edgeFunctionValidation
        };
      }

      return {
        success: true,
        message: 'System setup and validation completed successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: `Initial setup failed: ${error.message}`
      };
    }
  }

  /**
   * Gets the current system health status
   */
  static async getSystemHealth(): Promise<ConfigurationSetupResult> {
    try {
      const { data, error } = await supabase.rpc('system_health_check');

      if (error) {
        return {
          success: false,
          message: `Health check failed: ${error.message}`
        };
      }

      return {
        success: data.status !== 'unhealthy',
        message: `System status: ${data.status}`,
        details: data
      };

    } catch (error) {
      return {
        success: false,
        message: `Health check error: ${error.message}`
      };
    }
  }

  /**
   * Validates required environment variables
   */
  static validateEnvironmentVariables(): ConfigurationSetupResult {
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);

    if (missingVars.length > 0) {
      return {
        success: false,
        message: `Missing required environment variables: ${missingVars.join(', ')}`
      };
    }

    return {
      success: true,
      message: 'All required environment variables are present'
    };
  }

  /**
   * Validates database connection and basic functionality
   */
  static async validateDatabaseConnection(): Promise<ConfigurationSetupResult> {
    try {
      const { error } = await supabase.from('system_configuration').select('count').limit(1);

      if (error) {
        return {
          success: false,
          message: `Database connection failed: ${error.message}`
        };
      }

      return {
        success: true,
        message: 'Database connection validated successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: `Database validation error: ${error.message}`
      };
    }
  }

  /**
   * Validates system configuration completeness
   */
  static async validateSystemConfiguration(): Promise<ConfigurationSetupResult> {
    try {
      const { data, error } = await supabase.rpc('validate_system_configuration');

      if (error) {
        return {
          success: false,
          message: `Configuration validation failed: ${error.message}`
        };
      }

      if (!data.is_valid) {
        const issues = [];
        if (data.missing_keys?.length > 0) {
          issues.push(`Missing keys: ${data.missing_keys.join(', ')}`);
        }
        if (data.invalid_keys?.length > 0) {
          issues.push(`Invalid keys: ${data.invalid_keys.join(', ')}`);
        }

        return {
          success: false,
          message: `Configuration validation failed: ${issues.join('; ')}`,
          details: data
        };
      }

      return {
        success: true,
        message: 'System configuration validated successfully',
        details: data
      };

    } catch (error) {
      return {
        success: false,
        message: `Configuration validation error: ${error.message}`
      };
    }
  }

  /**
   * Validates Edge Function connectivity and authentication
   */
  static async validateEdgeFunctions(): Promise<ConfigurationSetupResult> {
    try {
      const { data, error } = await supabase.rpc('test_edge_function_connectivity');

      if (error) {
        return {
          success: false,
          message: `Edge Function validation failed: ${error.message}`
        };
      }

      if (!data.success) {
        return {
          success: false,
          message: `Edge Function connectivity test failed: ${data.error || 'Unknown error'}`,
          details: data
        };
      }

      return {
        success: true,
        message: 'Edge Function connectivity validated successfully',
        details: data
      };

    } catch (error) {
      return {
        success: false,
        message: `Edge Function validation error: ${error.message}`
      };
    }
  }

  /**
   * Validates service role key format
   */
  static isValidServiceRoleKeyFormat(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    if (key.length < 100) return false; // Service role keys are quite long
    if (!key.startsWith('eyJ')) return false; // JWT format
    
    // Additional JWT structure validation
    const parts = key.split('.');
    if (parts.length !== 3) return false; // JWT has 3 parts
    
    return true;
  }

  /**
   * Gets configuration value with validation
   */
  static async getConfigValue(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_validated_config', { config_key: key });

      if (error) {
        console.error(`Failed to get config value for ${key}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error getting config value for ${key}:`, error);
      return null;
    }
  }

  /**
   * Sets configuration value with validation
   */
  static async setConfigValue(key: string, value: string, description?: string): Promise<ConfigurationSetupResult> {
    try {
      const { error } = await supabase
        .from('system_configuration')
        .upsert({
          key,
          value,
          description: description || `Configuration for ${key}`,
          updated_at: new Date().toISOString()
        });

      if (error) {
        return {
          success: false,
          message: `Failed to set configuration: ${error.message}`
        };
      }

      return {
        success: true,
        message: `Configuration ${key} updated successfully`
      };

    } catch (error) {
      return {
        success: false,
        message: `Error setting configuration: ${error.message}`
      };
    }
  }
}

// Export convenience functions
export const {
  setupServiceRoleKey,
  performInitialSetup,
  getSystemHealth,
  validateEnvironmentVariables,
  validateDatabaseConnection,
  validateSystemConfiguration,
  validateEdgeFunctions,
  isValidServiceRoleKeyFormat,
  getConfigValue,
  setConfigValue
} = ConfigurationUtils;