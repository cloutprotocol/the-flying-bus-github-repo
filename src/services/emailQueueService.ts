// Email Queue Service for Background Email Processing
// This service handles asynchronous email sending with retry logic and monitoring

import { supabase } from '@/integrations/supabase/client';
import { EmailNotificationService } from './emailNotificationService';
import type { EmailType } from '@/types/InvitationWorkflowTypes';

export interface EmailJob {
  id: string;
  invitation_id: string;
  email_type: EmailType;
  recipient_email: string;
  priority: 'high' | 'normal' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retry';
  attempts: number;
  max_attempts: number;
  scheduled_at: Date;
  processed_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface EmailJobData {
  invitationId: string;
  emailType: EmailType;
  recipientEmail: string;
  priority?: 'high' | 'normal' | 'low';
  scheduledAt?: Date;
  denialReason?: string; // For denial emails
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retrying: number;
  totalJobs: number;
}

export class EmailQueueService {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly RETRY_DELAYS = [1000, 5000, 15000]; // 1s, 5s, 15s
  private static readonly BATCH_SIZE = 10;
  private static readonly PROCESSING_TIMEOUT = 300000; // 5 minutes
  
  private static isProcessing = false;
  private static processingInterval: number | null = null;

  /**
   * Add an email job to the queue
   */
  static async addEmailJob(jobData: EmailJobData): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const job = {
        invitation_id: jobData.invitationId,
        email_type: jobData.emailType,
        recipient_email: jobData.recipientEmail,
        priority: jobData.priority || 'normal',
        status: 'pending' as const,
        attempts: 0,
        max_attempts: this.MAX_ATTEMPTS,
        scheduled_at: jobData.scheduledAt || new Date(),
        created_at: new Date(),
        updated_at: new Date()
      };

      const { data, error } = await supabase
        .from('email_queue')
        .insert([job])
        .select('id')
        .single();

      if (error) {
        console.error('Error adding email job to queue:', error);
        return { success: false, error: error.message };
      }

      // Start processing if not already running
      this.startProcessing();

