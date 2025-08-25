import { supabase } from '@/integrations/supabase/client'
import { tokenService } from './tokenService'

export interface CleanupResult {
  success: boolean;
  deletedCount?: number;
  error?: string;
}

export interface CleanupStats {
  totalTokens: number;
  expiredTokens: number;
  usedTokens: number;
  activeTokens: number;
}

class TokenCleanupService {
  /**
   * Clean up expired tokens from the database
   */
  async cleanupExpiredTokens(): Promise<CleanupResult> {
    try {
      // Use the token service to call the cleanup function
      const result = await tokenService.cleanupExpiredTokens()
      
      if (!result.success) {
        return { success: false, error: result.error }
      }

      // Extract deleted count from message if available
      const deletedCount = this.extractDeletedCount(result.message || '')
      
      return { 
        success: true, 
        deletedCount 
      }
    } catch (error) {
      console.error('Token cleanup error:', error)
      return { 
        success: false, 
        error: 'Failed to cleanup expired tokens' 
      }
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{ success: boolean; stats?: CleanupStats; error?: string }> {
    try {
      const now = new Date().toISOString()

      // Get total tokens
      const { count: totalTokens, error: totalError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })

      if (totalError) throw totalError

      // Get expired tokens (not used and expired)
      const { count: expiredTokens, error: expiredError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .is('used_at', null)
        .lt('expires_at', now)

      if (expiredError) throw expiredError

      // Get used tokens
      const { count: usedTokens, error: usedError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .not('used_at', 'is', null)

      if (usedError) throw usedError

      // Calculate active tokens
      const activeTokens = (totalTokens || 0) - (expiredTokens || 0) - (usedTokens || 0)

      return {
        success: true,
        stats: {
          totalTokens: totalTokens || 0,
          expiredTokens: expiredTokens || 0,
          usedTokens: usedTokens || 0,
          activeTokens: Math.max(0, activeTokens)
        }
      }
    } catch (error) {
      console.error('Get cleanup stats error:', error)
      return { 
        success: false, 
        error: 'Failed to get cleanup statistics' 
      }
    }
  }

  /**
   * Get tokens that are about to expire (within specified hours)
   */
  async getTokensExpiringWithin(hours: number = 24): Promise<{
    success: boolean;
    tokens?: Array<{
      id: string;
      email: string;
      expires_at: string;
      invitation_id: string;
    }>;
    error?: string;
  }> {
    try {
      const expirationThreshold = new Date()
      expirationThreshold.setHours(expirationThreshold.getHours() + hours)

      const { data: tokens, error } = await supabase
        .from('invitation_tokens')
        .select('id, email, expires_at, invitation_id')
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .lt('expires_at', expirationThreshold.toISOString())
        .order('expires_at', { ascending: true })

      if (error) throw error

      return {
        success: true,
        tokens: tokens || []
      }
    } catch (error) {
      console.error('Get expiring tokens error:', error)
      return {
        success: false,
        error: 'Failed to get expiring tokens'
      }
    }
  }

  /**
   * Schedule automatic cleanup (for admin use)
   * This would typically be called by a cron job or scheduled task
   */
  async scheduleCleanup(): Promise<CleanupResult> {
    try {
      // Get stats before cleanup
      const statsBefore = await this.getCleanupStats()
      
      if (!statsBefore.success || !statsBefore.stats) {
        return { success: false, error: 'Failed to get pre-cleanup statistics' }
      }

      // Only proceed if there are expired tokens to clean up
      if (statsBefore.stats.expiredTokens === 0) {
        return { 
          success: true, 
          deletedCount: 0 
        }
      }

      // Perform cleanup
      const cleanupResult = await this.cleanupExpiredTokens()
      
      if (!cleanupResult.success) {
        return cleanupResult
      }

      // Log cleanup activity
      console.log(`Token cleanup completed: ${cleanupResult.deletedCount} tokens removed`)
      
      return cleanupResult
    } catch (error) {
      console.error('Schedule cleanup error:', error)
      return { 
        success: false, 
        error: 'Failed to schedule cleanup' 
      }
    }
  }

  /**
   * Validate token expiration times and identify issues
   */
  async validateTokenIntegrity(): Promise<{
    success: boolean;
    issues?: Array<{
      type: 'expired_unused' | 'invalid_expiration' | 'orphaned_token';
      count: number;
      description: string;
    }>;
    error?: string;
  }> {
    try {
      const now = new Date().toISOString()
      const issues = []

      // Check for expired but unused tokens
      const { count: expiredUnused, error: expiredError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .is('used_at', null)
        .lt('expires_at', now)

      if (expiredError) throw expiredError

      if (expiredUnused && expiredUnused > 0) {
        issues.push({
          type: 'expired_unused' as const,
          count: expiredUnused,
          description: `${expiredUnused} tokens have expired but are still in the database`
        })
      }

      // Check for tokens with invalid expiration times (more than 30 days in the future)
      const maxValidExpiration = new Date()
      maxValidExpiration.setDate(maxValidExpiration.getDate() + 30)

      const { count: invalidExpiration, error: invalidError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .gt('expires_at', maxValidExpiration.toISOString())

      if (invalidError) throw invalidError

      if (invalidExpiration && invalidExpiration > 0) {
        issues.push({
          type: 'invalid_expiration' as const,
          count: invalidExpiration,
          description: `${invalidExpiration} tokens have expiration dates more than 30 days in the future`
        })
      }

      // Check for orphaned tokens (tokens without valid invitation requests)
      const { count: orphanedTokens, error: orphanedError } = await supabase
        .from('invitation_tokens')
        .select('*', { count: 'exact', head: true })
        .not('invitation_id', 'in', 
          supabase
            .from('invitation_requests')
            .select('id')
        )

      if (orphanedError) throw orphanedError

      if (orphanedTokens && orphanedTokens > 0) {
        issues.push({
          type: 'orphaned_token' as const,
          count: orphanedTokens,
          description: `${orphanedTokens} tokens reference non-existent invitation requests`
        })
      }

      return {
        success: true,
        issues
      }
    } catch (error) {
      console.error('Validate token integrity error:', error)
      return {
        success: false,
        error: 'Failed to validate token integrity'
      }
    }
  }

  /**
   * Extract deleted count from cleanup message
   */
  private extractDeletedCount(message: string): number {
    const match = message.match(/(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }
}

export const tokenCleanupService = new TokenCleanupService()
export default tokenCleanupService