import { AdminNotificationService } from './adminNotificationService';

/**
 * Background service to monitor invitation events and create admin notifications
 * This service should be called periodically (e.g., every 15 minutes) to check for events
 */
export class InvitationNotificationMonitor {
  private static isRunning = false;
  private static intervalId: number | null = null;

  /**
   * Start the monitoring service
   */
  static start(intervalMinutes: number = 15): void {
    if (this.isRunning) {
      console.log('Invitation notification monitor is already running');
      return;
    }

    console.log(`Starting invitation notification monitor (checking every ${intervalMinutes} minutes)`);
    this.isRunning = true;

    // Run immediately
    this.checkInvitationEvents();

    // Set up periodic checking
    this.intervalId = setInterval(() => {
      this.checkInvitationEvents();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop the monitoring service
   */
  static stop(): void {
    if (!this.isRunning) {
      console.log('Invitation notification monitor is not running');
      return;
    }

    console.log('Stopping invitation notification monitor');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check for invitation events and create notifications
   */
  private static async checkInvitationEvents(): Promise<void> {
    try {
      console.log('Checking for invitation events...');
      
      // Check and create notifications for invitations needing attention
      await AdminNotificationService.checkAndCreateInvitationNotifications();
      
      // Clean up old notifications (older than 90 days)
      const cleanedUp = await AdminNotificationService.cleanupOldNotifications(90);
      if (cleanedUp > 0) {
        console.log(`Cleaned up ${cleanedUp} old admin notifications`);
      }

      console.log('Invitation event check completed');
    } catch (error) {
      console.error('Error checking invitation events:', error);
    }
  }

  /**
   * Manually trigger a check (useful for testing or immediate updates)
   */
  static async triggerCheck(): Promise<void> {
    await this.checkInvitationEvents();
  }

  /**
   * Get the current status of the monitor
   */
  static getStatus(): { isRunning: boolean; intervalId: number | null } {
    return {
      isRunning: this.isRunning,
      intervalId: this.intervalId
    };
  }
}

// Auto-start the monitor in production environments
// In development, you might want to start it manually for testing
if (typeof window !== 'undefined' && import.meta.env.PROD) {
  // Start monitoring when the module is loaded (client-side only)
  InvitationNotificationMonitor.start(15); // Check every 15 minutes
}

export default InvitationNotificationMonitor;