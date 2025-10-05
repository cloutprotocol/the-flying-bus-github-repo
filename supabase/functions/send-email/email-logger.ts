interface EmailLogEvent {
  timestamp: string
  event: 'email_sent' | 'email_failed' | 'template_rendered' | 'api_error' | 'validation_error'
  type?: string
  to?: string
  success?: boolean
  messageId?: string
  error?: string
  duration?: number
  metadata?: Record<string, any>
}

interface EmailMetrics {
  sent: number
  failed: number
  bounced: number
  delivered: number
  templateErrors: number
  apiErrors: number
}

export class EmailLogger {
  private static metrics: EmailMetrics = {
    sent: 0,
    failed: 0,
    bounced: 0,
    delivered: 0,
    templateErrors: 0,
    apiErrors: 0
  }

  static logEmailEvent(event: EmailLogEvent): void {
    // Structure log for better parsing
    const logEntry = {
      timestamp: event.timestamp || new Date().toISOString(),
      level: event.success === false ? 'ERROR' : 'INFO',
      service: 'email-service',
      ...event
    }

    console.log(JSON.stringify(logEntry))

    // Update metrics
    this.updateMetrics(event)
  }

  static logEmailSent(to: string, type: string, messageId: string, duration: number): void {
    this.logEmailEvent({
      timestamp: new Date().toISOString(),
      event: 'email_sent',
      type,
      to,
      success: true,
      messageId,
      duration
    })
  }

  static logEmailFailed(to: string, type: string, error: string, duration: number): void {
    this.logEmailEvent({
      timestamp: new Date().toISOString(),
      event: 'email_failed',
      type,
      to,
      success: false,
      error,
      duration
    })
  }

  static logTemplateRendered(type: string, duration: number): void {
    this.logEmailEvent({
      timestamp: new Date().toISOString(),
      event: 'template_rendered',
      type,
      success: true,
      duration
    })
  }

  static logTemplateError(type: string, error: string): void {
    this.logEmailEvent({
      timestamp: new Date().toISOString(),
      event: 'template_rendered',
      type,
      success: false,
      error
    })
  }

  static logApiError(error: string, metadata?: Record<string, any>): void {
    this.logEmailEvent({
      timestamp: new Date().toISOString(),
      event: 'api_error',
      success: false,
      error,
      metadata
    })
  }

  static logValidationError(error: string, metadata?: Record<string, any>): void {
    this.logEmailEvent({
      timestamp: new Date().toISOString(),
      event: 'validation_error',
      success: false,
      error,
      metadata
    })
  }

  static getMetrics(): EmailMetrics {
    return { ...this.metrics }
  }

  static resetMetrics(): void {
    this.metrics = {
      sent: 0,
      failed: 0,
      bounced: 0,
      delivered: 0,
      templateErrors: 0,
      apiErrors: 0
    }
  }

  private static updateMetrics(event: EmailLogEvent): void {
    switch (event.event) {
      case 'email_sent':
        if (event.success) {
          this.metrics.sent++
        } else {
          this.metrics.failed++
        }
        break
      case 'email_failed':
        this.metrics.failed++
        break
      case 'template_rendered':
        if (!event.success) {
          this.metrics.templateErrors++
        }
        break
      case 'api_error':
        this.metrics.apiErrors++
        break
    }
  }
}

export class EmailMonitor {
  static async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy', metrics: EmailMetrics, checks: Record<string, boolean> }> {
    const metrics = EmailLogger.getMetrics()
    const checks = {
      resendApiKey: !!Deno.env.get('RESEND_API_KEY'),
      defaultFromEmail: !!Deno.env.get('DEFAULT_FROM_EMAIL')
    }

    // Calculate health status
    const totalEmails = metrics.sent + metrics.failed
    const failureRate = totalEmails > 0 ? metrics.failed / totalEmails : 0
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (!checks.resendApiKey || failureRate > 0.5) {
      status = 'unhealthy'
    } else if (failureRate > 0.1 || metrics.apiErrors > 5) {
      status = 'degraded'
    }

    return {
      status,
      metrics,
      checks
    }
  }

  static async testResendConnection(): Promise<boolean> {
    try {
      const apiKey = Deno.env.get('RESEND_API_KEY')
      if (!apiKey) {
        return false
      }

      // Test API connection with a simple request
      const response = await fetch('https://api.resend.com/domains', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      return response.ok
    } catch (error) {
      EmailLogger.logApiError('Resend connection test failed', { error: error.message })
      return false
    }
  }
}