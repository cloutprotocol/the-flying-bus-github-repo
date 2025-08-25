import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TokenSecurityUtils } from '../tokenSecurity'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock crypto API
const cryptoMock = {
  getRandomValues: vi.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  })
}

Object.defineProperty(window, 'crypto', {
  value: cryptoMock
})

describe('TokenSecurityUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.clear()
  })

  describe('validateTokenFormat', () => {
    it('should validate a correct token format', () => {
      const validToken = 'a'.repeat(64)
      const result = TokenSecurityUtils.validateTokenFormat(validToken)

      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
      expect(result.riskLevel).toBe('low')
    })

    it('should reject empty token', () => {
      const result = TokenSecurityUtils.validateTokenFormat('')

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Token is required')
      expect(result.riskLevel).toBe('high')
    })

    it('should reject token with wrong length', () => {
      const shortToken = 'a'.repeat(32)
      const result = TokenSecurityUtils.validateTokenFormat(shortToken)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Token must be exactly 64 characters long')
      expect(result.riskLevel).toBe('high')
    })

    it('should reject token with invalid characters', () => {
      const invalidToken = 'g'.repeat(64) // 'g' is not a valid hex character
      const result = TokenSecurityUtils.validateTokenFormat(invalidToken)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Token contains invalid characters (must be hexadecimal)')
      expect(result.riskLevel).toBe('high')
    })

    it('should detect weak patterns', () => {
      const weakToken = '0123456789abcdef'.repeat(4) // Sequential pattern
      const result = TokenSecurityUtils.validateTokenFormat(weakToken)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Token appears to have weak randomness patterns')
      expect(result.riskLevel).toBe('medium')
    })

    it('should detect excessive repeated characters', () => {
      const repeatedToken = 'a'.repeat(64) // All same character
      const result = TokenSecurityUtils.validateTokenFormat(repeatedToken)

      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('Token has suspicious repeated character patterns')
      expect(result.riskLevel).toBe('medium')
    })

    it('should accept mixed case hex tokens', () => {
      const mixedCaseToken = 'AbCdEf0123456789'.repeat(4)
      const result = TokenSecurityUtils.validateTokenFormat(mixedCaseToken)

      expect(result.isValid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })
  })

  describe('validateEmailFormat', () => {
    it('should validate correct email format', () => {
      const result = TokenSecurityUtils.validateEmailFormat('test@example.com')

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject empty email', () => {
      const result = TokenSecurityUtils.validateEmailFormat('')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Email is required')
    })

    it('should reject invalid email format', () => {
      const result = TokenSecurityUtils.validateEmailFormat('invalid-email')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid email format')
    })

    it('should reject email that is too long', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      const result = TokenSecurityUtils.validateEmailFormat(longEmail)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Email address is too long')
    })

    it('should reject email with local part that is too long', () => {
      const longLocalPart = 'a'.repeat(65) + '@example.com'
      const result = TokenSecurityUtils.validateEmailFormat(longLocalPart)

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Email local part is too long')
    })
  })

  describe('validateTokenExpiration', () => {
    it('should validate future expiration date', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      const result = TokenSecurityUtils.validateTokenExpiration(futureDate.toISOString())

      expect(result.isValid).toBe(true)
      expect(result.timeRemaining).toBeGreaterThan(0)
    })

    it('should reject expired token', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      const result = TokenSecurityUtils.validateTokenExpiration(pastDate.toISOString())

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Token has expired')
      expect(result.timeRemaining).toBe(0)
    })

    it('should reject token with expiration too far in future', () => {
      const farFutureDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000) // 31 days from now
      const result = TokenSecurityUtils.validateTokenExpiration(farFutureDate.toISOString())

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Token expiration is too far in the future')
    })

    it('should warn about tokens expiring soon', () => {
      const soonDate = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
      const result = TokenSecurityUtils.validateTokenExpiration(soonDate.toISOString())

      expect(result.isValid).toBe(true)
      expect(result.error).toBe('Token expires soon')
      expect(result.timeRemaining).toBeLessThan(60 * 60) // Less than 1 hour in seconds
    })

    it('should handle invalid date format', () => {
      const result = TokenSecurityUtils.validateTokenExpiration('invalid-date')

      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Invalid expiration date format')
    })
  })

  describe('generateTestToken', () => {
    it('should generate a 64-character hex token', () => {
      const token = TokenSecurityUtils.generateTestToken()

      expect(token).toHaveLength(64)
      expect(/^[a-f0-9]+$/i.test(token)).toBe(true)
    })

    it('should use crypto API when available', () => {
      TokenSecurityUtils.generateTestToken()
      expect(cryptoMock.getRandomValues).toHaveBeenCalled()
    })
  })

  describe('sanitizeTokenForLogging', () => {
    it('should mask token for logging', () => {
      const token = 'abcd1234567890efghijklmnopqrstuvwxyz1234567890abcdefghijklmnop'
      const sanitized = TokenSecurityUtils.sanitizeTokenForLogging(token)

      expect(sanitized).toBe('abcd************************************************mnop')
      expect(sanitized).toContain('abcd')
      expect(sanitized).toContain('mnop')
      expect(sanitized).toContain('*')
    })

    it('should handle invalid tokens', () => {
      const result = TokenSecurityUtils.sanitizeTokenForLogging('')
      expect(result).toBe('[INVALID_TOKEN]')
    })

    it('should handle short tokens', () => {
      const result = TokenSecurityUtils.sanitizeTokenForLogging('abc')
      expect(result).toBe('[INVALID_TOKEN]')
    })
  })

  describe('checkRateLimit', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(null)
    })

    it('should allow operation within rate limit', () => {
      const result = TokenSecurityUtils.checkRateLimit('test_operation', 5, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should block operation when rate limit exceeded', () => {
      const pastAttempts = {
        timestamp: Date.now(),
        count: 5
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(pastAttempts))

      const result = TokenSecurityUtils.checkRateLimit('test_operation', 5, 60000)

      expect(result.allowed).toBe(false)
      expect(result.remainingAttempts).toBe(0)
    })

    it('should reset rate limit after time window', () => {
      const oldAttempts = {
        timestamp: Date.now() - 120000, // 2 minutes ago
        count: 5
      }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldAttempts))

      const result = TokenSecurityUtils.checkRateLimit('test_operation', 5, 60000)

      expect(result.allowed).toBe(true)
      expect(result.remainingAttempts).toBe(4)
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      const result = TokenSecurityUtils.checkRateLimit('test_operation', 5, 60000)

      expect(result.allowed).toBe(true)
    })
  })

  describe('clearRateLimit', () => {
    it('should clear rate limit for operation', () => {
      TokenSecurityUtils.clearRateLimit('test_operation')

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token_rate_limit_test_operation')
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage error')
      })

      expect(() => {
        TokenSecurityUtils.clearRateLimit('test_operation')
      }).not.toThrow()
    })
  })
})