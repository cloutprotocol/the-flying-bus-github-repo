import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvitationTokenDatabaseService } from '../invitationTokenDatabaseService';
import { supabase } from '@/integrations/supabase/client';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

describe('InvitationTokenDatabaseService', () => {
  let service: InvitationTokenDatabaseService;
  let mockRpc: any;

  beforeEach(() => {
    service = new InvitationTokenDatabaseService();
    mockRpc = vi.fn();
    (supabase.rpc as any) = mockRpc;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('regenerateTokenViaDatabase', () => {
    it('should regenerate token successfully', async () => {
      const mockTokenData = [{
        token_id: 'token-id',
        token: 'new-token',
        expires_at: '2025-02-22T00:00:00Z',
        created_at: '2025-01-22T00:00:00Z'
      }];

      mockRpc.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.regenerateTokenViaDatabase('invitation-id');

      expect(result.data).toEqual({
        tokenId: 'token-id',
        token: 'new-token',
        expiresAt: '2025-02-22T00:00:00Z',
        createdAt: '2025-01-22T00:00:00Z'
      });
      expect(result.error).toBeUndefined();
      expect(mockRpc).toHaveBeenCalledWith('regenerate_invitation_token', {
        invitation_id_input: 'invitation-id'
      });
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.regenerateTokenViaDatabase('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_REGENERATE_TOKEN_FAILED');
    });

    it('should handle no token generated', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.regenerateTokenViaDatabase('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('NO_TOKEN_GENERATED');
    });

    it('should handle exceptions', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await service.regenerateTokenViaDatabase('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_REGENERATE_TOKEN_EXCEPTION');
    });
  });

  describe('getTokenInfoViaDatabase', () => {
    it('should get token info successfully', async () => {
      const mockTokenData = [{
        token_id: 'token-id',
        token: 'test-token',
        expires_at: '2025-02-22T00:00:00Z',
        used_at: null,
        created_at: '2025-01-22T00:00:00Z',
        is_expired: false,
        is_used: false
      }];

      mockRpc.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.getTokenInfoViaDatabase('invitation-id');

      expect(result.data).toEqual({
        tokenId: 'token-id',
        token: 'test-token',
        expiresAt: '2025-02-22T00:00:00Z',
        usedAt: null,
        createdAt: '2025-01-22T00:00:00Z',
        isExpired: false,
        isUsed: false
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle no token found', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.getTokenInfoViaDatabase('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.getTokenInfoViaDatabase('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_GET_TOKEN_INFO_FAILED');
    });
  });

  describe('getActiveTokensViaDatabase', () => {
    it('should get active tokens successfully', async () => {
      const mockTokensData = [{
        token_id: 'token-1',
        invitation_request_id: 'invitation-1',
        token: 'active-token-1',
        expires_at: '2025-02-22T00:00:00Z',
        created_at: '2025-01-22T00:00:00Z',
        parent_name: 'Parent Name',
        parent_email: 'parent@example.com',
        child_name: 'Child Name',
        invitation_status: 'approved'
      }];

      mockRpc.mockResolvedValue({ data: mockTokensData, error: null });

      const result = await service.getActiveTokensViaDatabase();

      expect(result.data).toEqual([{
        tokenId: 'token-1',
        invitationRequestId: 'invitation-1',
        token: 'active-token-1',
        expiresAt: '2025-02-22T00:00:00Z',
        createdAt: '2025-01-22T00:00:00Z',
        parentName: 'Parent Name',
        parentEmail: 'parent@example.com',
        childName: 'Child Name',
        invitationStatus: 'approved'
      }]);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty results', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.getActiveTokensViaDatabase();

      expect(result.data).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.getActiveTokensViaDatabase();

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_GET_ACTIVE_TOKENS_FAILED');
    });
  });

  describe('getExpiringTokensViaDatabase', () => {
    it('should get expiring tokens successfully', async () => {
      const mockTokensData = [{
        token_id: 'token-1',
        invitation_request_id: 'invitation-1',
        token: 'expiring-token',
        expires_at: '2025-01-29T00:00:00Z',
        parent_name: 'Parent Name',
        parent_email: 'parent@example.com',
        child_name: 'Child Name',
        days_until_expiry: 5
      }];

      mockRpc.mockResolvedValue({ data: mockTokensData, error: null });

      const result = await service.getExpiringTokensViaDatabase(7);

      expect(result.data).toEqual([{
        tokenId: 'token-1',
        invitationRequestId: 'invitation-1',
        token: 'expiring-token',
        expiresAt: '2025-01-29T00:00:00Z',
        parentName: 'Parent Name',
        parentEmail: 'parent@example.com',
        childName: 'Child Name',
        daysUntilExpiry: 5
      }]);
      expect(mockRpc).toHaveBeenCalledWith('get_expiring_invitation_tokens', {
        days_ahead: 7
      });
    });

    it('should use default days ahead parameter', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await service.getExpiringTokensViaDatabase();

      expect(mockRpc).toHaveBeenCalledWith('get_expiring_invitation_tokens', {
        days_ahead: 7
      });
    });
  });

  describe('getTokenStatsViaDatabase', () => {
    it('should get token stats successfully', async () => {
      const mockStatsData = [{
        total_tokens: 100,
        active_tokens: 25,
        expired_tokens: 50,
        used_tokens: 25,
        expiring_soon: 5
      }];

      mockRpc.mockResolvedValue({ data: mockStatsData, error: null });

      const result = await service.getTokenStatsViaDatabase();

      expect(result.data).toEqual({
        totalTokens: 100,
        activeTokens: 25,
        expiredTokens: 50,
        usedTokens: 25,
        expiringSoon: 5
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle empty stats', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.getTokenStatsViaDatabase();

      expect(result.data).toEqual({
        totalTokens: 0,
        activeTokens: 0,
        expiredTokens: 0,
        usedTokens: 0,
        expiringSoon: 0
      });
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.getTokenStatsViaDatabase();

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_GET_TOKEN_STATS_FAILED');
    });
  });

  describe('extendTokenExpiryViaDatabase', () => {
    it('should extend token expiry successfully', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await service.extendTokenExpiryViaDatabase('test-token', 30);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockRpc).toHaveBeenCalledWith('extend_invitation_token_expiry', {
        token_input: 'test-token',
        additional_days: 30
      });
    });

    it('should use default additional days', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      await service.extendTokenExpiryViaDatabase('test-token');

      expect(mockRpc).toHaveBeenCalledWith('extend_invitation_token_expiry', {
        token_input: 'test-token',
        additional_days: 30
      });
    });

    it('should handle failed extension', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });

      const result = await service.extendTokenExpiryViaDatabase('test-token');

      expect(result.success).toBe(false);
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.extendTokenExpiryViaDatabase('test-token');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DB_EXTEND_TOKEN_EXPIRY_FAILED');
    });
  });

  describe('validateTokenViaDatabase', () => {
    it('should validate token successfully', async () => {
      const mockValidationData = [{
        is_valid: true,
        validation_status: 'valid',
        invitation_id: 'invitation-id',
        parent_email: 'parent@example.com',
        child_name: 'Child Name',
        child_age: 10,
        expires_at: '2025-02-22T00:00:00Z',
        used_at: null,
        invitation_status: 'approved',
        days_until_expiry: 30
      }];

      mockRpc.mockResolvedValue({ data: mockValidationData, error: null });

      const result = await service.validateTokenViaDatabase('test-token');

      expect(result.data).toEqual({
        isValid: true,
        validationStatus: 'valid',
        invitationId: 'invitation-id',
        parentEmail: 'parent@example.com',
        childName: 'Child Name',
        childAge: 10,
        expiresAt: '2025-02-22T00:00:00Z',
        usedAt: null,
        invitationStatus: 'approved',
        daysUntilExpiry: 30
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid token', async () => {
      const mockValidationData = [{
        is_valid: false,
        validation_status: 'token_expired',
        invitation_id: 'invitation-id',
        parent_email: 'parent@example.com',
        child_name: 'Child Name',
        child_age: 10,
        expires_at: '2025-01-15T00:00:00Z',
        used_at: null,
        invitation_status: 'approved',
        days_until_expiry: -7
      }];

      mockRpc.mockResolvedValue({ data: mockValidationData, error: null });

      const result = await service.validateTokenViaDatabase('expired-token');

      expect(result.data?.isValid).toBe(false);
      expect(result.data?.validationStatus).toBe('token_expired');
    });

    it('should handle token not found', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.validateTokenViaDatabase('nonexistent-token');

      expect(result.data?.isValid).toBe(false);
      expect(result.data?.validationStatus).toBe('token_not_found');
      expect(result.data?.invitationId).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.validateTokenViaDatabase('test-token');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_VALIDATE_TOKEN_FAILED');
    });
  });

  describe('useTokenViaDatabase', () => {
    it('should use token successfully', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await service.useTokenViaDatabase('test-token', 'user-id');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(mockRpc).toHaveBeenCalledWith('use_invitation_token', {
        token_input: 'test-token',
        user_id_input: 'user-id'
      });
    });

    it('should handle failed token usage', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });

      const result = await service.useTokenViaDatabase('invalid-token', 'user-id');

      expect(result.success).toBe(false);
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.useTokenViaDatabase('test-token', 'user-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DB_USE_TOKEN_FAILED');
    });

    it('should handle exceptions', async () => {
      mockRpc.mockRejectedValue(new Error('Network error'));

      const result = await service.useTokenViaDatabase('test-token', 'user-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DB_USE_TOKEN_EXCEPTION');
    });
  });

  describe('cleanupExpiredTokensViaDatabase', () => {
    it('should cleanup expired tokens successfully', async () => {
      const mockCleanupData = [{
        deleted_count: 5,
        cleanup_timestamp: '2025-01-22T12:00:00Z',
        oldest_deleted_token: '2024-12-01T00:00:00Z',
        newest_deleted_token: '2024-12-31T00:00:00Z'
      }];

      mockRpc.mockResolvedValue({ data: mockCleanupData, error: null });

      const result = await service.cleanupExpiredTokensViaDatabase();

      expect(result.data).toEqual({
        deletedCount: 5,
        cleanupTimestamp: '2025-01-22T12:00:00Z',
        oldestDeletedToken: '2024-12-01T00:00:00Z',
        newestDeletedToken: '2024-12-31T00:00:00Z'
      });
      expect(result.error).toBeUndefined();
    });

    it('should handle no tokens to cleanup', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.cleanupExpiredTokensViaDatabase();

      expect(result.data?.deletedCount).toBe(0);
      expect(result.data?.oldestDeletedToken).toBeNull();
      expect(result.data?.newestDeletedToken).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.cleanupExpiredTokensViaDatabase();

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_CLEANUP_TOKENS_FAILED');
    });
  });

  describe('getTokenHistoryViaDatabase', () => {
    it('should get token history successfully', async () => {
      const mockHistoryData = [
        {
          token_id: 'token-1',
          token: 'current-token',
          created_at: '2025-01-22T00:00:00Z',
          expires_at: '2025-02-22T00:00:00Z',
          used_at: null,
          status: 'active'
        },
        {
          token_id: 'token-2',
          token: 'old-token',
          created_at: '2025-01-15T00:00:00Z',
          expires_at: '2025-02-15T00:00:00Z',
          used_at: '2025-01-20T00:00:00Z',
          status: 'used'
        }
      ];

      mockRpc.mockResolvedValue({ data: mockHistoryData, error: null });

      const result = await service.getTokenHistoryViaDatabase('invitation-id');

      expect(result.data).toEqual([
        {
          tokenId: 'token-1',
          token: 'current-token',
          createdAt: '2025-01-22T00:00:00Z',
          expiresAt: '2025-02-22T00:00:00Z',
          usedAt: null,
          status: 'active'
        },
        {
          tokenId: 'token-2',
          token: 'old-token',
          createdAt: '2025-01-15T00:00:00Z',
          expiresAt: '2025-02-15T00:00:00Z',
          usedAt: '2025-01-20T00:00:00Z',
          status: 'used'
        }
      ]);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty history', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await service.getTokenHistoryViaDatabase('invitation-id');

      expect(result.data).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRpc.mockResolvedValue({ data: null, error: mockError });

      const result = await service.getTokenHistoryViaDatabase('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('DB_GET_TOKEN_HISTORY_FAILED');
    });
  });
});