import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

export interface AdminServiceConfig {
  useServiceRole?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export interface AdminOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
  details?: Record<string, any>;
}

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

const AdminService = {
  async validateAdminPermissions(userId: string): Promise<AdminOperationResult<boolean>> {
    try {
      const profile: any = await convex.query(api.profiles.getById, { profileId: userId as any as Id<'profiles'> });
      const allowed = !!profile && ['admin', 'moderator'].includes(String(profile.role));
      return { success: true, data: allowed };
    } catch (error: any) {
      return { success: false, error: error.message || 'VALIDATION_FAILED' };
    }
  },

  async updateInvitationRequestStatus(
    id: string,
    status: 'approved' | 'denied',
    reviewerId: string,
    _config?: AdminServiceConfig
  ): Promise<AdminOperationResult> {
    try {
      await convex.mutation(api.invitations.updateRequest, {
        id: id as any as Id<'invitation_requests'>,
        status,
        reviewed_by: reviewerId as any as Id<'profiles'>,
      });
      return { success: true, data: { id, status }, details: { method: 'convex' } };
    } catch (error: any) {
      return { success: false, error: error.message || 'UPDATE_FAILED', retryable: true };
    }
  },

  async logAdminAction(
    action: string,
    resourceType: string,
    resourceId: string,
    userId: string,
    metadata: Record<string, any> = {}
  ): Promise<AdminOperationResult> {
    try {
      await convex.mutation(api.activities.createAuditLog, {
        user_id: userId as any as Id<'profiles'>,
        action,
        entity_type: resourceType,
        entity_id: resourceId,
        changes: metadata,
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'LOG_FAILED', retryable: false };
    }
  },

  async sendAdminNotificationEmail(
    _emailType: string,
    _recipientEmail: string,
    _templateData: Record<string, any>
  ): Promise<AdminOperationResult> {
    // Placeholder: integrate a Convex Action for email if needed
    return { success: true, data: { queued: true } };
  },

  async getOperationStatus(): Promise<AdminOperationResult> {
    // Simple stubbed status for tests
    return { success: true, data: { status: 'idle' } };
  },
};

export default AdminService;

