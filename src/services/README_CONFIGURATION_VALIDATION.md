# Configuration Validation System

This document describes the configuration validation and health check system implemented for the email notification system.

## Overview

The configuration validation system provides comprehensive validation of system configuration, database connectivity, Edge Function authentication, and overall system health. It's designed to catch configuration issues early and provide detailed diagnostics for troubleshooting.

## Components

### 1. ConfigurationValidationService

**Location**: `src/services/configurationValidationService.ts`

Main service class that provides:
- Startup configuration validation
- Service role key validation
- Edge Function connectivity testing
- Comprehensive health checks

**Key Methods**:
- `validateStartupConfiguration()` - Complete system validation
- `validateServiceRoleKey()` - Service role key format and permissions
- `validateEdgeFunctionConnectivity()` - Edge Function access testing
- `performHealthCheck()` - Real-time system health monitoring

### 2. Database Functions

**Location**: Migration `add_configuration_validation_functions`

Database-level validation functions:
- `validate_service_role_key_format(text)` - JWT format validation
- `get_validated_config(text)` - Safe configuration retrieval
- `validate_system_configuration()` - Complete config validation
- `test_edge_function_connectivity()` - Edge Function testing
- `system_health_check()` - Comprehensive health check
- `update_service_role_key_validated(text)` - Secure key updates

### 3. React Hooks

**Location**: `src/hooks/useStartupValidation.ts`

React hooks for UI integration:
- `useStartupValidation()` - Startup validation with state management
- `useHealthMonitoring()` - Continuous health monitoring

### 4. Configuration Utilities

**Location**: `src/utils/configurationUtils.ts`

Utility functions for configuration management:
- `ConfigurationUtils.performInitialSetup()` - System setup
- `ConfigurationUtils.setupServiceRoleKey()` - Service role key management
- `ConfigurationUtils.getSystemHealth()` - Health status retrieval
- `ConfigurationUtils.validateEnvironmentVariables()` - Environment validation

### 5. Admin UI Component

**Location**: `src/components/Admin/Settings/ConfigurationHealthCheck.tsx`

Admin interface component providing:
- Real-time health status display
- Configuration validation results
- Manual validation triggers
- Detailed error reporting

## Usage

### Startup Validation

```typescript
import { useStartupValidation } from '@/hooks/useStartupValidation';

function App() {
  const { isValidating, isValid, validationResult, error } = useStartupValidation();
  
  if (isValidating) return <div>Validating system...</div>;
  if (!isValid) return <div>Configuration error: {error}</div>;
  
  return <div>System ready!</div>;
}
```

### Health Monitoring

```typescript
import { useHealthMonitoring } from '@/hooks/useStartupValidation';

function HealthDashboard() {
  const { status, lastCheck, performHealthCheck } = useHealthMonitoring(60000);
  
  return (
    <div>
      <div>Status: {status}</div>
      <button onClick={performHealthCheck}>Refresh</button>
    </div>
  );
}
```

### Manual Configuration Setup

```typescript
import { ConfigurationUtils } from '@/utils/configurationUtils';

// Set up service role key
const result = await ConfigurationUtils.setupServiceRoleKey('eyJ...');
if (!result.success) {
  console.error('Setup failed:', result.message);
}

// Perform initial system setup
const setupResult = await ConfigurationUtils.performInitialSetup();
console.log('Setup result:', setupResult);
```

### Database-Level Validation

```sql
-- Check system health
SELECT * FROM system_health_check();

-- Validate configuration
SELECT * FROM validate_system_configuration();

-- Test Edge Function connectivity
SELECT * FROM test_edge_function_connectivity();

-- Update service role key safely
SELECT * FROM update_service_role_key_validated('new_key_here');
```

## Validation Checks

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Database Configuration
- `supabase_service_role_key` - Service role key for Edge Functions
- `resend_api_key` - Resend API key for email sending
- `app_url` - Application URL for email links

### Database Objects
- Required tables: `system_configuration`, `invitation_requests`, `email_events`
- Required functions: All email-related RPC functions
- Database connectivity and permissions

### Edge Functions
- Basic connectivity to Edge Functions endpoint
- Authentication with service role key
- Function availability and response

### Service Role Key Validation
- JWT format validation (starts with 'eyJ')
- Minimum length requirements (100+ characters)
- Three-part JWT structure validation
- Permission testing with actual API calls

## Health Check Statuses

### System Status
- **healthy** - All checks pass
- **degraded** - Some warnings but system functional
- **unhealthy** - Critical failures detected

### Individual Check Status
- **pass** - Check completed successfully
- **warn** - Check passed with warnings
- **fail** - Check failed

## Error Handling

The system provides detailed error information for troubleshooting:

1. **Configuration Errors** - Missing or invalid configuration values
2. **Database Errors** - Connection issues or missing objects
3. **Authentication Errors** - Invalid service role key or permissions
4. **Network Errors** - Edge Function connectivity issues

## Testing

### Unit Tests
Run configuration validation tests:
```bash
npm test src/services/__tests__/configurationValidation.test.ts
```

### Integration Testing
Run the configuration validation script:
```bash
node scripts/test-configuration-validation.js
```

### Manual Testing
Use the admin interface component to perform manual validation and health checks.

## Troubleshooting

### Common Issues

1. **Service Role Key Not Found**
   - Check `system_configuration` table
   - Ensure key is properly set during setup

2. **Edge Function Authentication Failed**
   - Verify service role key format
   - Check Edge Function deployment status
   - Validate Supabase project configuration

3. **Database Connection Issues**
   - Verify environment variables
   - Check Supabase project status
   - Validate network connectivity

4. **Missing Configuration**
   - Run initial setup process
   - Check required configuration keys
   - Verify database migrations applied

### Debug Steps

1. Run full validation: `ConfigurationUtils.performInitialSetup()`
2. Check individual components: Use specific validation methods
3. Review logs: Check browser console and Supabase logs
4. Test manually: Use admin interface for interactive testing

## Security Considerations

- Service role keys are marked as sensitive in configuration
- All configuration updates are audit logged
- Validation functions use security definer for controlled access
- Environment variables are validated but not logged

## Performance

- Health checks are cached and run periodically
- Validation is performed asynchronously
- Database functions are optimized for quick execution
- UI components use proper loading states

## Future Enhancements

- Automated alerting for health check failures
- Configuration backup and restore functionality
- Advanced Edge Function testing with specific endpoints
- Integration with monitoring systems
- Configuration drift detection