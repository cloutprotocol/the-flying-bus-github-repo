import { supabase } from '@/integrations/supabase/client';
import { ReaderProfile } from '@/types/ReaderProfile';
import { RoleAuditService } from './roleAuditService';

export interface RoleUpgradeResult {
  success: boolean;
  user?: ReaderProfile;
  error?: string;
}

export interface AccountActivationResult {
  success: boolean;
  user?: ReaderProfile;
  redirectTo?: string;
  error?: string;
}

export interface RoleAssignmentResult {
  success: boolean;
  user?: ReaderProfile;
  error?: string;
  auditLog?: string;
}

export interface RoleValidationContext {
  invitationToken?: string;
  registrationType: 'standard' | 'invitation';
  userId: string;
  email: string;
  invitationId?: string;
  assignedBy?: string;
  reason?: string;
}

/**
 * Grant author role to an existing user
 */
export async function grantAuthorRole(userId: string): Promise<RoleUpgradeResult> {
  try {
    console.log('Granting author role to user:', userId);

    // Update user role to author
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: 'author',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error granting author role:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'User not found' };
    }

    // Transform to ReaderProfile format
    const user: ReaderProfile = {
      id: data.id,
      username: data.username,
      display_name: data.display_name,
      email: data.email,
      role: data.role as 'reader' | 'author' | 'moderator' | 'admin',
      bio: data.bio || '',
      avatar_url: data.avatar_url || '',
      created_at: data.created_at,
      updated_at: data.updated_at,
      public_bio: data.public_bio,
      crypto_wallet_address: data.crypto_wallet_address,
      badge_display_preferences: data.badge_display_preferences,
      favorite_categories: data.favorite_categories,
    };

    console.log('Successfully granted author role to:', user.display_name);
    return { success: true, user };
  } catch (error) {
    console.error('Exception granting author role:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Create a new user account with author role
 */
export async function createAuthorAccount(
  email: string,
  password: string,
  displayName: string,
  username?: string
): Promise<AccountActivationResult> {
  try {
    console.log('Creating new author account for:', email);

    // Generate username if not provided
    const finalUsername = username || generateUsernameFromEmail(email);

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username: finalUsername
        }
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user account' };
    }

    // Create profile with author role
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username: finalUsername,
        display_name: displayName,
        email: email,
        role: 'author',
        avatar_url: '',
        bio: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      return { success: false, error: profileError.message };
    }

    // Transform to ReaderProfile format
    const user: ReaderProfile = {
      id: profileData.id,
      username: profileData.username,
      display_name: profileData.display_name,
      email: profileData.email,
      role: profileData.role as 'reader' | 'author' | 'moderator' | 'admin',
      bio: profileData.bio || '',
      avatar_url: profileData.avatar_url || '',
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      public_bio: profileData.public_bio,
      crypto_wallet_address: profileData.crypto_wallet_address,
      badge_display_preferences: profileData.badge_display_preferences,
      favorite_categories: profileData.favorite_categories,
    };

    console.log('Successfully created author account for:', user.display_name);
    return { 
      success: true, 
      user, 
      redirectTo: '/admin/dashboard' 
    };
  } catch (error) {
    console.error('Exception creating author account:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Activate existing user account by upgrading to author role
 */
export async function activateExistingUserAccount(userId: string): Promise<AccountActivationResult> {
  try {
    console.log('Activating existing user account:', userId);

    const result = await grantAuthorRole(userId);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { 
      success: true, 
      user: result.user, 
      redirectTo: '/admin/dashboard' 
    };
  } catch (error) {
    console.error('Exception activating existing user account:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Check if user has author privileges or higher
 */
export function hasAuthorPrivileges(user: ReaderProfile | null): boolean {
  if (!user) return false;
  return ['author', 'moderator', 'admin'].includes(user.role);
}

/**
 * Check if user has admin privileges
 */
export function hasAdminPrivileges(user: ReaderProfile | null): boolean {
  if (!user) return false;
  return ['admin'].includes(user.role);
}

/**
 * Check if user has moderator privileges or higher
 */
export function hasModeratorPrivileges(user: ReaderProfile | null): boolean {
  if (!user) return false;
  return ['moderator', 'admin'].includes(user.role);
}

/**
 * Generate a username from email address
 */
function generateUsernameFromEmail(email: string): string {
  const localPart = email.split('@')[0];
  const cleanUsername = localPart
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 15);
  
  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${cleanUsername}${randomSuffix}`;
}

/**
 * Validate role transition
 */
export function canUpgradeRole(currentRole: string, targetRole: string): boolean {
  const roleHierarchy = {
    'reader': 0,
    'author': 1,
    'moderator': 2,
    'admin': 3
  };

  const currentLevel = roleHierarchy[currentRole as keyof typeof roleHierarchy] ?? -1;
  const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] ?? -1;

  // Can only upgrade to higher roles
  return targetLevel > currentLevel;
}

/**
 * Assign author role from invitation context with comprehensive error handling and audit logging
 */
export async function assignAuthorRoleFromInvitation(
  userId: string, 
  context: RoleValidationContext
): Promise<RoleAssignmentResult> {
  const maxRetries = 3;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Assigning author role from invitation (attempt ${attempt}/${maxRetries}):`, {
        userId,
        email: context.email,
        registrationType: context.registrationType
      });

      // Validate that this is an invitation-based registration
      if (context.registrationType !== 'invitation') {
        return { 
          success: false, 
          error: 'Role assignment only allowed for invitation-based registrations' 
        };
      }

      // Get current user profile
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        lastError = `Failed to fetch user profile: ${fetchError.message}`;
        console.error('Error fetching user profile:', fetchError);
        if (attempt === maxRetries) {
          return { success: false, error: lastError };
        }
        continue;
      }

      if (!currentProfile) {
        return { success: false, error: 'User profile not found' };
      }

      // Check if role is already author or higher
      if (['author', 'moderator', 'admin'].includes(currentProfile.role)) {
        console.log('User already has author privileges or higher:', currentProfile.role);
        
        // Still log this as a successful assignment for audit purposes
        await auditRoleChange(
          userId,
          currentProfile.role,
          currentProfile.role,
          {
            ...context,
            assignment_method: 'service_level_validation',
            already_had_privileges: true,
            timestamp: new Date().toISOString()
          }
        );

        const user: ReaderProfile = transformProfileToReaderProfile(currentProfile);
        return { success: true, user };
      }

      // Update role to author
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: 'author',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        lastError = `Failed to update user role: ${updateError.message}`;
        console.error('Error updating user role:', updateError);
        if (attempt === maxRetries) {
          return { success: false, error: lastError };
        }
        continue;
      }

      if (!updatedProfile) {
        lastError = 'Failed to retrieve updated profile';
        if (attempt === maxRetries) {
          return { success: false, error: lastError };
        }
        continue;
      }

      // Log successful role assignment
      const auditLogId = await auditRoleChange(
        userId,
        currentProfile.role,
        'author',
        {
          ...context,
          assignment_method: 'service_level',
          attempt_number: attempt,
          timestamp: new Date().toISOString()
        }
      );

      const user: ReaderProfile = transformProfileToReaderProfile(updatedProfile);

      console.log('Successfully assigned author role:', {
        userId,
        email: user.email,
        oldRole: currentProfile.role,
        newRole: user.role,
        auditLogId
      });

      return { 
        success: true, 
        user, 
        auditLog: auditLogId 
      };

    } catch (error) {
      lastError = `Unexpected error on attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Exception in assignAuthorRoleFromInvitation:', error);
      
      if (attempt === maxRetries) {
        // Log the final failure
        await auditRoleChange(
          userId,
          'unknown',
          'author',
          {
            ...context,
            assignment_method: 'service_level_failed',
            error_message: lastError,
            final_attempt: true,
            timestamp: new Date().toISOString()
          }
        );
        
        return { success: false, error: lastError };
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return { success: false, error: lastError || 'Maximum retries exceeded' };
}

/**
 * Validate that user has correct role after registration
 */
export async function validateRoleAssignment(userId: string): Promise<boolean> {
  try {
    console.log('Validating role assignment for user:', userId);

    // Check if user has invitation token
    const { data: invitationToken, error: tokenError } = await supabase
      .from('invitation_tokens')
      .select('*')
      .eq('used_by', userId)
      .not('used_at', 'is', null)
      .single();

    if (tokenError && tokenError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking invitation token:', tokenError);
      return false;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return false;
    }

    // If user has invitation token, they should have author role
    if (invitationToken && profile.role !== 'author') {
      console.warn('Role validation failed: User has invitation token but not author role', {
        userId,
        currentRole: profile.role,
        expectedRole: 'author'
      });
      return false;
    }

    // If user has no invitation token, they should have reader role (unless manually upgraded)
    if (!invitationToken && profile.role === 'author') {
      // This might be a manually upgraded user, which is valid
      console.log('User has author role without invitation token (possibly manual upgrade):', userId);
    }

    console.log('Role validation passed:', {
      userId,
      hasInvitationToken: !!invitationToken,
      currentRole: profile.role
    });

    return true;
  } catch (error) {
    console.error('Exception in validateRoleAssignment:', error);
    return false;
  }
}

/**
 * Detect and fix users with incorrect roles
 */
export async function detectAndFixIncorrectRoles(): Promise<{
  fixed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let fixed = 0;

  try {
    console.log('Starting detection and fix of incorrect roles...');

    // Find users who have invitation tokens but reader role
    const { data: usersToFix, error: queryError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        invitation_tokens!invitation_tokens_used_by_fkey (
          id,
          used_at
        )
      `)
      .eq('role', 'reader')
      .not('invitation_tokens.used_at', 'is', null);

    if (queryError) {
      errors.push(`Failed to query users: ${queryError.message}`);
      return { fixed, errors };
    }

    if (!usersToFix || usersToFix.length === 0) {
      console.log('No users found with incorrect roles');
      return { fixed, errors };
    }

    console.log(`Found ${usersToFix.length} users with potentially incorrect roles`);

    // Fix each user
    for (const user of usersToFix) {
      try {
        const context: RoleValidationContext = {
          registrationType: 'invitation',
          userId: user.id,
          email: user.email,
          reason: 'automated_role_correction'
        };

        const result = await assignAuthorRoleFromInvitation(user.id, context);
        
        if (result.success) {
          fixed++;
          console.log(`Fixed role for user: ${user.email}`);
        } else {
          errors.push(`Failed to fix role for ${user.email}: ${result.error}`);
        }
      } catch (error) {
        const errorMsg = `Exception fixing role for ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`Role correction completed: ${fixed} fixed, ${errors.length} errors`);
    return { fixed, errors };

  } catch (error) {
    const errorMsg = `Exception in detectAndFixIncorrectRoles: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error(errorMsg);
    return { fixed, errors };
  }
}

/**
 * Create admin utility to manually assign roles when automatic assignment fails
 */
export async function manuallyAssignRole(
  userId: string,
  targetRole: 'reader' | 'author' | 'moderator' | 'admin',
  adminUserId: string,
  reason: string
): Promise<RoleAssignmentResult> {
  try {
    console.log('Manual role assignment:', {
      userId,
      targetRole,
      adminUserId,
      reason
    });

    // Verify admin has permission to assign roles
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminUserId)
      .single();

    if (adminError || !adminProfile) {
      return { success: false, error: 'Admin user not found' };
    }

    if (!['admin', 'moderator'].includes(adminProfile.role)) {
      return { success: false, error: 'Insufficient permissions to assign roles' };
    }

    // Get current user profile
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !currentProfile) {
      return { success: false, error: 'Target user not found' };
    }

    // Update role
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        role: targetRole,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError || !updatedProfile) {
      return { success: false, error: 'Failed to update user role' };
    }

    // Log manual role assignment
    const auditLogId = await auditRoleChange(
      userId,
      currentProfile.role,
      targetRole,
      {
        registrationType: 'standard',
        userId,
        email: currentProfile.email,
        assignment_method: 'manual_admin',
        assignedBy: adminUserId,
        reason,
        timestamp: new Date().toISOString()
      }
    );

    const user: ReaderProfile = transformProfileToReaderProfile(updatedProfile);

    console.log('Successfully assigned role manually:', {
      userId,
      oldRole: currentProfile.role,
      newRole: targetRole,
      adminUserId,
      auditLogId
    });

    return { 
      success: true, 
      user, 
      auditLog: auditLogId 
    };

  } catch (error) {
    console.error('Exception in manuallyAssignRole:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Audit role changes with comprehensive logging using the enhanced audit service
 */
async function auditRoleChange(
  userId: string,
  fromRole: string,
  toRole: string,
  context: any
): Promise<string | null> {
  try {
    await RoleAuditService.logRoleChange({
      userId,
      userEmail: context.email,
      oldRole: fromRole,
      newRole: toRole,
      changedBy: context.assignedBy,
      reason: context.reason || 'Role assignment',
      context: {
        assignment_method: context.assignment_method || 'service_level',
        invitation_based: context.registrationType === 'invitation',
        invitation_id: context.invitationId,
        invitation_token: context.invitationToken,
        attempt_number: context.attempt_number,
        timestamp: context.timestamp || new Date().toISOString()
      }
    });

    return 'logged'; // Return success indicator
  } catch (error) {
    console.error('Exception creating audit log:', error);
    return null;
  }
}

/**
 * Transform database profile to ReaderProfile format
 */
function transformProfileToReaderProfile(profile: any): ReaderProfile {
  return {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    email: profile.email,
    role: profile.role as 'reader' | 'author' | 'moderator' | 'admin',
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || '',
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    public_bio: profile.public_bio,
    crypto_wallet_address: profile.crypto_wallet_address,
    badge_display_preferences: profile.badge_display_preferences,
    favorite_categories: profile.favorite_categories,
  };
}

/**
 * Get redirect URL based on user role
 */
export function getRedirectUrlForRole(role: string): string {
  switch (role) {
    case 'admin':
    case 'moderator':
    case 'author':
      return '/admin/dashboard';
    case 'reader':
    default:
      return '/';
  }
}