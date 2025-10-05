import { useState, useCallback } from 'react'
import { tokenService, TokenRequest, TokenValidation, TokenResponse, InvitationData } from '@/services/tokenService'
import { tokenCleanupService, CleanupResult, CleanupStats } from '@/services/tokenCleanupService'

export interface UseTokenManagementReturn {
  // State
  isLoading: boolean
  error: string | null
  
  // Token operations
  generateToken: (request: TokenRequest) => Promise<TokenResponse>
  validateToken: (validation: TokenValidation) => Promise<TokenResponse>
  validateTokenFromUrl: (token: string, email?: string) => Promise<TokenResponse>
  markTokenAsUsed: (tokenId: string) => Promise<{ success: boolean; error?: string }>
  
  // Cleanup operations
  cleanupExpiredTokens: () => Promise<CleanupResult>
  getCleanupStats: () => Promise<{ success: boolean; stats?: CleanupStats; error?: string }>
  
  // Utility functions
  clearError: () => void
  isValidTokenFormat: (token: string) => boolean
}

export const useTokenManagement = (): UseTokenManagementReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<T | null> => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await operation()
      return result
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : errorMessage
      setError(errorMsg)
      console.error(errorMessage, err)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateToken = useCallback(async (request: TokenRequest): Promise<TokenResponse> => {
    const result = await handleAsyncOperation(
      () => tokenService.generateToken(request),
      'Failed to generate token'
    )
    
    if (!result) {
      return { success: false, error: error || 'Failed to generate token' }
    }
    
    if (!result.success && result.error) {
      setError(result.error)
    }
    
    return result
  }, [handleAsyncOperation, error])

  const validateToken = useCallback(async (validation: TokenValidation): Promise<TokenResponse> => {
    const result = await handleAsyncOperation(
      () => tokenService.validateToken(validation),
      'Failed to validate token'
    )
    
    if (!result) {
      return { success: false, error: error || 'Failed to validate token' }
    }
    
    if (!result.success && result.error) {
      setError(result.error)
    }
    
    return result
  }, [handleAsyncOperation, error])

  const validateTokenFromUrl = useCallback(async (token: string, email?: string): Promise<TokenResponse> => {
    const result = await handleAsyncOperation(
      () => tokenService.validateTokenFromUrl(token, email),
      'Failed to validate token from URL'
    )
    
    if (!result) {
      return { success: false, error: error || 'Failed to validate token from URL' }
    }
    
    if (!result.success && result.error) {
      setError(result.error)
    }
    
    return result
  }, [handleAsyncOperation, error])

  const markTokenAsUsed = useCallback(async (tokenId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await handleAsyncOperation(
      () => tokenService.markTokenAsUsed(tokenId),
      'Failed to mark token as used'
    )
    
    if (!result) {
      return { success: false, error: error || 'Failed to mark token as used' }
    }
    
    if (!result.success && result.error) {
      setError(result.error)
    }
    
    return result
  }, [handleAsyncOperation, error])

  const cleanupExpiredTokens = useCallback(async (): Promise<CleanupResult> => {
    const result = await handleAsyncOperation(
      () => tokenCleanupService.cleanupExpiredTokens(),
      'Failed to cleanup expired tokens'
    )
    
    if (!result) {
      return { success: false, error: error || 'Failed to cleanup expired tokens' }
    }
    
    if (!result.success && result.error) {
      setError(result.error)
    }
    
    return result
  }, [handleAsyncOperation, error])

  const getCleanupStats = useCallback(async (): Promise<{ success: boolean; stats?: CleanupStats; error?: string }> => {
    const result = await handleAsyncOperation(
      () => tokenCleanupService.getCleanupStats(),
      'Failed to get cleanup statistics'
    )
    
    if (!result) {
      return { success: false, error: error || 'Failed to get cleanup statistics' }
    }
    
    if (!result.success && result.error) {
      setError(result.error)
    }
    
    return result
  }, [handleAsyncOperation, error])

  const isValidTokenFormat = useCallback((token: string): boolean => {
    // Token should be 64 hex characters
    const tokenRegex = /^[a-f0-9]{64}$/i
    return tokenRegex.test(token)
  }, [])

  return {
    // State
    isLoading,
    error,
    
    // Token operations
    generateToken,
    validateToken,
    validateTokenFromUrl,
    markTokenAsUsed,
    
    // Cleanup operations
    cleanupExpiredTokens,
    getCleanupStats,
    
    // Utility functions
    clearError,
    isValidTokenFormat
  }
}

export default useTokenManagement