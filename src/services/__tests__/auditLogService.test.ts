import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogService } from '../auditLogService';

describe('AuditLogService', () => {
  describe('Schema Compatibility', () => {
    it('should handle missing user_agent gracefully', async () => {
      const result = await AuditLogService.testAuditLogging();
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should log events with context', async () => {
      const testEntry = {
        action: 'test_audit_with_context',
        resource_type: 'test_resource',
        resource_id: 'test_123',
        user_email: 'test@example.com',
        success: true,
        metadata: {
          test: true,
          timestamp: new Date().toISOString()
        }
      };

      const context = {
        ip_address: '127.0.0.1',
        user_agent: 'Test User Agent'
      };

      // This should not throw an error
      await expect(
        AuditLogService.logEventWithContext(testEntry, context)
      ).resolves.not.toThrow();
    });

    it('should log events without context', async () => {
      const testEntry = {
        action: 'test_audit_without_context',
        resource_type: 'test_resource',
        resource_id: 'test_456',
        user_email: 'test2@example.com',
        success: true,
        metadata: {
          test: true,
          no_context: true
        }
      };

      // This should not throw an error even without context
      await expect(
        AuditLogService.logEvent(testEntry)
      ).resolves.not.toThrow();
    });

    it('should handle token generation logging', async () => {
      await expect(
        AuditLogService.logTokenGeneration(
          'test-invitation-123',
          'parent@example.com',
          true,
          undefined,
          'user-123'
        )
      ).resolves.not.toThrow();
    });

    it('should handle email sending logging', async () => {
      await expect(
        AuditLogService.logEmailSent(
          'invitation_approved',
          'recipient@example.com',
          true,
          'msg-123',
          undefined
        )
      ).resolves.not.toThrow();
    });

    it('should handle failed operations gracefully', async () => {
      await expect(
        AuditLogService.logTokenValidation(
          'invalid-token',
          'user@example.com',
          false,
          'Token not found',
          undefined
        )
      ).resolves.not.toThrow();
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize string inputs', async () => {
      const testEntry = {
        action: 'test_sanitization',
        resource_type: 'test_resource',
        resource_id: 'test_789',
        user_email: 'test@example.com',
        success: true,
        error_message: 'A'.repeat(2000), // Very long error message
        metadata: {
          large_data: 'B'.repeat(5000) // Large metadata
        }
      };

      // This should not throw an error even with large data
      await expect(
        AuditLogService.logEvent(testEntry)
      ).resolves.not.toThrow();
    });
  });

  describe('Client Info Handling', () => {
    it('should handle missing navigator gracefully', () => {
      // Mock environment without navigator
      const originalNavigator = global.navigator;
      delete (global as any).navigator;

      // This should not throw an error
      expect(() => {
        AuditLogService.testAuditLogging();
      }).not.toThrow();

      // Restore navigator
      global.navigator = originalNavigator;
    });
  });
});