      return { success: true, jobId: data.id };
    } catch (error) {
      console.error('Exception adding email job:', error);
      return { success: false, error: 'Failed to add email job to queue' };
    }
  }

  /**
   * Process pending email jobs
   */
  static async processPendingJobs(): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing) {
      console.log('Email queue processing already in progress');
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    try {
      // Get pending and retry jobs, ordered by priority and scheduled time
      const { data: jobs, error } = await supabase
        .from('email_queue')
        .select('*')
        .in('status', ['pending', 'retry'])
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false }) // high priority first
        .order('scheduled_at', { ascending: true }) // oldest first
        .limit(this.BATCH_SIZE);

      if (error) {
        console.error('Error fetching pending email jobs:', error);
        return { processed: 0, failed: 0 };
      }

      if (!jobs || jobs.length === 0) {
        return { processed: 0, failed: 0 };
      }

      console.log(`Processing ${jobs.length} email jobs`);

      // Process jobs sequentially to avoid overwhelming the email service
      for (const job of jobs) {
        try {
          const result = await this.processEmailJob(job);
          if (result.success) {
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Error processing job ${job.id}:`, error);
          failed++;
        }
      }

      console.log(`Email queue processing completed: ${processed} processed, ${failed} failed`);
    } catch (error) {
      console.error('Error in email queue processing:', error);
    } finally {
      this.isProcessing = false;
    }

    return { processed, failed };
  }

  /**
   * Process a single email job
   */
  private static async processEmailJob(job: EmailJob): Promise<{ success: boolean; error?: string }> {
    try {
      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing');

      // Send the email based on type
      let emailResult;
      switch (job.email_type) {
        case 'approval':
          emailResult = await EmailNotificationService.sendApprovalEmail(job.invitation_id);
          break;
        case 'denial':
          emailResult = await EmailNotificationService.sendDenialEmail(job.invitation_id);
          break;
        case 'welcome':
          // For welcome emails, we need the user ID - this would need to be stored in job data
          emailResult = await EmailNotificationService.sendWelcomeEmail(job.invitation_id, '');
          break;
        case 'expiry_warning':
          emailResult = await EmailNotificationService.sendExpiryWarningEmail(job.invitation_id);
          break;
        default:
          throw new Error(`Unknown email type: ${job.email_type}`);
      }

      if (emailResult.success) {
        // Mark job as completed
        await this.updateJobStatus(job.id, 'completed', undefined, new Date());
        return { success: true };
      } else {
        // Handle failure
        return await this.handleJobFailure(job, emailResult.error || 'Email sending failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return await this.handleJobFailure(job, errorMessage);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private static async handleJobFailure(job: EmailJob, errorMessage: string): Promise<{ success: boolean; error?: string }> {
    const newAttempts = job.attempts + 1;

    if (newAttempts >= job.max_attempts) {
      // Max attempts reached, mark as failed
      await this.updateJobStatus(job.id, 'failed', errorMessage);
      console.error(`Email job ${job.id} failed after ${newAttempts} attempts: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } else {
      // Schedule for retry
      const retryDelay = this.RETRY_DELAYS[newAttempts - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
      const scheduledAt = new Date(Date.now() + retryDelay);
      
      await this.updateJobStatus(job.id, 'retry', errorMessage, undefined, newAttempts, scheduledAt);
      console.log(`Email job ${job.id} scheduled for retry ${newAttempts}/${job.max_attempts} at ${scheduledAt}`);
      return { success: false, error: `Scheduled for retry: ${errorMessage}` };
    }
  }

  /**
   * Update job status in database
   */
  private static async updateJobStatus(
    jobId: string,
    status: EmailJob['status'],
    errorMessage?: string,
    processedAt?: Date,
    attempts?: number,
    scheduledAt?: Date
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (errorMessage !== undefined) updateData.error_message = errorMessage;
    if (processedAt !== undefined) updateData.processed_at = processedAt;
    if (attempts !== undefined) updateData.attempts = attempts;
    if (scheduledAt !== undefined) updateData.scheduled_at = scheduledAt;

    const { error } = await supabase
      .from('email_queue')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error('Error updating job status:', error);
    }
  }

  /**
   * Start background processing
   */
  static startProcessing(intervalMs: number = 30000): void {
    if (this.processingInterval) {
      return; // Already running
    }

    console.log('Starting email queue background processing');
    
    // Process immediately
    this.processPendingJobs();

    // Set up interval processing
    this.processingInterval = setInterval(() => {
      this.processPendingJobs();
    }, intervalMs);
  }

  /**
   * Stop background processing
   */
  static stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Stopped email queue background processing');
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<QueueStats | null> {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('status')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting queue stats:', error);
        return null;
      }

      const stats: QueueStats = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
        totalJobs: data?.length || 0
      };

      data?.forEach(job => {
        switch (job.status) {
          case 'pending':
            stats.pending++;
            break;
          case 'processing':
            stats.processing++;
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'failed':
            stats.failed++;
            break;
          case 'retry':
            stats.retrying++;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Exception getting queue stats:', error);
      return null;
    }
  }

  /**
   * Get failed jobs for admin review
   */
  static async getFailedJobs(limit: number = 50): Promise<EmailJob[]> {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'failed')
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting failed jobs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Exception getting failed jobs:', error);
      return [];
    }
  }

  /**
   * Retry a specific failed job
   */
  static async retryJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: job, error } = await supabase
        .from('email_queue')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !job) {
        return { success: false, error: 'Job not found' };
      }

      if (job.status !== 'failed') {
        return { success: false, error: 'Job is not in failed status' };
      }

      // Reset job for retry
      await this.updateJobStatus(
        jobId,
        'pending',
        undefined,
        undefined,
        0, // Reset attempts
        new Date() // Schedule immediately
      );

      // Start processing if not already running
      this.startProcessing();

      return { success: true };
    } catch (error) {
      console.error('Error retrying job:', error);
      return { success: false, error: 'Failed to retry job' };
    }
  }

  /**
   * Clean up old completed jobs
   */
  static async cleanupOldJobs(olderThanDays: number = 30): Promise<{ deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { data, error } = await supabase
        .from('email_queue')
        .delete()
        .eq('status', 'completed')
        .lt('processed_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Error cleaning up old jobs:', error);
        return { deleted: 0 };
      }

      const deleted = data?.length || 0;
      console.log(`Cleaned up ${deleted} old email jobs`);
      return { deleted };
    } catch (error) {
      console.error('Exception cleaning up old jobs:', error);
      return { deleted: 0 };
    }
  }

  /**
   * Get queue health status
   */
  static async getQueueHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    stats: QueueStats | null;
  }> {
    try {
      const stats = await this.getQueueStats();
      
      if (!stats) {
        return {
          status: 'critical',
          message: 'Unable to retrieve queue statistics',
          stats: null
        };
      }

      const failureRate = stats.totalJobs > 0 ? (stats.failed / stats.totalJobs) * 100 : 0;
      const pendingJobs = stats.pending + stats.retrying;

      if (failureRate > 20) {
        return {
          status: 'critical',
          message: `High failure rate: ${failureRate.toFixed(1)}%`,
          stats
        };
      } else if (failureRate > 10 || pendingJobs > 100) {
        return {
          status: 'warning',
          message: `Moderate issues: ${failureRate.toFixed(1)}% failure rate, ${pendingJobs} pending jobs`,
          stats
        };
      } else {
        return {
          status: 'healthy',
          message: 'Email queue operating normally',
          stats
        };
      }
    } catch (error) {
      console.error('Error checking queue health:', error);
      return {
        status: 'critical',
        message: 'Error checking queue health',
        stats: null
      };
    }
  }
}