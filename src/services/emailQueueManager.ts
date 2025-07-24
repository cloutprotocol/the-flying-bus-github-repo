// Email Queue Manager - Handles initialization and monitoring of the email queue system
// This service manages the lifecycle of the email queue processing

import { EmailQueueService } from './emailQueueService';

export class EmailQueueManager {
  private static instance: EmailQueueManager | null = null;
  private isInitialized = false;
  private healthCheckInterval: number | null = null;
  private cleanupInterval: number | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): EmailQueueManager {
    if (!this.instance) {
      this.instance = new EmailQueueManager();
    }
    return this.instance;
  }

  /**
   * Initialize the email queue system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Email queue manager already initialized');
      return;
    }

    try {
      console.log('Initializing email queue manager...');

      // Start the email queue processing
      EmailQueueService.startProcessing(30000); // Process every 30 seconds

      // Set up health monitoring (every 5 minutes)
      this.healthCheckInterval = setInterval(async () => {
        await this.performHealthCheck();
      }, 5 * 60 * 1000);

      // Set up cleanup of old jobs (every hour)
      this.cleanupInterval = setInterval(async () => {
        await this.performCleanup();
      }, 60 * 60 * 1000);

      this.isInitialized = true;
      console.log('Email queue manager initialized successfully');

      // Perform initial health check
      await this.performHealthCheck();
    } catch (error) {
      console.error('Error initializing email queue manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown the email queue system
   */
  shutdown(): void {
    console.log('Shutting down email queue manager...');

    // Stop email processing
    EmailQueueService.stopProcessing();

    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isInitialized = false;
    console.log('Email queue manager shut down');
  }

  /**
   * Perform health check and log status
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const health = await EmailQueueService.getQueueHealth();
      
      if (health.status === 'critical') {
        console.error('EMAIL QUEUE CRITICAL:', health.message);
        // In production, you would send alerts to administrators
        await this.handleCriticalStatus(health);
      } else if (health.status === 'warning') {
        console.warn('EMAIL QUEUE WARNING:', health.message);
        // In production, you might send notifications
      } else {
        console.log('Email queue health check: OK');
      }

      // Log detailed stats periodically
      if (health.stats) {
        console.log('Email queue stats:', {
          pending: health.stats.pending,
          processing: health.stats.processing,
          failed: health.stats.failed,
          retrying: health.stats.retrying,
          total: health.stats.totalJobs
        });
      }
    } catch (error) {
      console.error('Error performing email queue health check:', error);
    }
  }

  /**
   * Handle critical queue status
   */
  private async handleCriticalStatus(health: any): Promise<void> {
    try {
      // Reset any stuck processing jobs
      console.log('Attempting to reset stuck jobs...');
      
      // In a real implementation, you would call a database function
      // For now, we'll just log the issue
      console.log('Critical email queue status requires manual intervention');
      
      // You could also:
      // 1. Send admin notifications
      // 2. Reset stuck jobs
      // 3. Restart processing
      // 4. Scale up processing capacity
    } catch (error) {
      console.error('Error handling critical queue status:', error);
    }
  }

  /**
   * Perform cleanup of old completed jobs
   */
  private async performCleanup(): Promise<void> {
    try {
      console.log('Performing email queue cleanup...');
      const result = await EmailQueueService.cleanupOldJobs(7); // Keep jobs for 7 days
      console.log(`Cleaned up ${result.deleted} old email jobs`);
    } catch (error) {
      console.error('Error performing email queue cleanup:', error);
    }
  }

  /**
   * Get current queue status for admin dashboard
   */
  async getStatus(): Promise<{
    isInitialized: boolean;
    health: any;
    stats: any;
    recentFailures: any[];
  }> {
    try {
      const health = await EmailQueueService.getQueueHealth();
      const stats = await EmailQueueService.getQueueStats();
      const recentFailures = await EmailQueueService.getFailedJobs(10);

      return {
        isInitialized: this.isInitialized,
        health,
        stats,
        recentFailures
      };
    } catch (error) {
      console.error('Error getting queue status:', error);
      return {
        isInitialized: this.isInitialized,
        health: { status: 'error', message: 'Unable to get health status' },
        stats: null,
        recentFailures: []
      };
    }
  }

  /**
   * Manually trigger queue processing (for admin use)
   */
  async triggerProcessing(): Promise<{ processed: number; failed: number }> {
    try {
      console.log('Manually triggering email queue processing...');
      return await EmailQueueService.processPendingJobs();
    } catch (error) {
      console.error('Error manually triggering queue processing:', error);
      return { processed: 0, failed: 0 };
    }
  }

  /**
   * Retry all failed jobs (for admin use)
   */
  async retryAllFailedJobs(): Promise<{ retried: number; successful: number; failed: number }> {
    try {
      console.log('Retrying all failed email jobs...');
      const failedJobs = await EmailQueueService.getFailedJobs();
      let successful = 0;
      let failed = 0;

      for (const job of failedJobs) {
        const result = await EmailQueueService.retryJob(job.id);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      }

      return {
        retried: failedJobs.length,
        successful,
        failed
      };
    } catch (error) {
      console.error('Error retrying failed jobs:', error);
      return { retried: 0, successful: 0, failed: 0 };
    }
  }
}

// Export singleton instance
export const emailQueueManager = EmailQueueManager.getInstance();