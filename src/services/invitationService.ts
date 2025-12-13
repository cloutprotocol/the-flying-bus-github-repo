// Convex-only invitation service wrapper
// Legacy API compatibility with Supabase-based implementation removed.

import type { InvitationTokenData as ConvexInvitationTokenData } from '@/services/invitationConvexService';
import {
  validateInvitationToken as convexValidateToken,
  findUserByEmail as convexFindUserByEmail,
  createInvitationRequest as convexCreateInvitationRequest,
} from '@/services/invitationConvexService';

export type InvitationRequest = {
  id?: string;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  message?: string | null;
  status?: 'pending' | 'approved' | 'denied';
  created_at?: string;
};

export type InvitationTokenData = ConvexInvitationTokenData;

export interface ServiceResponse<T = any> {
  data?: T;
  error?: any;
}

export async function validateInvitationToken(
  token: string,
  email?: string,
): Promise<ServiceResponse<InvitationTokenData>> {
  return await convexValidateToken(token, email);
}

export async function findUserByEmail(
  email: string,
): Promise<ServiceResponse<{ id: string; email: string; role?: string } | null>> {
  return await convexFindUserByEmail(email);
}

export async function createInvitationRequest(
  data: Omit<InvitationRequest, 'id' | 'status' | 'created_at'>,
): Promise<ServiceResponse<{ id: string }>> {
  return await convexCreateInvitationRequest({
    parent_name: data.parent_name,
    parent_email: data.parent_email,
    child_name: data.child_name,
    child_age: data.child_age,
    message: data.message ?? null,
  } as any);
}

// Placeholders to keep import surfaces stable during migration
export const updateInvitationStatus = async (..._args: any[]) => ({ error: 'Not implemented via Convex yet' });
export const cancelInvitationRequest = async (..._args: any[]) => ({ error: 'Not implemented via Convex yet' });
export const resendInvitationEmail = async (..._args: any[]) => ({ error: 'Not implemented via Convex yet' });

export default {
  validateInvitationToken,
  findUserByEmail,
  createInvitationRequest,
  updateInvitationStatus,
  cancelInvitationRequest,
  resendInvitationEmail,
};

