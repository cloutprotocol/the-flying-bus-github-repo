// Supabase removed; stubbing configuration validation for Convex-only stack

export interface ConfigurationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  details: {
    serviceRoleKey: {
      exists: boolean;
      format: boolean;
      permissions?: boolean;
    };
    edgeFunctions: {
      connectivity: boolean;
      authentication: boolean;
    };
    database: {
      connection: boolean;
      tables: boolean;
      functions: boolean;
    };
    environment: {
      requiredVars: boolean;
      supabaseConfig: boolean;
    };
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message: string;
      duration?: number;
    };
  };
}

class ConfigurationValidationService {
  private readonly REQUIRED_CONFIG_KEYS = [
    'supabase_service_role_key',
    'resend_api_key',
    'app_url'
  ];

  private readonly REQUIRED_ENV_VARS = [ 'VITE_CONVEX_URL' ];

  /**
   * Performs comprehensive startup validation of all required configuration
   */
  async validateStartupConfiguration(): Promise<ConfigurationValidationResult> {
    const result: ConfigurationValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      details: {
        serviceRoleKey: { exists: false, format: false },
        edgeFunctions: { connectivity: false, authentication: false },
        database: { connection: false, tables: false, functions: false },
        environment: { requiredVars: false, supabaseConfig: false }
      }
    };

