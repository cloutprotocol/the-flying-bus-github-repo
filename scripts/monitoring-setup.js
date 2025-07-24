/**
 * Monitoring and Alerting Setup for The Flying Bus Invitation Approval Workflow
 * This script sets up monitoring dashboards and alert configurations
 */

const monitoringConfig = {
  // Health check endpoints to monitor
  healthChecks: [
    {
      name: 'Application Health',
      url: process.env.VITE_APP_URL + '/api/health',
      interval: '1m',
      timeout: '10s',
      expectedStatus: 200,
      critical: true
    },
    {
      name: 'Database Health',
      url: process.env.VITE_APP_URL + '/api/health/database',
      interval: '2m',
      timeout: '15s',
      expectedStatus: 200,
      critical: true
    },
    {
      name: 'Email Service Health',
      url: process.env.VITE_APP_URL + '/api/health/email',
      interval: '5m',
      timeout: '30s',
      expectedStatus: 200,
      critical: false
    }
  ],

  // Metrics to track
  metrics: {
    // Business metrics
    invitationApprovalRate: {
      query: 'SELECT COUNT(*) as approved FROM invitation_requests WHERE status = \'approved\' AND created_at > NOW() - INTERVAL \'24 hours\'',
      threshold: { min: 0, max: 1000 },
      alert: 'warning'
    },
    
    emailDeliveryRate: {
      query: 'SELECT COUNT(*) as delivered FROM email_notifications WHERE delivery_status = \'sent\' AND created_at > NOW() - INTERVAL \'1 hour\'',
      threshold: { min: 0.95 }, // 95% delivery rate
      alert: 'critical'
    },
    
    tokenClaimRate: {
      query: 'SELECT COUNT(*) as claimed FROM invitation_tokens WHERE used_at IS NOT NULL AND created_at > NOW() - INTERVAL \'7 days\'',
      threshold: { min: 0.6 }, // 60% claim rate
      alert: 'warning'
    },

    // Technical metrics
    responseTime: {
      endpoint: '/api/invitation-requests',
      threshold: { max: 2000 }, // 2 seconds
      alert: 'warning'
    },
    
    errorRate: {
      logQuery: 'level:error AND service:invitation-workflow',
      threshold: { max: 0.05 }, // 5% error rate
      alert: 'critical'
    },

    databaseConnections: {
      query: 'SELECT count(*) FROM pg_stat_activity WHERE state = \'active\'',
      threshold: { max: 80 }, // 80% of max connections
      alert: 'warning'
    }
  },

  // Alert configurations
  alerts: {
    critical: {
      channels: ['email', 'slack', 'pagerduty'],
      escalation: {
        immediate: ['tech-lead@theflyingbus.com'],
        after_5min: ['engineering-team@theflyingbus.com'],
        after_15min: ['management@theflyingbus.com']
      }
    },
    
    warning: {
      channels: ['email', 'slack'],
      escalation: {
        immediate: ['engineering-team@theflyingbus.com'],
        after_30min: ['tech-lead@theflyingbus.com']
      }
    },
    
    info: {
      channels: ['slack'],
      escalation: {
        immediate: ['#engineering-alerts']
      }
    }
  },

  // Dashboard configurations
  dashboards: {
    invitationWorkflow: {
      title: 'Invitation Approval Workflow',
      panels: [
        {
          title: 'Invitation Requests Over Time',
          type: 'timeseries',
          query: 'SELECT DATE_TRUNC(\'hour\', created_at) as time, COUNT(*) as requests FROM invitation_requests GROUP BY time ORDER BY time',
          timeRange: '24h'
        },
        {
          title: 'Approval Rate',
          type: 'stat',
          query: 'SELECT (COUNT(*) FILTER (WHERE status = \'approved\') * 100.0 / COUNT(*)) as approval_rate FROM invitation_requests WHERE created_at > NOW() - INTERVAL \'24 hours\'',
          unit: 'percent'
        },
        {
          title: 'Email Delivery Status',
          type: 'pie',
          query: 'SELECT delivery_status, COUNT(*) as count FROM email_notifications WHERE created_at > NOW() - INTERVAL \'24 hours\' GROUP BY delivery_status'
        },
        {
          title: 'Token Claim Rate',
          type: 'stat',
          query: 'SELECT (COUNT(*) FILTER (WHERE used_at IS NOT NULL) * 100.0 / COUNT(*)) as claim_rate FROM invitation_tokens WHERE created_at > NOW() - INTERVAL \'7 days\'',
          unit: 'percent'
        },
        {
          title: 'System Response Times',
          type: 'timeseries',
          query: 'avg(response_time) by (endpoint)',
          timeRange: '1h'
        },
        {
          title: 'Error Rate',
          type: 'timeseries',
          query: 'rate(errors_total[5m]) * 100',
          timeRange: '1h',
          unit: 'percent'
        }
      ]
    },

    systemHealth: {
      title: 'System Health Overview',
      panels: [
        {
          title: 'Service Uptime',
          type: 'stat',
          query: 'up{job="invitation-service"}',
          unit: 'percent'
        },
        {
          title: 'Database Connections',
          type: 'gauge',
          query: 'SELECT count(*) FROM pg_stat_activity WHERE state = \'active\'',
          max: 100
        },
        {
          title: 'Memory Usage',
          type: 'gauge',
          query: 'process_resident_memory_bytes / 1024 / 1024',
          unit: 'MB'
        },
        {
          title: 'CPU Usage',
          type: 'gauge',
          query: 'rate(process_cpu_seconds_total[5m]) * 100',
          unit: 'percent'
        }
      ]
    }
  }
};

