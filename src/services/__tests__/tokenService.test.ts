import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tokenService } from '../tokenService'
import { supabase } from '@/integrations/supabase/client'

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key'
  }
}))

// Mock fetch for direct API calls
global.fetch = vi.fn()

describe('TokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateToken', () => {
    it('should generate a token successfully', async () => {
      const mockResponse = {
        success: true,
        token: 'a'.repeat(64)
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      })

      const request = {
        invitationId: 'test-invitation-id',
        email: 'test@example.com'
      }

      const result = await tokenService.generateToken(request)

      expect(result.success).toBe(true)
      expect(result.token).toBe('a'.repeat(64))
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/invitation-tokens'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(request)
        })
      )
    })

    it('should validate required fields', async () => {
      const request = {
        invitationId: '',
        email: 'test@example.com'
      }

      const result = await tokenService.generateToken(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invitation ID and email are required')
    })

    it('should validate email format', async () => {
      const request = {
        invitationId: 'test-invitation-id',
        email: 'invalid-email'
      }

      const result = await tokenService.generateToken(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email format')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const request = {
        invitationId: 'test-invitation-id',
        email: 'test@example.com'
      }

      const result = await tokenService.generateToken(request)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to generate token')
    })
  })

  describe('validateToken', () => {
    it('should validate a token successfully', async () => {
      const mockResponse = {
        success: true,
        invitationData: {
          id: 'token-id',
          invitation_id: 'invitation-id',
          email: 'test@example.com',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          invitation: {
            id: 'invitation-id',
            parent_name: 'John Doe',
            child_name: 'Jane Doe',
            email: 'test@example.com',
            status: 'approved',
            created_at: new Date().toISOString()
          }
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      })

      const validation = {
        token: 'a'.repeat(64),
        email: 'test@example.com'
      }

      const result = await tokenService.validateToken(validation)

      expect(result.success).toBe(true)
      expect(result.invitationData).toBeDefined()
      expect(result.invitationData?.email).toBe('test@example.com')
    })

    it('should validate token format', async () => {
      const validation = {
        token: 'invalid-token'
      }

      const result = await tokenService.validateToken(validation)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid token format')
    })

    it('should require token', async () => {
      const validation = {
        token: ''
      }

      const result = await tokenService.validateToken(validation)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token is required')
    })

    it('should handle expired tokens', async () => {
      const mockResponse = {
        success: false,
        error: 'Token has expired'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      })

      const validation = {
        token: 'a'.repeat(64)
      }

      const result = await tokenService.validateToken(validation)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token has expired')
    })
  })

  describe('validateTokenFromUrl', () => {
    it('should validate token from URL parameters', async () => {
      const mockResponse = {
        success: true,
        invitationData: {
          id: 'token-id',
          invitation_id: 'invitation-id',
          email: 'test@example.com',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          invitation: {
            id: 'invitation-id',
            parent_name: 'John Doe',
            child_name: 'Jane Doe',
            email: 'test@example.com',
            status: 'approved',
            created_at: new Date().toISOString()
          }
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      })

      const token = 'a'.repeat(64)
      const email = 'test@example.com'

      const result = await tokenService.validateTokenFromUrl(token, email)

      expect(result.success).toBe(true)
      expect(result.invitationData).toBeDefined()
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`token=${token}`),
        expect.objectContaining({
          method: 'GET'
        })
      )
    })

    it('should require token for URL validation', async () => {
      const result = await tokenService.validateTokenFromUrl('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Token is required')
    })
  })

  describe('markTokenAsUsed', () => {
    it('should mark token as used successfully', async () => {
      const mockSupabaseResponse = {
        error: null
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseResponse)
      })

      ;(supabase.from as any).mockReturnValue({
        update: mockUpdate
      })

      const tokenId = 'test-token-id'
      const result = await tokenService.markTokenAsUsed(tokenId)

      expect(result.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        used_at: expect.any(String)
      })
    })

    it('should handle database errors when marking token as used', async () => {
      const mockSupabaseResponse = {
        error: { message: 'Database error' }
      }

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue(mockSupabaseResponse)
      })

      ;(supabase.from as any).mockReturnValue({
        update: mockUpdate
      })

      const tokenId = 'test-token-id'
      const result = await tokenService.markTokenAsUsed(tokenId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to mark token as used')
    })
  })

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Cleaned up 5 expired tokens'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse)
      })

      const result = await tokenService.cleanupExpiredTokens()

      expect(result.success).toBe(true)
      expect(result.message).toBe('Cleaned up 5 expired tokens')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('action=cleanup'),
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    it('should handle cleanup errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      const result = await tokenService.cleanupExpiredTokens()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to cleanup expired tokens')
    })
  })

  describe('getTokenStats', () => {
    it('should get token statistics successfully', async () => {
      const mockCounts = [
        { count: 10 }, // total
        { count: 5 },  // active
        { count: 2 },  // expired
        { count: 3 }   // used
      ]

      let callIndex = 0
      const mockSelect = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            gt: vi.fn().mockReturnValue({
              mockResolvedValue: mockCounts[callIndex++]
            }),
            lt: vi.fn().mockReturnValue({
              mockResolvedValue: mockCounts[callIndex++]
            })
          }),
          not: vi.fn().mockReturnValue({
            mockResolvedValue: mockCounts[callIndex++]
          }),
          mockResolvedValue: mockCounts[callIndex++]
        })
      }))

      ;(supabase.from as any).mockReturnValue({
        select: mockSelect
      })

      const result = await tokenService.getTokenStats()

      expect(result.success).toBe(true)
      expect(result.stats).toBeDefined()
    })
  })
})