    try {
      // Validate environment variables
      await this.validateEnvironmentVariables(result);
      
      // Validate database connection and configuration
      await this.validateDatabaseConfiguration(result);
      
      // Validate service role key
      await this.validateServiceRoleKey(result);
      
      // Validate Edge Function connectivity
      await this.validateEdgeFunctionConnectivity(result);
      
      // Validate required database objects
      await this.validateDatabaseObjects(result);

      // Set overall validity
      result.isValid = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Startup validation failed: ${error.message}`);
      result.isValid = false;
    }

    return result;
  }

  /**
   * Validates service role key format and permissions
   */
  async validateServiceRoleKey(result: ConfigurationValidationResult): Promise<void> {
    try {
      // Check if service role key exists in configuration
      // No service role keys in Convex client; mark as not applicable
      result.details.serviceRoleKey = { exists: false, format: false, permissions: undefined } as any;

    } catch (error) {
      result.errors.push(`Service role key validation failed: ${error.message}`);
    }
  }

  /**
   * Tests Edge Function connectivity and authentication
   */
  async validateEdgeFunctionConnectivity(result: ConfigurationValidationResult): Promise<void> {
    try {
      // No Edge Functions in Convex; mark as healthy
      result.details.edgeFunctions = { connectivity: true, authentication: true } as any;

    } catch (error) {
      result.errors.push(`Edge Function validation failed: ${error.message}`);
    }
  }

  /**
   * Implements configuration health check endpoint functionality
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Database connection check
    result.checks.database = await this.checkDatabaseHealth();
    
    // Configuration check
    result.checks.configuration = await this.checkConfigurationHealth();
    
    // Edge Functions check
    result.checks.edgeFunctions = await this.checkEdgeFunctionsHealth();
    
    // Email system check
    result.checks.emailSystem = await this.checkEmailSystemHealth();

    // Determine overall status
    const failedChecks = Object.values(result.checks).filter(check => check.status === 'fail');
    const warnChecks = Object.values(result.checks).filter(check => check.status === 'warn');

    if (failedChecks.length > 0) {
      result.status = 'unhealthy';
    } else if (warnChecks.length > 0) {
      result.status = 'degraded';
    }

    return result;
  }

  // Private helper methods

  private async validateEnvironmentVariables(result: ConfigurationValidationResult): Promise<void> {
    const missingVars = this.REQUIRED_ENV_VARS.filter(varName => !(import.meta as any).env[varName]);
    
    if (missingVars.length > 0) {
      result.errors.push(`Missing required environment variables: ${missingVars.join(', ')}`);
    } else {
      result.details.environment.requiredVars = true;
    }

    // No Supabase configuration required
    result.details.environment.supabaseConfig = true as any;
  }

  private async validateDatabaseConfiguration(result: ConfigurationValidationResult): Promise<void> {
    try {
      // Test basic database connection
      const { error } = await supabase.from('system_configuration').select('count').limit(1);
      
      if (error) {
        result.errors.push(`Database connection failed: ${error.message}`);
      } else {
        result.details.database.connection = true;
      }

    } catch (error) {
      result.errors.push(`Database validation failed: ${error.message}`);
    }
  }

  private isValidServiceRoleKeyFormat(key: string): boolean {
    // Supabase service role keys typically start with 'eyJ' (JWT format)
    // and have a specific length and format
    if (!key || typeof key !== 'string') return false;
    if (key.length < 100) return false; // Service role keys are quite long
    if (!key.startsWith('eyJ')) return false; // JWT format
    
    // Additional format validation could be added here
    return true;
  }

  private async testServiceRoleKeyPermissions(serviceRoleKey: string): Promise<boolean> {
    try {
      // Test if the service role key can perform required operations
      // This is a simplified test - in production you might want more comprehensive testing
      
      // Test 1: Can read from system_configuration table
      const { error: readError } = await supabase
        .from('system_configuration')
        .select('key')
        .limit(1);

      if (readError) return false;

      // Test 2: Can call RPC functions (if they exist)
      // This would be expanded based on your specific requirements
      
      return true;
    } catch (error) {
      console.error('Service role key permission test failed:', error);
      return false;
    }
  }

  private async testEdgeFunctionConnectivity(): Promise<boolean> {
    try {
      // Test basic connectivity to Edge Functions endpoint
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      });

      // Even a 404 or 401 indicates connectivity (vs network errors)
      return response.status < 500;
    } catch (error) {
      console.error('Edge Function connectivity test failed:', error);
      return false;
    }
  }

  private async testEdgeFunctionAuthentication(): Promise<boolean> {
    try {
      // Test authentication with a simple Edge Function call using Supabase SDK
      // This will test if the Edge Function is accessible and authentication works
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { test: true }
      });

      // Check if we get a proper response (not a network error)
      // Even if the function returns an error due to invalid test data, 
      // it means the function is accessible and authentication worked
      return !error || error.message !== 'Network request failed';
    } catch (error) {
      console.error('Edge Function authentication test failed:', error);
      return false;
    }
  }

  private async validateDatabaseObjects(result: ConfigurationValidationResult): Promise<void> {
    try {
      // Check for required tables
      const requiredTables = ['system_configuration', 'invitation_requests', 'email_events'];
      const tableChecks = await Promise.all(
        requiredTables.map(async (table) => {
          try {
            const { error } = await supabase.from(table).select('*').limit(1);
            return { table, exists: !error };
          } catch {
            return { table, exists: false };
          }
        })
      );

      const missingTables = tableChecks.filter(check => !check.exists).map(check => check.table);
      
      if (missingTables.length > 0) {
        result.errors.push(`Missing required tables: ${missingTables.join(', ')}`);
      } else {
        result.details.database.tables = true;
      }

      // Check for required functions (this would need to be expanded based on your schema)
      result.details.database.functions = true; // Placeholder - implement actual function checks

    } catch (error) {
      result.errors.push(`Database objects validation failed: ${error.message}`);
    }
  }

  // Health check helper methods

  private async checkDatabaseHealth(): Promise<{ status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('system_configuration').select('count').limit(1);
      const duration = Date.now() - start;
      
      if (error) {
        return { status: 'fail', message: `Database connection failed: ${error.message}`, duration };
      }
      
      return { status: 'pass', message: 'Database connection healthy', duration };
    } catch (error) {
      return { status: 'fail', message: `Database health check failed: ${error.message}`, duration: Date.now() - start };
    }
  }

  private async checkConfigurationHealth(): Promise<{ status: 'pass' | 'fail' | 'warn'; message: string }> {
    try {
      const { data, error } = await supabase
        .from('system_configuration')
        .select('key, value')
        .in('key', this.REQUIRED_CONFIG_KEYS);

      if (error) {
        return { status: 'fail', message: `Configuration check failed: ${error.message}` };
      }

      const foundKeys = data?.map(item => item.key) || [];
      const missingKeys = this.REQUIRED_CONFIG_KEYS.filter(key => !foundKeys.includes(key));

      if (missingKeys.length > 0) {
        return { status: 'fail', message: `Missing configuration keys: ${missingKeys.join(', ')}` };
      }

      return { status: 'pass', message: 'All required configuration present' };
    } catch (error) {
      return { status: 'fail', message: `Configuration health check failed: ${error.message}` };
    }
  }

  private async checkEdgeFunctionsHealth(): Promise<{ status: 'pass' | 'fail' | 'warn'; message: string }> {
    try {
      const connectivity = await this.testEdgeFunctionConnectivity();
      if (!connectivity) {
        return { status: 'fail', message: 'Edge Functions not accessible' };
      }

      const authentication = await this.testEdgeFunctionAuthentication();
      if (!authentication) {
        return { status: 'warn', message: 'Edge Function authentication issues detected' };
      }

      return { status: 'pass', message: 'Edge Functions healthy' };
    } catch (error) {
      return { status: 'fail', message: `Edge Functions health check failed: ${error.message}` };
    }
  }

  private async checkEmailSystemHealth(): Promise<{ status: 'pass' | 'fail' | 'warn'; message: string }> {
    try {
      // Check if email system tables exist and are accessible
      const { error: eventsError } = await supabase.from('email_events').select('count').limit(1);
      const { error: requestsError } = await supabase.from('invitation_requests').select('count').limit(1);

      if (eventsError || requestsError) {
        return { status: 'fail', message: 'Email system tables not accessible' };
      }

      // Check recent email activity (optional)
      const { data: recentEvents } = await supabase
        .from('email_events')
        .select('success')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      if (recentEvents && recentEvents.length > 0) {
        const successRate = recentEvents.filter(event => event.success).length / recentEvents.length;
        if (successRate < 0.8) {
          return { status: 'warn', message: `Email success rate low: ${Math.round(successRate * 100)}%` };
        }
      }

      return { status: 'pass', message: 'Email system healthy' };
    } catch (error) {
      return { status: 'fail', message: `Email system health check failed: ${error.message}` };
    }
  }
}

export const configurationValidationService = new ConfigurationValidationService();
