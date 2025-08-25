export interface TokenRequest {
  invitationId: string;
  email: string;
  expirationHours?: number;
}

export interface TokenValidation {
  token: string;
  email?: string;
}

export interface TokenResponse {
  success: boolean;
  token?: string;
  invitationData?: InvitationData;
  error?: string;
}

export interface InvitationData {
  id: string;
  parent_name: string;
  child_name: string;
  email: string;
  message?: string;
  status: string;
  created_at: string;
  approved_at?: string;
}

export interface TokenRecord {
  id: string;
  invitation_id: string;
  token_hash: string;
  email: string;
  expires_at: string;
  used_at?: string;
  created_at: string;
}