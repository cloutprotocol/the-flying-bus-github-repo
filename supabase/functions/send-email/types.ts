export interface EmailRequest {
  type: 'invitation_confirmation' | 'invitation_approved' | 'invitation_expired' | 'invitation_invalid' | 'invitation_used' | 'custom';
  to: string;
  templateData: Record<string, any>;
  from?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface InvitationConfirmationData {
  parentName: string;
  childName: string;
  submissionDate: string;
}

export interface InvitationApprovedData {
  parentName: string;
  childName: string;
  activationUrl: string;
  expirationDate: string;
}

export interface InvitationExpiredData {
  parentName: string;
  childName: string;
  originalExpirationDate: string;
}

export interface InvitationInvalidData {
  supportEmail: string;
}

export interface InvitationUsedData {
  childName: string;
  dashboardUrl: string;
}