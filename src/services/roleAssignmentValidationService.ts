import { supabase } from '@/integrations/supabase/client';
import { ReaderProfile } from '@/types/ReaderProfile';
import { 
  assignAuthorRoleFromInvitation, 
  validateRoleAssignment,
  manuallyAssignRole,
  detectAndFixIncorrectRoles,
  RoleValidationContext 
} from './roleService';

/**
 * Role Assignment Validation Service
 * 
 * Provides utilities for validating, detecting, and fixing role assignments.
 * Includes admin utilities for manual role management.
 */

export interface RoleValidationReport {
  userId: string;
  email: string;
  currentRole: string;
  expectedRole: string;
  hasInvitationToken: boolean;
  isValid: boolean;
  issues: string[];
}

export interface RoleFixResult {
  userId: string;
  email: string;
  success: boolean;
  oldRole: string;
  newRole: string;
  error?: string;
  auditLogId?: string;
}

export interface BulkRoleValidationResult {
  totalUsers: number;
  validUsers: number;
  invalidUsers: number;
  reports: RoleValidationReport[];
  summary: {
    usersWithInvitationTokensButReaderRole: number;
    usersWithAuthorRoleButNoInvitationToken: number;
    orphanedInvitationTokens: number;
  };
}

export interface BulkRoleFixResult {
  totalProcessed: number;
  successfulFixes: number;
  failedFixes: number;
  results: RoleFixResult[];
  errors: string[];
}

/**
 * Validate that a specific user has the correct role after registration
 */