// Sentry configuration for error tracking
const sentryConfig = {
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Custom error filtering
  beforeSend(event) {
    // Filter out known non-critical errors
    if (event.exception) {
      const error = event.exception.values[0];
      if (error.type === 'ChunkLoadError' || 
          error.value?.includes('Loading chunk')) {
        return null; // Don't send chunk loading errors
      }
    }
    return event;
  },

  // Custom tags for better error categorization
  initialScope: {
    tags: {
      component: 'invitation-workflow',
      version: process.env.npm_package_version
    }
  }
};

// Log aggregation configuration
const logConfig = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  
  // Structured logging fields
  defaultFields: {
    service: 'invitation-workflow',
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  },

  // Log retention policies
  retention: {
    debug: '1d',
    info: '7d',
    warn: '30d',
    error: '90d'
  },

  // Sensitive data filtering
  redactFields: [
    'password',
    'token',
    'email',
    'authorization',
    'cookie'
  ]
};

// Performance monitoring configuration
const performanceConfig = {
  // APM settings
  apm: {
    serviceName: 'invitation-workflow',
    environment: process.env.NODE_ENV,
    
    // Transaction sampling
    transactionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Custom transaction names
    transactionNameGroups: [
      { pattern: '/api/invitation-requests/*', name: 'invitation-request-api' },
      { pattern: '/claim-invitation/*', name: 'invitation-claim' },
      { pattern: '/admin/invitations/*', name: 'admin-invitation-management' }
    ]
  },

  // Custom metrics
  customMetrics: [
    {
      name: 'invitation_approval_duration',
      description: 'Time taken to process invitation approval',
      type: 'histogram',
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    },
    {
      name: 'email_delivery_attempts',
      description: 'Number of email delivery attempts',
      type: 'counter',
      labels: ['status', 'type']
    },
    {
      name: 'token_validation_requests',
      description: 'Number of token validation requests',
      type: 'counter',
      labels: ['result']
    }
  ]
};

// Export configurations for use in deployment
module.exports = {
  monitoringConfig,
  sentryConfig,
  logConfig,
  performanceConfig
};

// Setup functions for different monitoring platforms

/**
 * Setup monitoring for Datadog
 */
function setupDatadog() {
  if (!process.env.DATADOG_API_KEY) {
    console.warn('DATADOG_API_KEY not set, skipping Datadog setup');
    return;
  }

  const StatsD = require('node-statsd');
  const client = new StatsD({
    host: process.env.DATADOG_HOST || 'localhost',
    port: process.env.DATADOG_PORT || 8125,
    prefix: 'flyingbus.invitation.'
  });

  // Custom metrics reporting
  setInterval(() => {
    // Report invitation metrics
    reportInvitationMetrics(client);
    
    // Report system metrics
    reportSystemMetrics(client);
  }, 60000); // Every minute

  return client;
}

/**
 * Setup monitoring for New Relic
 */
function setupNewRelic() {
  if (!process.env.NEW_RELIC_LICENSE_KEY) {
    console.warn('NEW_RELIC_LICENSE_KEY not set, skipping New Relic setup');
    return;
  }

  const newrelic = require('newrelic');
  
  // Custom attributes
  newrelic.addCustomAttributes({
    service: 'invitation-workflow',
    version: process.env.npm_package_version
  });

  return newrelic;
}

/**
 * Setup basic health check endpoint
 */
function setupHealthCheck(app) {
  app.get('/api/health', async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      checks: {}
    };

    try {
      // Database health check
      health.checks.database = await checkDatabaseHealth();
      
      // Email service health check
      health.checks.email = await checkEmailHealth();
      
      // Overall status
      const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
      health.status = allHealthy ? 'healthy' : 'unhealthy';
      
      res.status(allHealthy ? 200 : 503).json(health);
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
      res.status(503).json(health);
    }
  });
}

// Helper functions
async function checkDatabaseHealth() {
  // Implementation would check database connectivity
  return { status: 'healthy', responseTime: '< 100ms' };
}

async function checkEmailHealth() {
  // Implementation would check SMTP connectivity
  return { status: 'healthy', responseTime: '< 500ms' };
}

async function reportInvitationMetrics(client) {
  // Implementation would query database and report metrics
  // client.gauge('invitations.pending', pendingCount);
  // client.gauge('invitations.approved_today', approvedToday);
}

async function reportSystemMetrics(client) {
  // Implementation would report system metrics
  // client.gauge('system.memory_usage', process.memoryUsage().heapUsed);
  // client.gauge('system.cpu_usage', process.cpuUsage().user);
}

// Initialize monitoring if this script is run directly
if (require.main === module) {
  console.log('Setting up monitoring for The Flying Bus Invitation System...');
  
  // Setup different monitoring platforms based on environment variables
  const datadog = setupDatadog();
  const newrelic = setupNewRelic();
  
  console.log('Monitoring setup completed');
  console.log('Available configurations:', Object.keys(module.exports));
}