/**
 * Role Consistency Service
 * 
 * Provides utilities to detect users with incorrect roles, automated role validation,
 * and admin tools to manually fix role inconsistencies.
 * Implements requirements 4.1, 4.2, 4.3.
 */

import { supabase } from '@/integrations/supabase/client';
import { RoleAuditService } from './roleAuditService';

export interface RoleInconsistency {
  userId: string;
  userEmail: string;
  currentRole: string;
  expectedRole: string;
  reason: string;
  invitationId?: string;
  registrationDate: string;
  severity: 'low' | 'medium' | 'high';
}

export interface RoleValidationResult {
  isValid: boolean;
  inconsistencies: RoleInconsistency[];
  totalUsers: number;
  validUsers: number;
  invalidUsers: number;
  lastValidationDate: string;
}

export interface RoleFixResult {
  userId: string;
  userEmail: string;
  oldRole: string;
  newRole: string;
  success: boolean;
  error?: string;
}

export interface RoleConsistencyReport {
  summary: {
    totalUsers: number;
    usersWithCorrectRoles: number;
    usersWithIncorrectRoles: number;
    consistencyPercentage: number;
  };
  inconsistencies: RoleInconsistency[];
  recommendations: string[];
  lastChecked: string;
}

export class RoleConsistencyService {
  /**
   * Detect users with incorrect roles based on invitation history
   */
  static async detectIncorrectRoles(): Promise<RoleInconsistency[]> {
    try {
      console.log('Starting role consistency check...');

      // Query users with their invitation status
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          role,
          created_at,
          invitation_tokens!invitation_tokens_used_by_fkey (
            id,
            used_at,
            invitation_request_id,
            invitation_requests!invitation_tokens_invitation_request_id_fkey (
              id,
              status
            )
          )
        `)
        .neq('role', 'admin'); // Don't check admin users

      if (error) {
        console.error('Error querying users for role consistency:', error);
        throw new Error(`Failed to query users: ${error.message}`);
      }

      const inconsistencies: RoleInconsistency[] = [];

      for (const user of users || []) {
        const inconsistency = await this.analyzeUserRoleConsistency(user);
        if (inconsistency) {
          inconsistencies.push(inconsistency);
        }
      }

      console.log(`Found ${inconsistencies.length} role inconsistencies`);
      return inconsistencies;
    } catch (error) {
      console.error('Error detecting incorrect roles:', error);
      throw error;
    }
  }

  /**
   * Analyze a single user's role consistency
   */
  private static async analyzeUserRoleConsistency(user: any): Promise<RoleInconsistency | null> {
    try {
      const hasUsedInvitation = user.invitation_tokens?.some((token: any) => 
        token.used_at && token.invitation_requests?.status === 'approved'
      );

      // Case 1: User has used invitation but doesn't have author role
      if (hasUsedInvitation && user.role === 'reader') {
        return {
          userId: user.id,
          userEmail: user.email,
          currentRole: user.role,
          expectedRole: 'author',
          reason: 'User completed invitation registration but has reader role',
          invitationId: user.invitation_tokens[0]?.id,
          registrationDate: user.created_at,
          severity: 'high'
        };
      }

      // Case 2: User has author role but no invitation (might be manual upgrade - check audit logs)
      if (user.role === 'author' && !hasUsedInvitation) {
        // Check if this was a manual role assignment
        const auditLogs = await RoleAuditService.getUserRoleHistory(user.id);
        const hasManualAssignment = auditLogs.some(log => 
          log.metadata?.assignment_method === 'manual_admin'
        );

        if (!hasManualAssignment) {
          return {
            userId: user.id,
            userEmail: user.email,
            currentRole: user.role,
            expectedRole: 'reader',
            reason: 'User has author role without invitation or manual assignment',
            registrationDate: user.created_at,
            severity: 'medium'
          };
        }
      }

      // Case 3: User has moderator role without proper authorization (check audit logs)
      if (user.role === 'moderator') {
        const auditLogs = await RoleAuditService.getUserRoleHistory(user.id);
        const hasValidAssignment = auditLogs.some(log => 
          log.metadata?.assignment_method === 'manual_admin' &&
          log.metadata?.assigned_by
        );

        if (!hasValidAssignment) {
          return {
            userId: user.id,
            userEmail: user.email,
            currentRole: user.role,
            expectedRole: 'reader',
            reason: 'User has moderator role without proper admin assignment',
            registrationDate: user.created_at,
            severity: 'high'
          };
        }
      }

      return null;
    } catch (error) {
      console.error(`Error analyzing user ${user.id}:`, error);
      return null;
    }
  }

  /**
   * Run automated role validation
   */
  static async validateRoleConsistency(): Promise<RoleValidationResult> {
    try {
      console.log('Running automated role validation...');

      const inconsistencies = await this.detectIncorrectRoles();
      
      // Get total user count
      const { count: totalUsers, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('role', 'admin');

      if (countError) {
        console.error('Error counting users:', countError);
        throw new Error(`Failed to count users: ${countError.message}`);
      }

      const invalidUsers = inconsistencies.length;
      const validUsers = (totalUsers || 0) - invalidUsers;

      const result: RoleValidationResult = {
        isValid: invalidUsers === 0,
        inconsistencies,
        totalUsers: totalUsers || 0,
        validUsers,
        invalidUsers,
        lastValidationDate: new Date().toISOString()
      };

      // Log validation results
      await RoleAuditService.logEvent(
        'role_validation_completed',
        'system',
        'role_consistency_check',
        true,
        {
          total_users: totalUsers,
          valid_users: validUsers,
          invalid_users: invalidUsers,
          inconsistencies_found: inconsistencies.length,
          validation_date: result.lastValidationDate
        }
      );

      console.log('Role validation completed:', {
        totalUsers,
        validUsers,
        invalidUsers,
        isValid: result.isValid
      });

      return result;
    } catch (error) {
      console.error('Error in role validation:', error);
      
      // Log validation failure
      await RoleAuditService.logEvent(
        'role_validation_failed',
        'system',
        'role_consistency_check',
        false,
        {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          validation_date: new Date().toISOString()
        }
      );

      throw error;
    }
  }

  /**
   * Fix a single user's role inconsistency
   */
  static async fixUserRole(
    userId: string,
    expectedRole: string,
    adminUserId: string,
    reason: string
  ): Promise<RoleFixResult> {
    try {
      console.log(`Fixing role for user ${userId} to ${expectedRole}`);

      // Get current user profile
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError || !currentProfile) {
        return {
          userId,
          userEmail: 'unknown',
          oldRole: 'unknown',
          newRole: expectedRole,
          success: false,
          error: 'User not found'
        };
      }

      // Update role
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ 
          role: expectedRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError || !updatedProfile) {
        return {
          userId,
          userEmail: currentProfile.email,
          oldRole: currentProfile.role,
          newRole: expectedRole,
          success: false,
          error: updateError?.message || 'Failed to update role'
        };
      }

      // Log the role fix
      await RoleAuditService.logRoleChange({
        userId,
        userEmail: currentProfile.email,
        oldRole: currentProfile.role,
        newRole: expectedRole,
        changedBy: adminUserId,
        reason: `Role consistency fix: ${reason}`,
        context: {
          fix_type: 'consistency_repair',
          automated: false,
          timestamp: new Date().toISOString()
        }
      });

      return {
        userId,
        userEmail: currentProfile.email,
        oldRole: currentProfile.role,
        newRole: expectedRole,
        success: true
      };
    } catch (error) {
      console.error(`Error fixing role for user ${userId}:`, error);
      return {
        userId,
        userEmail: 'unknown',
        oldRole: 'unknown',
        newRole: expectedRole,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Fix multiple role inconsistencies
   */
  static async fixMultipleRoles(
    inconsistencies: RoleInconsistency[],
    adminUserId: string
  ): Promise<RoleFixResult[]> {
    const results: RoleFixResult[] = [];

    for (const inconsistency of inconsistencies) {
      const result = await this.fixUserRole(
        inconsistency.userId,
        inconsistency.expectedRole,
        adminUserId,
        inconsistency.reason
      );
      results.push(result);

      // Add small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Generate comprehensive role consistency report
   */
  static async generateConsistencyReport(): Promise<RoleConsistencyReport> {
    try {
      console.log('Generating role consistency report...');

      const validationResult = await this.validateRoleConsistency();
      
      const recommendations: string[] = [];

      // Generate recommendations based on inconsistencies
      const highSeverityCount = validationResult.inconsistencies.filter(i => i.severity === 'high').length;
      const mediumSeverityCount = validationResult.inconsistencies.filter(i => i.severity === 'medium').length;

      if (highSeverityCount > 0) {
        recommendations.push(`Fix ${highSeverityCount} high-severity role inconsistencies immediately`);
      }

      if (mediumSeverityCount > 0) {
        recommendations.push(`Review ${mediumSeverityCount} medium-severity role inconsistencies`);
      }

      if (validationResult.invalidUsers === 0) {
        recommendations.push('All user roles are consistent - no action needed');
      } else {
        recommendations.push('Consider running automated role fixes for detected inconsistencies');
        recommendations.push('Review invitation registration process to prevent future inconsistencies');
      }

      const report: RoleConsistencyReport = {
        summary: {
          totalUsers: validationResult.totalUsers,
          usersWithCorrectRoles: validationResult.validUsers,
          usersWithIncorrectRoles: validationResult.invalidUsers,
          consistencyPercentage: validationResult.totalUsers > 0 
            ? Math.round((validationResult.validUsers / validationResult.totalUsers) * 100)
            : 100
        },
        inconsistencies: validationResult.inconsistencies,
        recommendations,
        lastChecked: validationResult.lastValidationDate
      };

      // Log report generation
      await RoleAuditService.logEvent(
        'consistency_report_generated',
        'system',
        'role_consistency_report',
        true,
        {
          total_users: report.summary.totalUsers,
          consistency_percentage: report.summary.consistencyPercentage,
          inconsistencies_count: report.inconsistencies.length,
          report_date: report.lastChecked
        }
      );

      console.log('Role consistency report generated:', report.summary);
      return report;
    } catch (error) {
      console.error('Error generating consistency report:', error);
      throw error;
    }
  }

  /**
   * Schedule periodic role validation (to be called by a cron job or similar)
   */
  static async schedulePeriodicValidation(): Promise<void> {
    try {
      console.log('Running scheduled role validation...');

      const validationResult = await this.validateRoleConsistency();

      // If there are high-severity inconsistencies, log an alert
      const highSeverityIssues = validationResult.inconsistencies.filter(i => i.severity === 'high');
      
      if (highSeverityIssues.length > 0) {
        await RoleAuditService.logEvent(
          'role_inconsistency_alert',
          'system',
          'scheduled_validation',
          false,
          {
            high_severity_count: highSeverityIssues.length,
            total_inconsistencies: validationResult.inconsistencies.length,
            alert_level: 'high',
            requires_attention: true,
            validation_date: new Date().toISOString()
          }
        );

        console.warn(`ALERT: ${highSeverityIssues.length} high-severity role inconsistencies detected`);
      }

      console.log('Scheduled role validation completed');
    } catch (error) {
      console.error('Error in scheduled role validation:', error);
      
      await RoleAuditService.logEvent(
        'scheduled_validation_failed',
        'system',
        'scheduled_validation',
        false,
        {
          error_message: error instanceof Error ? error.message : 'Unknown error',
          validation_date: new Date().toISOString()
        }
      );
    }
  }

  /**
   * Get role assignment statistics
   */
  static async getRoleStatistics() {
    try {
      const { data: roleStats, error } = await supabase
        .from('profiles')
        .select('role')
        .neq('role', 'admin');

      if (error) {
        throw new Error(`Failed to get role statistics: ${error.message}`);
      }

      const stats = {
        total: roleStats?.length || 0,
        reader: roleStats?.filter(u => u.role === 'reader').length || 0,
        author: roleStats?.filter(u => u.role === 'author').length || 0,
        moderator: roleStats?.filter(u => u.role === 'moderator').length || 0,
        lastUpdated: new Date().toISOString()
      };

      return stats;
    } catch (error) {
      console.error('Error getting role statistics:', error);
      throw error;
    }
  }
}

export default RoleConsistencyService;