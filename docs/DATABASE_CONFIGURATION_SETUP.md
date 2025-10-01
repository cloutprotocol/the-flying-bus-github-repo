# Database Configuration Setup

## Overview

The invitation form fix requires proper database configuration parameters to be set for email functionality. This document explains how to complete the configuration setup.

## Current Status

✅ **Configuration table created**: `system_configuration` table is set up
✅ **Supabase URL configured**: Set to `https://xwxuwchndgxnnmfprzds.supabase.co`
⚠️ **Service role key**: Currently set to placeholder, needs to be updated

## Required Action: Update Service Role Key

The service role key is currently set to a placeholder and must be updated with the actual key from Supabase dashboard.

### Steps to Update Service Role Key

1. **Get the Service Role Key**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/project/xwxuwchndgxnnmfprzds)
   - Navigate to Settings > API
   - Copy the `service_role` key (starts with 'eyJ...')

2. **Update the Configuration**:
   ```sql
   -- Replace 'YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE' with the real key
   UPDATE system_configuration 
   SET value = 'YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE'
   WHERE key = 'app.service_role_key';
   ```

3. **Verify the Configuration**:
   ```sql
   SELECT validate_email_configuration();
   ```

### Using the Update Script

A helper script is available at `supabase/migrations/update_service_role_key.sql`:

1. Edit the script and replace the placeholder with the actual service role key
2. Run the script using Supabase CLI or dashboard

## Configuration Functions

The following functions are available for managing configuration:

### `get_config_setting(setting_name, default_value)`
Safely retrieves configuration values with fallback support.

```sql
SELECT get_config_setting('app.supabase_url');
SELECT get_config_setting('app.service_role_key');
```

### `validate_email_configuration()`
Validates that all required configuration is properly set.

```sql
SELECT validate_email_configuration();
```

Expected result when properly configured:
```json
{
  "supabase_url_configured": true,
  "service_key_configured": true,
  "supabase_url": "https://xwxuwchndgxnnmfprzds.supabase.co",
  "service_key_length": 180,
  "configuration_valid": true
}
```

## Security Considerations

- The `system_configuration` table has RLS enabled
- Only `service_role` can read/write configuration values
- Configuration functions are marked as `SECURITY DEFINER`
- Service role key is stored securely in the database

## Troubleshooting

### Configuration Not Found
If configuration values are not found, the functions will return default values and log errors gracefully.

### Permission Issues
Ensure the database user has proper permissions to access the `system_configuration` table.

### Validation Failures
Use `validate_email_configuration()` to check the current configuration status and identify missing parameters.

## Next Steps

After updating the service role key:

1. Verify configuration with `validate_email_configuration()`
2. Test email triggers by creating a test invitation request
3. Check email function logs for any remaining issues
4. Proceed with the remaining tasks in the invitation form fix specification