export async function validateUserRoleAssignment(userId: string): Promise<RoleValidationReport> {
  try {
    console.log('Validating role assignment for user:', userId);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return {
        userId,
        email: 'unknown',
        currentRole: 'unknown',
        expectedRole: 'unknown',
        hasInvitationToken: false,
        isValid: false,
        issues: ['User profile not found']
      };
    }

    // Check for invitation token
    const { data: invitationToken, error: tokenError } = await supabase
      .from('invitation_tokens')
      .select('*')
      .eq('used_by', userId)
      .not('used_at', 'is', null)
      .single();

    const hasInvitationToken = !tokenError && !!invitationToken;
    const issues: string[] = [];
    let expectedRole = 'reader';
    let isValid = true;

    // Determine expected role and validate
    if (hasInvitationToken) {
      expectedRole = 'author';
      if (profile.role !== 'author') {
        issues.push('User has invitation token but does not have author role');
        isValid = false;
      }
    } else {
      // User without invitation token
      if (profile.role === 'author') {
        // This could be a manually upgraded user, which is valid
        // But we should note it for review
        issues.push('User has author role without invitation token (possibly manual upgrade)');
        expectedRole = 'author'; // Accept current state
      }
    }

    // Additional validation checks
    if (profile.role && !['reader', 'author', 'moderator', 'admin'].includes(profile.role)) {
      issues.push(`Invalid role: ${profile.role}`);
      isValid = false;
    }

    return {
      userId,
      email: profile.email,
      currentRole: profile.role,
      expectedRole,
      hasInvitationToken,
      isValid,
      issues
    };

  } catch (error) {
    console.error('Exception in validateUserRoleAssignment:', error);
    return {
      userId,
      email: 'unknown',
      currentRole: 'unknown',
      expectedRole: 'unknown',
      hasInvitationToken: false,
      isValid: false,
      issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Detect users with incorrect roles across the entire system
 */
export async function detectUsersWithIncorrectRoles(): Promise<BulkRoleValidationResult> {
  try {
    console.log('Starting bulk role validation...');

    // Get all users with their invitation tokens
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        created_at,
        invitation_tokens!invitation_tokens_used_by_fkey (
          id,
          used_at,
          created_at
        )
      `);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return {
        totalUsers: 0,
        validUsers: 0,
        invalidUsers: 0,
        reports: [],
        summary: {
          usersWithInvitationTokensButReaderRole: 0,
          usersWithAuthorRoleButNoInvitationToken: 0,
          orphanedInvitationTokens: 0
        }
      };
    }

    const reports: RoleValidationReport[] = [];
    let validUsers = 0;
    let invalidUsers = 0;
    let usersWithInvitationTokensButReaderRole = 0;
    let usersWithAuthorRoleButNoInvitationToken = 0;

    // Validate each user
    for (const user of users) {
      const hasInvitationToken = user.invitation_tokens && 
                                user.invitation_tokens.length > 0 && 
                                user.invitation_tokens.some((token: any) => token.used_at);

      const issues: string[] = [];
      let expectedRole = 'reader';
      let isValid = true;

      if (hasInvitationToken) {
        expectedRole = 'author';
        if (user.role !== 'author') {
          issues.push('Has invitation token but not author role');
          isValid = false;
          usersWithInvitationTokensButReaderRole++;
        }
      } else if (user.role === 'author') {
        issues.push('Has author role without invitation token (manual upgrade?)');
        expectedRole = 'author'; // Accept current state
        usersWithAuthorRoleButNoInvitationToken++;
      }

      if (isValid) {
        validUsers++;
      } else {
        invalidUsers++;
      }

      reports.push({
        userId: user.id,
        email: user.email,
        currentRole: user.role,
        expectedRole,
        hasInvitationToken,
        isValid,
        issues
      });
    }

    // Check for orphaned invitation tokens
    const { data: orphanedTokens, error: orphanedError } = await supabase
      .from('invitation_tokens')
      .select('id')
      .not('used_at', 'is', null)
      .is('used_by', null);

    const orphanedInvitationTokens = orphanedError ? 0 : (orphanedTokens?.length || 0);

    console.log('Bulk role validation completed:', {
      totalUsers: users.length,
      validUsers,
      invalidUsers,
      orphanedTokens: orphanedInvitationTokens
    });

    return {
      totalUsers: users.length,
      validUsers,
      invalidUsers,
      reports,
      summary: {
        usersWithInvitationTokensButReaderRole,
        usersWithAuthorRoleButNoInvitationToken,
        orphanedInvitationTokens
      }
    };

  } catch (error) {
    console.error('Exception in detectUsersWithIncorrectRoles:', error);
    throw error;
  }
}

/**
 * Fix users with incorrect roles
 */
export async function fixUsersWithIncorrectRoles(
  userIds?: string[],
  adminUserId?: string
): Promise<BulkRoleFixResult> {
  try {
    console.log('Starting bulk role fix...', { userIds, adminUserId });

    let usersToFix: RoleValidationReport[] = [];

    if (userIds && userIds.length > 0) {
      // Fix specific users
      for (const userId of userIds) {
        const report = await validateUserRoleAssignment(userId);
        if (!report.isValid) {
          usersToFix.push(report);
        }
      }
    } else {
      // Fix all users with incorrect roles
      const validation = await detectUsersWithIncorrectRoles();
      usersToFix = validation.reports.filter(report => !report.isValid);
    }

    if (usersToFix.length === 0) {
      console.log('No users found with incorrect roles');
      return {
        totalProcessed: 0,
        successfulFixes: 0,
        failedFixes: 0,
        results: [],
        errors: []
      };
    }

    const results: RoleFixResult[] = [];
    const errors: string[] = [];
    let successfulFixes = 0;
    let failedFixes = 0;

    for (const user of usersToFix) {
      try {
        let fixResult: any;

        if (user.hasInvitationToken && user.currentRole !== 'author') {
          // Use invitation-based role assignment
          const context: RoleValidationContext = {
            registrationType: 'invitation',
            userId: user.userId,
            email: user.email,
            reason: 'bulk_role_correction'
          };

          fixResult = await assignAuthorRoleFromInvitation(user.userId, context);
        } else if (adminUserId) {
          // Use manual role assignment
          fixResult = await manuallyAssignRole(
            user.userId,
            user.expectedRole as 'reader' | 'author' | 'moderator' | 'admin',
            adminUserId,
            'bulk_role_correction'
          );
        } else {
          throw new Error('Admin user ID required for manual role assignment');
        }

        if (fixResult.success) {
          successfulFixes++;
          results.push({
            userId: user.userId,
            email: user.email,
            success: true,
            oldRole: user.currentRole,
            newRole: fixResult.user?.role || user.expectedRole,
            auditLogId: fixResult.auditLog
          });
        } else {
          failedFixes++;
          results.push({
            userId: user.userId,
            email: user.email,
            success: false,
            oldRole: user.currentRole,
            newRole: user.currentRole,
            error: fixResult.error
          });
          errors.push(`Failed to fix ${user.email}: ${fixResult.error}`);
        }

      } catch (error) {
        failedFixes++;
        const errorMsg = `Exception fixing ${user.email}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        results.push({
          userId: user.userId,
          email: user.email,
          success: false,
          oldRole: user.currentRole,
          newRole: user.currentRole,
          error: errorMsg
        });
      }
    }

    console.log('Bulk role fix completed:', {
      totalProcessed: usersToFix.length,
      successfulFixes,
      failedFixes
    });

    return {
      totalProcessed: usersToFix.length,
      successfulFixes,
      failedFixes,
      results,
      errors
    };

  } catch (error) {
    console.error('Exception in fixUsersWithIncorrectRoles:', error);
    throw error;
  }
}

