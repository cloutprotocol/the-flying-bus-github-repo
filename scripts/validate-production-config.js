#!/usr/bin/env node

/**
 * Production Configuration Validation Script
 * This script validates that all required configuration is in place for production deployment
 */

import fs from 'fs';
import path from 'path';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Validation functions
function validateEnvironmentVariables() {
  logInfo('Validating environment variables...');
  
  const requiredVars = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'RESEND_FROM_NAME'
  ];
  
  const optionalVars = [
    'EMAIL_RATE_LIMIT_PER_HOUR',
    'EMAIL_RATE_LIMIT_PER_DAY',
    'TOKEN_EXPIRATION_HOURS',
    'MAX_RETRY_ATTEMPTS',
    'ENABLE_AUDIT_LOGGING',
    'ENABLE_RATE_LIMITING',
    'ENABLE_METRICS',
    'LOG_LEVEL',
    'ALERT_EMAIL'
  ];
  
  let allValid = true;
  
  // Check required variables
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set`);
    } else {
      logError(`${varName} is required but not set`);
      allValid = false;
    }
  }
  
  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      logSuccess(`${varName} is set: ${process.env[varName]}`);
    } else {
      logWarning(`${varName} is not set (using default)`);
    }
  }
  
  // Validate email format
  if (process.env.RESEND_FROM_EMAIL) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(process.env.RESEND_FROM_EMAIL)) {
      logSuccess('RESEND_FROM_EMAIL format is valid');
    } else {
      logError('RESEND_FROM_EMAIL format is invalid');
      allValid = false;
    }
  }
  
  // Validate API key format (Resend keys start with 're_')
  if (process.env.RESEND_API_KEY) {
    if (process.env.RESEND_API_KEY.startsWith('re_')) {
      logSuccess('RESEND_API_KEY format appears valid');
    } else {
      logWarning('RESEND_API_KEY format may be invalid (should start with "re_")');
    }
  }
  
  return allValid;
}

function validateFileStructure() {
  logInfo('Validating file structure...');
  
  const requiredFiles = [
    'supabase/functions/send-email/index.ts',
    'supabase/functions/invitation-tokens/index.ts',
    'supabase/functions/_shared/cors.ts',
    'supabase/migrations/20250817000001_production_email_system_setup.sql',
    'scripts/deploy-production.sh',
    'scripts/health-check.js',
    'scripts/setup-monitoring.sql',
    'docs/RESEND_DOMAIN_SETUP.md',
    'docs/PRODUCTION_DEPLOYMENT_CHECKLIST.md'
  ];
  
  let allValid = true;
  
  for (const filePath of requiredFiles) {
    if (fs.existsSync(filePath)) {
      logSuccess(`${filePath} exists`);
    } else {
      logError(`${filePath} is missing`);
      allValid = false;
    }
  }
  
  return allValid;
}

function validateSupabaseConfig() {
  logInfo('Validating Supabase configuration...');
  
  let allValid = true;
  
  // Check supabase config.toml
  const configPath = 'supabase/config.toml';
  if (fs.existsSync(configPath)) {
    logSuccess('supabase/config.toml exists');
    
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      if (configContent.includes('project_id')) {
        logSuccess('project_id is configured in config.toml');
      } else {
        logError('project_id is missing from config.toml');
        allValid = false;
      }
    } catch (error) {
      logError(`Error reading config.toml: ${error.message}`);
      allValid = false;
    }
  } else {
    logError('supabase/config.toml is missing');
    allValid = false;
  }
  
  // Check for .env file with Supabase credentials
  if (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) {
    logSuccess('Supabase URL is configured');
  } else {
    logError('SUPABASE_URL is not configured');
    allValid = false;
  }
  
  if (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) {
    logSuccess('Supabase anon key is configured');
  } else {
    logError('SUPABASE_ANON_KEY is not configured');
    allValid = false;
  }
  
  return allValid;
}

function validateEdgeFunctions() {
  logInfo('Validating Edge Functions...');
  
  let allValid = true;
  
  // Check send-email function
  const sendEmailPath = 'supabase/functions/send-email/index.ts';
  if (fs.existsSync(sendEmailPath)) {
    try {
      const content = fs.readFileSync(sendEmailPath, 'utf8');
      
      if (content.includes('RESEND_API_KEY')) {
        logSuccess('send-email function references RESEND_API_KEY');
      } else {
        logError('send-email function missing RESEND_API_KEY reference');
        allValid = false;
      }
      
      if (content.includes('corsHeaders')) {
        logSuccess('send-email function includes CORS headers');
      } else {
        logWarning('send-email function may be missing CORS headers');
      }
    } catch (error) {
      logError(`Error reading send-email function: ${error.message}`);
      allValid = false;
    }
  }
  
  // Check invitation-tokens function
  const tokensPath = 'supabase/functions/invitation-tokens/index.ts';
  if (fs.existsSync(tokensPath)) {
    try {
      const content = fs.readFileSync(tokensPath, 'utf8');
      
      if (content.includes('crypto.getRandomValues')) {
        logSuccess('invitation-tokens function uses secure random generation');
      } else {
        logError('invitation-tokens function missing secure random generation');
        allValid = false;
      }
      
      if (content.includes('SHA-256')) {
        logSuccess('invitation-tokens function uses SHA-256 hashing');
      } else {
        logError('invitation-tokens function missing SHA-256 hashing');
        allValid = false;
      }
    } catch (error) {
      logError(`Error reading invitation-tokens function: ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

