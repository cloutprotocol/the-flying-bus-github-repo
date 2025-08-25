#!/usr/bin/env node

/**
 * Production Health Check Script for Email Notification System
 * This script performs comprehensive health checks on the deployed system
 */

import https from 'https';
import http from 'http';

// Configuration
const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  timeout: 10000, // 10 seconds
  retries: 3
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
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

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, config.timeout);

    const req = protocol.request(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.supabaseAnonKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    }, (res) => {
      clearTimeout(timeout);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            data: parsedData,
            headers: res.headers
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Retry wrapper
async function withRetry(fn, retries = config.retries) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      logWarning(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Health check functions
async function checkSupabaseConnection() {
  logInfo('Checking Supabase connection...');
  
  try {
    const response = await withRetry(() => 
      makeRequest(`${config.supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': config.supabaseAnonKey
        }
      })
    );

    if (response.statusCode === 200) {
      logSuccess('Supabase connection is healthy');
      return true;
    } else {
      logError(`Supabase connection failed with status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Supabase connection error: ${error.message}`);
    return false;
  }
}

async function checkEmailServiceHealth() {
  logInfo('Checking email service health...');
  
  try {
    const response = await withRetry(() => 
      makeRequest(`${config.supabaseUrl}/functions/v1/send-email/health`)
    );

    if (response.statusCode === 200) {
      logSuccess('Email service is healthy');
      if (response.data.resend_connected) {
        logSuccess('Resend API connection is working');
      } else {
        logWarning('Resend API connection issue detected');
      }
      return true;
    } else {
      logError(`Email service health check failed with status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Email service health check error: ${error.message}`);
    return false;
  }
}

async function checkEmailServiceMetrics() {
  logInfo('Checking email service metrics...');
  
  try {
    const response = await withRetry(() => 
      makeRequest(`${config.supabaseUrl}/functions/v1/send-email/metrics`)
    );

    if (response.statusCode === 200) {
      const metrics = response.data;
      logSuccess('Email service metrics retrieved');
      logInfo(`Emails sent: ${metrics.sent || 0}`);
      logInfo(`Emails failed: ${metrics.failed || 0}`);
      logInfo(`Success rate: ${metrics.successRate || 0}%`);
      
      if (metrics.successRate < 90 && metrics.sent > 10) {
        logWarning('Email success rate is below 90%');
      }
      
      return true;
    } else {
      logError(`Email metrics check failed with status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Email metrics check error: ${error.message}`);
    return false;
  }
}

async function checkTokenServiceHealth() {
  logInfo('Checking token service health...');
  
  try {
    // Test token cleanup endpoint (should return success even if no tokens to clean)
    const response = await withRetry(() => 
      makeRequest(`${config.supabaseUrl}/functions/v1/invitation-tokens?action=cleanup`, {
        method: 'POST'
      })
    );

    if (response.statusCode === 200) {
      logSuccess('Token service is healthy');
      return true;
    } else {
      logError(`Token service health check failed with status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Token service health check error: ${error.message}`);
    return false;
  }
}

async function checkDatabaseHealth() {
  logInfo('Checking database health...');
  
  try {
    // Check if we can query the invitation_requests table
    const response = await withRetry(() => 
      makeRequest(`${config.supabaseUrl}/rest/v1/invitation_requests?select=count&limit=1`, {
        headers: {
          'apikey': config.supabaseAnonKey,
          'Range': '0-0'
        }
      })
    );

    if (response.statusCode === 200 || response.statusCode === 206) {
      logSuccess('Database connection is healthy');
      return true;
    } else {
      logError(`Database health check failed with status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Database health check error: ${error.message}`);
    return false;
  }
}

async function checkSystemMetrics() {
  logInfo('Checking system metrics...');
  
  try {
    // Check email system dashboard view
    const response = await withRetry(() => 
      makeRequest(`${config.supabaseUrl}/rest/v1/email_system_dashboard?select=*`, {
        headers: {
          'apikey': config.supabaseAnonKey
        }
      })
    );

    if (response.statusCode === 200) {
      const metrics = response.data[0];
      if (metrics) {
        logSuccess('System metrics retrieved');
        logInfo(`Emails last 24h: ${metrics.emails_last_24h || 0}`);
        logInfo(`Success rate 24h: ${metrics.success_rate_24h || 0}%`);
        logInfo(`Active tokens: ${metrics.active_tokens || 0}`);
        logInfo(`Errors last 24h: ${metrics.errors_last_24h || 0}`);
        
        if (metrics.errors_last_24h > 10) {
          logWarning('High error count detected in the last 24 hours');
        }
        
        if (metrics.success_rate_24h < 90 && metrics.emails_last_24h > 10) {
          logWarning('Email success rate is below 90% in the last 24 hours');
        }
      }
      return true;
    } else {
      logError(`System metrics check failed with status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`System metrics check error: ${error.message}`);
    return false;
  }
}

async function checkResendConnection() {
  logInfo('Checking Resend API connection...');
  
  try {
    const response = await withRetry(() => 
      makeRequest(`${config.supabaseUrl}/functions/v1/send-email/test`)
    );

    if (response.statusCode === 200 && response.data.connected) {
      logSuccess('Resend API connection is working');
      return true;
    } else {
      logError('Resend API connection failed');
      return false;
    }
  } catch (error) {
    logError(`Resend connection check error: ${error.message}`);
    return false;
  }
}

// Main health check function
async function runHealthChecks() {
  log('\n🏥 Email Notification System Health Check', colors.cyan);
  log('=' .repeat(50), colors.cyan);
  
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    logError('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  logInfo(`Checking system at: ${config.supabaseUrl}`);
  log('');

  const checks = [
    { name: 'Supabase Connection', fn: checkSupabaseConnection },
    { name: 'Database Health', fn: checkDatabaseHealth },
    { name: 'Email Service Health', fn: checkEmailServiceHealth },
    { name: 'Email Service Metrics', fn: checkEmailServiceMetrics },
    { name: 'Token Service Health', fn: checkTokenServiceHealth },
    { name: 'Resend Connection', fn: checkResendConnection },
    { name: 'System Metrics', fn: checkSystemMetrics }
  ];

  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check.fn();
      results.push({ name: check.name, success: result });
    } catch (error) {
      logError(`${check.name} check failed: ${error.message}`);
      results.push({ name: check.name, success: false, error: error.message });
    }
    log(''); // Add spacing between checks
  }

  // Summary
  log('📊 Health Check Summary', colors.cyan);
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
    logSuccess(`All ${total} health checks passed! 🎉`);
    process.exit(0);
  } else {
    logError(`${total - passed} out of ${total} health checks failed`);
    process.exit(1);
  }
}

// Run health checks if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHealthChecks().catch(error => {
    logError(`Health check failed: ${error.message}`);
    process.exit(1);
  });
}

export {
  runHealthChecks,
  checkSupabaseConnection,
  checkEmailServiceHealth,
  checkTokenServiceHealth,
  checkDatabaseHealth,
  checkSystemMetrics,
  checkResendConnection
};