/**
 * Admin utility to manually assign role when automatic assignment fails
 */
export async function adminManualRoleAssignment(
  userId: string,
  targetRole: 'reader' | 'author' | 'moderator' | 'admin',
  adminUserId: string,
  reason: string
): Promise<RoleFixResult> {
  try {
    console.log('Admin manual role assignment:', {
      userId,
      targetRole,
      adminUserId,
      reason
    });

    // Get current user info
    const { data: currentProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    if (fetchError || !currentProfile) {
      return {
        userId,
        email: 'unknown',
        success: false,
        oldRole: 'unknown',
        newRole: targetRole,
        error: 'User not found'
      };
    }

    const result = await manuallyAssignRole(userId, targetRole, adminUserId, reason);

    return {
      userId,
      email: currentProfile.email,
      success: result.success,
      oldRole: currentProfile.role,
      newRole: result.success ? targetRole : currentProfile.role,
      error: result.error,
      auditLogId: result.auditLog
    };

  } catch (error) {
    console.error('Exception in adminManualRoleAssignment:', error);
    return {
      userId,
      email: 'unknown',
      success: false,
      oldRole: 'unknown',
      newRole: targetRole,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate role assignment health report
 */
export async function generateRoleAssignmentHealthReport(): Promise<{
  summary: {
    totalUsers: number;
    totalInvitationTokens: number;
    usersWithCorrectRoles: number;
    usersWithIncorrectRoles: number;
    orphanedTokens: number;
  };
  issues: {
    type: string;
    count: number;
    description: string;
  }[];
  recommendations: string[];
}> {
  try {
    console.log('Generating role assignment health report...');

    const validation = await detectUsersWithIncorrectRoles();
    
    // Get total invitation tokens
    const { data: allTokens, error: tokensError } = await supabase
      .from('invitation_tokens')
      .select('id, used_at, used_by');

    const totalInvitationTokens = tokensError ? 0 : (allTokens?.length || 0);

    const issues = [
      {
        type: 'invitation_token_reader_role',
        count: validation.summary.usersWithInvitationTokensButReaderRole,
        description: 'Users with invitation tokens but reader role'
      },
      {
        type: 'author_role_no_token',
        count: validation.summary.usersWithAuthorRoleButNoInvitationToken,
        description: 'Users with author role but no invitation token'
      },
      {
        type: 'orphaned_tokens',
        count: validation.summary.orphanedInvitationTokens,
        description: 'Invitation tokens marked as used but not linked to users'
      }
    ].filter(issue => issue.count > 0);

    const recommendations: string[] = [];
    
    if (validation.summary.usersWithInvitationTokensButReaderRole > 0) {
      recommendations.push('Run bulk role fix to assign author roles to users with invitation tokens');
    }
    
    if (validation.summary.usersWithAuthorRoleButNoInvitationToken > 0) {
      recommendations.push('Review users with author role but no invitation token - may be manual upgrades');
    }
    
    if (validation.summary.orphanedInvitationTokens > 0) {
      recommendations.push('Clean up orphaned invitation tokens');
    }

    if (issues.length === 0) {
      recommendations.push('Role assignments are healthy - no issues detected');
    }

    return {
      summary: {
        totalUsers: validation.totalUsers,
        totalInvitationTokens,
        usersWithCorrectRoles: validation.validUsers,
        usersWithIncorrectRoles: validation.invalidUsers,
        orphanedTokens: validation.summary.orphanedInvitationTokens
      },
      issues,
      recommendations
    };

  } catch (error) {
    console.error('Exception in generateRoleAssignmentHealthReport:', error);
    throw error;
  }
}