import { supabase } from '@/integrations/supabase/client';

export interface InvitationRequest {
  id?: string;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  message?: string | null;
  status?: 'pending' | 'approved' | 'denied';
  created_at?: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  child_user_id?: string | null;
  // Add these optional fields for the joined data
  reviewer?: {
    display_name: string;
  } | null;
  child_user?: {
    display_name: string;
    username: string;
  } | null;
}

/**
 * Create a new invitation request
 */
export async function createInvitationRequest(data: Omit<InvitationRequest, 'id' | 'status' | 'created_at'>) {
  try {
    const { data: result, error } = await supabase
      .from('invitation_requests')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating invitation request:', error);
      return { error };
    }

    return { data: result };
  } catch (error) {
    console.error('Exception creating invitation request:', error);
    return { error };
  }
}

/**
 * Get all invitation requests (admin only)
 */
export async function getInvitationRequests(status?: 'pending' | 'approved' | 'denied') {
  try {
    let query = supabase
      .from('invitation_requests')
      .select(`
        *,
        reviewer:profiles!reviewer_id(display_name),
        child_user:profiles!child_user_id(display_name, username)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invitation requests:', error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('Exception fetching invitation requests:', error);
    return { error };
  }
}

/**
 * Update invitation request status (admin only)
 */
export async function updateInvitationRequestStatus(
  id: string, 
  status: 'approved' | 'denied', 
  reviewerId: string
) {
  try {
    const { data, error } = await supabase
      .from('invitation_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewer_id: reviewerId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating invitation request:', error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('Exception updating invitation request:', error);
    return { error };
  }
}

/**
 * Get pending invitation requests count (for admin dashboard)
 */
export async function getPendingInvitationsCount() {
  try {
    const { count, error } = await supabase
      .from('invitation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) {
      console.error('Error getting pending invitations count:', error);
      return { error };
    }

    return { count: count || 0 };
  } catch (error) {
    console.error('Exception getting pending invitations count:', error);
    return { error };
  }
}

/**
 * Check if user is already an author/moderator/admin
 */
export async function findUserByEmail(email: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, display_name, username')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error finding user by email:', error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('Exception finding user by email:', error);
    return { error };
  }
}

/**
 * Upgrade existing user role to author
 */
export async function upgradeUserToAuthor(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role: 'author' })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error upgrading user to author:', error);
      return { error };
    }

    return { data };
  } catch (error) {
    console.error('Exception upgrading user to author:', error);
    return { error };
  }
}
