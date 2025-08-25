/**
 * Integration test for token management system
 * This file can be run manually to test the token system end-to-end
 */

import { tokenService } from './tokenService'
import { tokenCleanupService } from './tokenCleanupService'
import { TokenSecurityUtils } from '@/utils/tokenSecurity'

export interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
}

export class TokenIntegrationTest {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Token Management Integration Tests...\n')
    
    this.results = []
    
    // Test token format validation
    await this.testTokenFormatValidation()
    
    // Test email validation
    await this.testEmailValidation()
    
    // Test token expiration validation
    await this.testTokenExpirationValidation()
    
    // Test rate limiting
    await this.testRateLimit()
    
    // Test token sanitization
    await this.testTokenSanitization()
    
    // Test cleanup statistics (if available)
    await this.testCleanupStats()
    
    // Print results
    this.printResults()
    
    return this.results
  }

  private async testTokenFormatValidation(): Promise<void> {
    try {
      console.log('🔍 Testing token format validation...')
      
      // Test valid token
      const validToken = 'a'.repeat(64)
      const validResult = TokenSecurityUtils.validateTokenFormat(validToken)
      
      if (!validResult.isValid) {
        throw new Error('Valid token was rejected')
      }
      
      // Test invalid token
      const invalidToken = 'invalid'
      const invalidResult = TokenSecurityUtils.validateTokenFormat(invalidToken)
      
      if (invalidResult.isValid) {
        throw new Error('Invalid token was accepted')
      }
      
      // Test weak token
      const weakToken = '0123456789abcdef'.repeat(4)
      const weakResult = TokenSecurityUtils.validateTokenFormat(weakToken)
      
      if (weakResult.isValid || weakResult.riskLevel === 'low') {
        throw new Error('Weak token was not detected')
      }
      
      this.addResult('Token Format Validation', true, {
        validTokenPassed: validResult.isValid,
        invalidTokenRejected: !invalidResult.isValid,
        weakTokenDetected: !weakResult.isValid
      })
      
    } catch (error) {
      this.addResult('Token Format Validation', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testEmailValidation(): Promise<void> {
    try {
      console.log('📧 Testing email validation...')
      
      // Test valid email
      const validEmail = TokenSecurityUtils.validateEmailFormat('test@example.com')
      if (!validEmail.isValid) {
        throw new Error('Valid email was rejected')
      }
      
      // Test invalid email
      const invalidEmail = TokenSecurityUtils.validateEmailFormat('invalid-email')
      if (invalidEmail.isValid) {
        throw new Error('Invalid email was accepted')
      }
      
      // Test empty email
      const emptyEmail = TokenSecurityUtils.validateEmailFormat('')
      if (emptyEmail.isValid) {
        throw new Error('Empty email was accepted')
      }
      
      this.addResult('Email Validation', true, {
        validEmailPassed: validEmail.isValid,
        invalidEmailRejected: !invalidEmail.isValid,
        emptyEmailRejected: !emptyEmail.isValid
      })
      
    } catch (error) {
      this.addResult('Email Validation', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testTokenExpirationValidation(): Promise<void> {
    try {
      console.log('⏰ Testing token expiration validation...')
      
      // Test future expiration
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const futureResult = TokenSecurityUtils.validateTokenExpiration(futureDate)
      
      if (!futureResult.isValid) {
        throw new Error('Future expiration was rejected')
      }
      
      // Test past expiration
      const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const pastResult = TokenSecurityUtils.validateTokenExpiration(pastDate)
      
      if (pastResult.isValid) {
        throw new Error('Past expiration was accepted')
      }
      
      // Test far future expiration
      const farFutureDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
      const farFutureResult = TokenSecurityUtils.validateTokenExpiration(farFutureDate)
      
      if (farFutureResult.isValid) {
        throw new Error('Far future expiration was accepted')
      }
      
      this.addResult('Token Expiration Validation', true, {
        futureExpirationPassed: futureResult.isValid,
        pastExpirationRejected: !pastResult.isValid,
        farFutureExpirationRejected: !farFutureResult.isValid
      })
      
    } catch (error) {
      this.addResult('Token Expiration Validation', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testRateLimit(): Promise<void> {
    try {
      console.log('🚦 Testing rate limiting...')
      
      const operation = 'test_operation'
      const maxAttempts = 3
      
      // Clear any existing rate limit
      TokenSecurityUtils.clearRateLimit(operation)
      
      // Test within limit
      const attempt1 = TokenSecurityUtils.checkRateLimit(operation, maxAttempts, 60000)
      if (!attempt1.allowed) {
        throw new Error('First attempt was blocked')
      }
      
      const attempt2 = TokenSecurityUtils.checkRateLimit(operation, maxAttempts, 60000)
      if (!attempt2.allowed) {
        throw new Error('Second attempt was blocked')
      }
      
      const attempt3 = TokenSecurityUtils.checkRateLimit(operation, maxAttempts, 60000)
      if (!attempt3.allowed) {
        throw new Error('Third attempt was blocked')
      }
      
      // Test over limit
      const attempt4 = TokenSecurityUtils.checkRateLimit(operation, maxAttempts, 60000)
      if (attempt4.allowed) {
        throw new Error('Fourth attempt was allowed (should be blocked)')
      }
      
      // Clean up
      TokenSecurityUtils.clearRateLimit(operation)
      
      this.addResult('Rate Limiting', true, {
        attemptsWithinLimit: 3,
        attemptOverLimitBlocked: !attempt4.allowed
      })
      
    } catch (error) {
      this.addResult('Rate Limiting', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testTokenSanitization(): Promise<void> {
    try {
      console.log('🔒 Testing token sanitization...')
      
      const token = 'abcd1234567890efghijklmnopqrstuvwxyz1234567890abcdefghijklmnop'
      const sanitized = TokenSecurityUtils.sanitizeTokenForLogging(token)
      
      // Should contain first 4 and last 4 characters
      if (!sanitized.includes('abcd') || !sanitized.includes('mnop')) {
        throw new Error('Sanitized token missing expected parts')
      }
      
      // Should contain asterisks
      if (!sanitized.includes('*')) {
        throw new Error('Sanitized token missing masking')
      }
      
      // Should not contain middle characters
      if (sanitized.includes('567890efghijklmnopqrstuvwxyz123456')) {
        throw new Error('Sanitized token contains sensitive data')
      }
      
      // Test invalid token
      const invalidSanitized = TokenSecurityUtils.sanitizeTokenForLogging('')
      if (invalidSanitized !== '[INVALID_TOKEN]') {
        throw new Error('Invalid token not properly sanitized')
      }
      
      this.addResult('Token Sanitization', true, {
        validTokenSanitized: sanitized,
        invalidTokenHandled: invalidSanitized === '[INVALID_TOKEN]'
      })
      
    } catch (error) {
      this.addResult('Token Sanitization', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async testCleanupStats(): Promise<void> {
    try {
      console.log('📊 Testing cleanup statistics...')
      
      const stats = await tokenCleanupService.getCleanupStats()
      
      if (!stats.success) {
        throw new Error(`Failed to get cleanup stats: ${stats.error}`)
      }
      
      if (!stats.stats) {
        throw new Error('No stats returned')
      }
      
      // Validate stats structure
      const requiredFields = ['totalTokens', 'activeTokens', 'expiredTokens', 'usedTokens']
      for (const field of requiredFields) {
        if (typeof stats.stats[field as keyof typeof stats.stats] !== 'number') {
          throw new Error(`Missing or invalid field: ${field}`)
        }
      }
      
      this.addResult('Cleanup Statistics', true, {
        statsRetrieved: true,
        totalTokens: stats.stats.totalTokens,
        activeTokens: stats.stats.activeTokens,
        expiredTokens: stats.stats.expiredTokens,
        usedTokens: stats.stats.usedTokens
      })
      
    } catch (error) {
      this.addResult('Cleanup Statistics', false, error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private addResult(testName: string, success: boolean, details?: any): void {
    const result: TestResult = {
      testName,
      success,
      details
    }
    
    if (!success && typeof details === 'string') {
      result.error = details
      delete result.details
    }
    
    this.results.push(result)
    
    const status = success ? '✅' : '❌'
    console.log(`${status} ${testName}: ${success ? 'PASSED' : 'FAILED'}`)
    
    if (!success && result.error) {
      console.log(`   Error: ${result.error}`)
    }
    
    if (success && result.details) {
      console.log(`   Details:`, result.details)
    }
    
    console.log('')
  }

  private printResults(): void {
    const passed = this.results.filter(r => r.success).length
    const total = this.results.length
    
    console.log('📋 Test Results Summary:')
    console.log(`   Total Tests: ${total}`)
    console.log(`   Passed: ${passed}`)
    console.log(`   Failed: ${total - passed}`)
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! Token management system is working correctly.')
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.')
    }
  }
}

// Export a function to run the tests
export async function runTokenIntegrationTests(): Promise<TestResult[]> {
  const tester = new TokenIntegrationTest()
  return await tester.runAllTests()
}

// Allow running this file directly for testing
if (typeof window !== 'undefined' && (window as any).runTokenTests) {
  (window as any).runTokenTests = runTokenIntegrationTests
}