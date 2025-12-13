import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { AuthenticatedApiService } from './authenticatedApiService';

export interface InvitationRequestInput {
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  message?: string | null;
}

export interface InvitationTokenData {
  id: string;
  invitation_id: string;
  email: string;
  expires_at: string;
  invitation: {
    id?: string;
    parent_email: string;
    parent_name: string;
    child_name: string;
    child_age: number;
    status?: string;
    created_at?: string;
  };
}

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

export async function validateInvitationToken(token: string, email?: string) {
  return AuthenticatedApiService.validateInvitationToken({ token, email });
}

export async function findUserByEmail(email: string) {
  try {
    const profile: any = await convex.query(api.profiles.getByEmail, { email });
    if (!profile) return { data: null };
    return {
      data: {
        id: profile._id,
        email: profile.email,
        role: profile.role,
        display_name: profile.display_name,
        username: profile.username,
      },
    };
  } catch (error) {
    return { error } as any;
  }
}

export async function createInvitationRequest(input: InvitationRequestInput) {
  try {
    const id = await convex.mutation(api.invitations.createRequest, {
      email: input.parent_email,
      first_name: input.parent_name.split(' ')[0] || input.parent_name,
      last_name: input.parent_name.split(' ').slice(1).join(' '),
      bio: input.message || undefined,
      portfolio_url: undefined,
    });
    return { data: { id } };
  } catch (error) {
    return { error } as any;
  }
}

