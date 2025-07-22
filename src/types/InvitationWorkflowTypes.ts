// Types for the Invitation Approval Workflow
// These extend the base Supabase types with new tables and enhanced functionality

export type EmailType = 'approval' | 'denial' | 'welcome' | 'expiry_warning';
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'bounced';
export type NotificationStatus = 'pending' | 'sent' | 'failed';

// Database table types for new tables
export interface InvitationToken {
  id: string;
  invitation_request_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export interface EmailNotification {
  id: string;
  invitation_request_id: string;
  email_type: EmailType;
  recipient_email: string;
  sent_at: string | null;
  delivery_status: DeliveryStatus;
  error_message: string | null;
  created_at: string;
}

// Enhanced invitation request type with new fields
export interface EnhancedInvitationRequest {
  id: string;
  child_age: number;
  child_name: string;
  child_user_id: string | null;
  created_at: string;
  message: string | null;
  parent_email: string;
  parent_name: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  status: string;
  // New fields from migration
  invitation_claimed_at: string | null;
  notification_sent_at: string | null;
  notification_status: NotificationStatus;
}

// Service interfaces
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TokenValidation {
  isValid: boolean;
  invitationId?: string;
  parentEmail?: string;
  childName?: string;
  expiresAt?: string;
  usedAt?: string | null;
}

export interface TokenStatus {
  exists: boolean;
  isExpired: boolean;
  isUsed: boolean;
  expiresAt?: string;
  usedAt?: string | null;
}

export interface ClaimResult {
  success: boolean;
  userId?: string;
  isNewUser: boolean;
  error?: string;
}

export interface InvitationData {
  invitationId: string;
  parentEmail: string;
  childName: string;
  childAge: number;
}

// Email template data interfaces
export interface ApprovalEmailData {
  parentName: string;
  childName: string;
  invitationToken: string;
  invitationUrl: string;
  expiresAt: string;
}

export interface DenialEmailData {
  parentName: string;
  childName: string;
  reason?: string;
}

export interface WelcomeEmailData {
  parentName: string;
  childName: string;
  platformUrl: string;
  guidelinesUrl: string;
}

export interface ExpiryWarningEmailData {
  parentName: string;
  childName: string;
  expiresAt: string;
  supportEmail: string;
}

// Database function return types
export interface ValidateTokenResult {
  is_valid: boolean;
  invitation_id: string;
  parent_email: string;
  child_name: string;
  expires_at: string;
  used_at: string | null;
}

// Admin dashboard types
export interface InvitationStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  deniedRequests: number;
  claimedInvitations: number;
  unclaimedInvitations: number;
  expiredTokens: number;
}

export interface InvitationWithDetails extends EnhancedInvitationRequest {
  token?: InvitationToken;
  notifications: EmailNotification[];
  linkedUser?: {
    id: string;
    display_name: string;
    email: string;
    username: string;
  };
}

// Error types
export interface InvitationError {
  code: string;
  message: string;
  details?: any;
}

// Constants
export const INVITATION_TOKEN_EXPIRY_DAYS = 30;
export const EMAIL_RATE_LIMIT_PER_HOUR = 100;

// Utility types for form handling
export interface InvitationClaimFormData {
  email: string;
  displayName: string;
  username: string;
  password?: string;
  confirmPassword?: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  invitation?: {
    id: string;
    parentEmail: string;
    childName: string;
    childAge: number;
  };
  error?: string;
}