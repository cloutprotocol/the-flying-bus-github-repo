import { ReaderProfile } from '@/types/ReaderProfile';
import { RoleAuditService } from './roleAuditService';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

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
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    await convex.mutation(api.profiles.updateRole, { id: userId as unknown as Id<'profiles'>, role: 'author' });
    const data: any = await convex.query(api.profiles.getById, { profileId: userId as unknown as Id<'profiles'> });
    if (!data) return { success: false, error: 'User not found' };
    const user: ReaderProfile = {
      id: data._id,
      username: data.username,
      display_name: data.display_name,
      email: data.email,
      role: data.role as any,
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
    console.log('Creating author account is managed via Convex Auth. Use Auth UI.');
    return { success: false, error: 'Not implemented. Use Convex Auth sign up.' };
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

      const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
      const currentProfile: any = await convex.query(api.profiles.getById, { profileId: userId as unknown as Id<'profiles'> });
      if (!currentProfile) return { success: false, error: 'User profile not found' };

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

      await convex.mutation(api.profiles.updateRole, { id: userId as unknown as Id<'profiles'>, role: 'author' });
      const updatedProfile: any = await convex.query(api.profiles.getById, { profileId: userId as unknown as Id<'profiles'> });

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
    const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);
    const adminProfile: any = await convex.query(api.profiles.getById, { profileId: adminUserId as unknown as Id<'profiles'> });
    if (!adminProfile) return { success: false, error: 'Admin user not found' };

    if (!['admin', 'moderator'].includes(adminProfile.role)) {
      return { success: false, error: 'Insufficient permissions to assign roles' };
    }

    // Get current user profile
    const currentProfile: any = await convex.query(api.profiles.getById, { profileId: userId as unknown as Id<'profiles'> });
    if (!currentProfile) return { success: false, error: 'Target user not found' };

    // Update role
    await convex.mutation(api.profiles.updateRole, { id: userId as unknown as Id<'profiles'>, role: targetRole });
    const updatedProfile: any = await convex.query(api.profiles.getById, { profileId: userId as unknown as Id<'profiles'> });

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