function validateDatabaseMigrations() {
  logInfo('Validating database migrations...');
  
  let allValid = true;
  
  const migrationPath = 'supabase/migrations/20250817000001_production_email_system_setup.sql';
  if (fs.existsSync(migrationPath)) {
    try {
      const content = fs.readFileSync(migrationPath, 'utf8');
      
      const requiredElements = [
        'CREATE TABLE IF NOT EXISTS audit_logs',
        'CREATE TABLE IF NOT EXISTS email_metrics',
        'CREATE TABLE IF NOT EXISTS rate_limits',
        'ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY',
        'CREATE POLICY',
        'CREATE OR REPLACE FUNCTION cleanup_expired_invitation_tokens',
        'CREATE OR REPLACE FUNCTION get_email_system_health'
      ];
      
      for (const element of requiredElements) {
        if (content.includes(element)) {
          logSuccess(`Migration includes: ${element}`);
        } else {
          logError(`Migration missing: ${element}`);
          allValid = false;
        }
      }
    } catch (error) {
      logError(`Error reading migration file: ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

function validateScripts() {
  logInfo('Validating deployment scripts...');
  
  let allValid = true;
  
  // Check deployment script
  const deployScript = 'scripts/deploy-production.sh';
  if (fs.existsSync(deployScript)) {
    try {
      const stats = fs.statSync(deployScript);
      if (stats.mode & parseInt('111', 8)) {
        logSuccess('deploy-production.sh is executable');
      } else {
        logError('deploy-production.sh is not executable');
        allValid = false;
      }
    } catch (error) {
      logError(`Error checking deploy script: ${error.message}`);
      allValid = false;
    }
  }
  
  // Check health check script
  const healthScript = 'scripts/health-check.js';
  if (fs.existsSync(healthScript)) {
    try {
      const stats = fs.statSync(healthScript);
      if (stats.mode & parseInt('111', 8)) {
        logSuccess('health-check.js is executable');
      } else {
        logError('health-check.js is not executable');
        allValid = false;
      }
    } catch (error) {
      logError(`Error checking health script: ${error.message}`);
      allValid = false;
    }
  }
  
  return allValid;
}

function validatePackageJson() {
  logInfo('Validating package.json scripts...');
  
  let allValid = true;
  
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredScripts = [
      'deploy:production',
      'health-check',
      'setup:monitoring'
    ];
    
    for (const script of requiredScripts) {
      if (packageJson.scripts && packageJson.scripts[script]) {
        logSuccess(`package.json includes script: ${script}`);
      } else {
        logError(`package.json missing script: ${script}`);
        allValid = false;
      }
    }
  } catch (error) {
    logError(`Error reading package.json: ${error.message}`);
    allValid = false;
  }
  
  return allValid;
}

// Main validation function
async function validateProductionConfig() {
  log('\n🔍 Production Configuration Validation', colors.cyan);
  log('=' .repeat(50), colors.cyan);
  log('');
  
  const validations = [
    { name: 'Environment Variables', fn: validateEnvironmentVariables },
    { name: 'File Structure', fn: validateFileStructure },
    { name: 'Supabase Configuration', fn: validateSupabaseConfig },
    { name: 'Edge Functions', fn: validateEdgeFunctions },
    { name: 'Database Migrations', fn: validateDatabaseMigrations },
    { name: 'Deployment Scripts', fn: validateScripts },
    { name: 'Package.json Scripts', fn: validatePackageJson }
  ];
  
  const results = [];
  
  for (const validation of validations) {
    try {
      const result = validation.fn();
      results.push({ name: validation.name, success: result });
    } catch (error) {
      logError(`${validation.name} validation failed: ${error.message}`);
      results.push({ name: validation.name, success: false, error: error.message });
    }
    log(''); // Add spacing between validations
  }
  
  // Summary
  log('📊 Validation Summary', colors.cyan);
  log('=' .repeat(30), colors.cyan);
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  results.forEach(result => {
    if (result.success) {
      logSuccess(result.name);
    } else {
      logError(`${result.name}${result.error ? ` - ${result.error}` : ''}`);
    }
  });
  
  log('');
  if (passed === total) {
    logSuccess(`All ${total} validations passed! Ready for production deployment. 🚀`);
    log('');
    logInfo('Next steps:');
    logInfo('1. Set up your Resend domain (see docs/RESEND_DOMAIN_SETUP.md)');
    logInfo('2. Run: npm run deploy:production');
    logInfo('3. Run: npm run health-check');
    logInfo('4. Follow the production deployment checklist');
    process.exit(0);
  } else {
    logError(`${total - passed} out of ${total} validations failed`);
    log('');
    logInfo('Please fix the issues above before deploying to production.');
    process.exit(1);
  }
}

// Load environment variables from .env.production if it exists
function loadProductionEnv() {
  const envPath = 'supabase/.env.production';
  if (fs.existsSync(envPath)) {
    logInfo('Loading environment variables from supabase/.env.production');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    }
  }
}

// Run validation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadProductionEnv();
  validateProductionConfig().catch(error => {
    logError(`Validation failed: ${error.message}`);
    process.exit(1);
  });
}

export {
  validateProductionConfig,
  validateEnvironmentVariables,
  validateFileStructure,
  validateSupabaseConfig,
  validateEdgeFunctions,
  validateDatabaseMigrations,
  validateScripts,
  validatePackageJson
};