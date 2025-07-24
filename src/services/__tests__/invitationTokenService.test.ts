import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvitationTokenService } from '../invitationTokenService';
import { supabase } from '@/integrations/supabase/client';
import { INVITATION_TOKEN_EXPIRY_DAYS } from '@/types/InvitationWorkflowTypes';

// Mock the supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

// Mock crypto.getRandomValues for consistent testing
const mockGetRandomValues = vi.fn();
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: mockGetRandomValues
  }
});

describe('InvitationTokenService', () => {
  let service: InvitationTokenService;
  let mockFrom: any;
  let mockSelect: any;
  let mockInsert: any;
  let mockUpdate: any;
  let mockDelete: any;
  let mockEq: any;
  let mockSingle: any;
  let mockOrder: any;
  let mockLimit: any;
  let mockRange: any;
  let mockIs: any;
  let mockLt: any;

  beforeEach(() => {
    service = new InvitationTokenService();
    
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup mock chain
    mockSingle = vi.fn();
    mockRange = vi.fn();
    mockOrder = vi.fn().mockReturnValue({ 
      limit: vi.fn().mockReturnValue({ single: mockSingle }),
      range: mockRange
    });
    mockLimit = vi.fn().mockReturnValue({ single: mockSingle });
    mockIs = vi.fn().mockReturnValue({ 
      order: mockOrder,
      select: vi.fn()
    });
    mockLt = vi.fn().mockReturnValue({ 
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    });
    mockEq = vi.fn().mockReturnValue({ 
      single: mockSingle,
      is: mockIs,
      select: vi.fn().mockResolvedValue({ data: [], error: null })
    });
    mockSelect = vi.fn().mockReturnValue({ 
      eq: mockEq,
      single: mockSingle,
      order: mockOrder,
      range: mockRange
    });
    mockInsert = vi.fn().mockReturnValue({ 
      select: vi.fn().mockReturnValue({ single: mockSingle }) 
    });
    mockUpdate = vi.fn().mockReturnValue({ 
      eq: mockEq,
      is: mockIs
    });
    mockDelete = vi.fn().mockReturnValue({
      lt: mockLt
    });
    mockFrom = vi.fn().mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete
    });
    
    (supabase.from as any) = mockFrom;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a secure token successfully', async () => {
      // Mock crypto.getRandomValues to return predictable values
      const mockBytes = new Uint8Array(32);
      mockBytes.fill(65); // Fill with 'A' character code
      mockGetRandomValues.mockImplementation((array) => {
        array.set(mockBytes);
        return array;
      });

      const mockTokenData = {
        id: 'token-id',
        invitation_request_id: 'invitation-id',
        token: 'generated-token',
        expires_at: new Date().toISOString(),
        used_at: null,
        created_at: new Date().toISOString()
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.generateToken('invitation-id');

      expect(result.data).toEqual(mockTokenData);
      expect(result.error).toBeUndefined();
      expect(mockGetRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(mockFrom).toHaveBeenCalledWith('invitation_tokens');
      expect(mockInsert).toHaveBeenCalledWith({
        invitation_request_id: 'invitation-id',
        token: expect.any(String),
        expires_at: expect.any(String)
      });
    });

    it('should handle database errors during token generation', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockSingle.mockResolvedValue({ data: null, error: mockError });

      const result = await service.generateToken('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        code: 'TOKEN_GENERATION_FAILED',
        message: 'Failed to generate invitation token',
        details: mockError
      });
    });

    it('should handle exceptions during token generation', async () => {
      mockSingle.mockRejectedValue(new Error('Network error'));

      const result = await service.generateToken('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('TOKEN_GENERATION_EXCEPTION');
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token successfully', async () => {
      const mockTokenData = {
        id: 'token-id',
        invitation_request_id: 'invitation-id',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
        used_at: null,
        created_at: new Date().toISOString(),
        invitation_request: {
          id: 'invitation-id',
          parent_email: 'parent@example.com',
          child_name: 'Child Name',
          status: 'approved'
        }
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.validateToken('valid-token');

      expect(result.data?.isValid).toBe(true);
      expect(result.data?.invitationId).toBe('invitation-id');
      expect(result.data?.parentEmail).toBe('parent@example.com');
      expect(result.data?.childName).toBe('Child Name');
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid token format', async () => {
      const result = await service.validateToken('short');

      expect(result.data?.isValid).toBe(false);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('should reject expired tokens', async () => {
      const mockTokenData = {
        id: 'token-id',
        invitation_request_id: 'invitation-id',
        token: 'expired-token',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        used_at: null,
        created_at: new Date().toISOString(),
        invitation_request: {
          id: 'invitation-id',
          parent_email: 'parent@example.com',
          child_name: 'Child Name',
          status: 'approved'
        }
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.validateToken('expired-token');

      expect(result.data?.isValid).toBe(false);
      expect(result.data?.invitationId).toBe('invitation-id');
    });

    it('should reject used tokens', async () => {
      const mockTokenData = {
        id: 'token-id',
        invitation_request_id: 'invitation-id',
        token: 'used-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        invitation_request: {
          id: 'invitation-id',
          parent_email: 'parent@example.com',
          child_name: 'Child Name',
          status: 'approved'
        }
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.validateToken('used-token');

      expect(result.data?.isValid).toBe(false);
    });

    it('should reject tokens for non-approved invitations', async () => {
      const mockTokenData = {
        id: 'token-id',
        invitation_request_id: 'invitation-id',
        token: 'pending-token',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
        invitation_request: {
          id: 'invitation-id',
          parent_email: 'parent@example.com',
          child_name: 'Child Name',
          status: 'pending'
        }
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.validateToken('pending-token');

      expect(result.data?.isValid).toBe(false);
    });

    it('should handle token not found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await service.validateToken('nonexistent-token');

      expect(result.data?.isValid).toBe(false);
    });
  });

  describe('markTokenAsUsed', () => {
    it('should mark a valid token as used successfully', async () => {
      // Mock validation to return valid token
      const validationSpy = vi.spyOn(service, 'validateToken').mockResolvedValue({
        data: {
          isValid: true,
          invitationId: 'invitation-id',
          parentEmail: 'parent@example.com',
          childName: 'Child Name',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          usedAt: null
        }
      });

      // Mock successful updates
      mockEq.mockResolvedValue({ error: null });

      const result = await service.markTokenAsUsed('valid-token', 'user-id');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(validationSpy).toHaveBeenCalledWith('valid-token');
      expect(mockUpdate).toHaveBeenCalledWith({ used_at: expect.any(String) });
    });

    it('should fail when token is invalid', async () => {
      const validationSpy = vi.spyOn(service, 'validateToken').mockResolvedValue({
        data: { isValid: false }
      });

      const result = await service.markTokenAsUsed('invalid-token', 'user-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TOKEN');
      expect(validationSpy).toHaveBeenCalledWith('invalid-token');
    });

    it('should handle database errors during token update', async () => {
      vi.spyOn(service, 'validateToken').mockResolvedValue({
        data: {
          isValid: true,
          invitationId: 'invitation-id',
          parentEmail: 'parent@example.com',
          childName: 'Child Name',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          usedAt: null
        }
      });

      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockEq.mockResolvedValue({ error: mockError });

      const result = await service.markTokenAsUsed('valid-token', 'user-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TOKEN_UPDATE_FAILED');
    });
  });

  describe('getTokenStatus', () => {
    it('should return status for existing token', async () => {
      const mockTokenData = {
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used_at: null
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.getTokenStatus('existing-token');

      expect(result.data?.exists).toBe(true);
      expect(result.data?.isExpired).toBe(false);
      expect(result.data?.isUsed).toBe(false);
      expect(result.data?.expiresAt).toBe(mockTokenData.expires_at);
    });

    it('should return non-existent status for missing token', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await service.getTokenStatus('nonexistent-token');

      expect(result.data?.exists).toBe(false);
      expect(result.data?.isExpired).toBe(false);
      expect(result.data?.isUsed).toBe(false);
    });

    it('should detect expired tokens', async () => {
      const mockTokenData = {
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        used_at: null
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.getTokenStatus('expired-token');

      expect(result.data?.exists).toBe(true);
      expect(result.data?.isExpired).toBe(true);
      expect(result.data?.isUsed).toBe(false);
    });

    it('should detect used tokens', async () => {
      const mockTokenData = {
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used_at: new Date().toISOString()
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.getTokenStatus('used-token');

      expect(result.data?.exists).toBe(true);
      expect(result.data?.isExpired).toBe(false);
      expect(result.data?.isUsed).toBe(true);
    });
  });

  describe('regenerateToken', () => {
    it('should regenerate token successfully', async () => {
      // Mock invalidating existing tokens - need to mock the full chain
      const mockIsChain = vi.fn().mockResolvedValue({ error: null });
      mockIs.mockReturnValue(mockIsChain);
      mockEq.mockReturnValue({ is: mockIs });
      mockUpdate.mockReturnValue({ eq: mockEq });

      // Mock generating new token
      const generateTokenSpy = vi.spyOn(service, 'generateToken').mockResolvedValue({
        data: {
          id: 'new-token-id',
          invitation_request_id: 'invitation-id',
          token: 'new-token',
          expires_at: new Date().toISOString(),
          used_at: null,
          created_at: new Date().toISOString()
        }
      });

      const result = await service.regenerateToken('invitation-id');

      expect(result.data?.token).toBe('new-token');
      expect(result.error).toBeUndefined();
      expect(generateTokenSpy).toHaveBeenCalledWith('invitation-id');
    });

    it('should handle errors during token regeneration', async () => {
      // Mock invalidating existing tokens
      const mockIsChain = vi.fn().mockResolvedValue({ error: null });
      mockIs.mockReturnValue(mockIsChain);
      mockEq.mockReturnValue({ is: mockIs });
      mockUpdate.mockReturnValue({ eq: mockEq });
      
      const generateTokenSpy = vi.spyOn(service, 'generateToken').mockResolvedValue({
        error: {
          code: 'TOKEN_GENERATION_FAILED',
          message: 'Failed to generate token'
        }
      });

      const result = await service.regenerateToken('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('TOKEN_GENERATION_FAILED');
      expect(generateTokenSpy).toHaveBeenCalledWith('invitation-id');
    });
  });

  describe('getTokenForInvitation', () => {
    it('should return active token for invitation', async () => {
      const mockTokenData = {
        id: 'token-id',
        invitation_request_id: 'invitation-id',
        token: 'active-token',
        expires_at: new Date().toISOString(),
        used_at: null,
        created_at: new Date().toISOString()
      };

      mockSingle.mockResolvedValue({ data: mockTokenData, error: null });

      const result = await service.getTokenForInvitation('invitation-id');

      expect(result.data).toEqual(mockTokenData);
      expect(result.error).toBeUndefined();
    });

    it('should handle no active tokens found', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      const result = await service.getTokenForInvitation('invitation-id');

      expect(result.data).toBeUndefined();
      expect(result.error).toBeUndefined();
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens successfully', async () => {
      const mockDeletedTokens = [
        { id: 'token-1' },
        { id: 'token-2' }
      ];

      mockLt.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockDeletedTokens, error: null })
      });

      const result = await service.cleanupExpiredTokens();

      expect(result.deletedCount).toBe(2);
      expect(result.error).toBeUndefined();
    });

    it('should handle errors during cleanup', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      
      mockLt.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: null, error: mockError })
      });

      const result = await service.cleanupExpiredTokens();

      expect(result.deletedCount).toBe(0);
      expect(result.error?.code).toBe('TOKEN_CLEANUP_FAILED');
    });
  });

  describe('getTokensForAdmin', () => {
    it('should return paginated tokens for admin', async () => {
      const mockTokens = [
        {
          id: 'token-1',
          invitation_request_id: 'invitation-1',
          token: 'token-1',
          expires_at: new Date().toISOString(),
          used_at: null,
          created_at: new Date().toISOString(),
          invitation_request: {
            parent_name: 'Parent 1',
            parent_email: 'parent1@example.com',
            child_name: 'Child 1',
            status: 'approved'
          }
        }
      ];

      // Mock the full chain for getTokensForAdmin
      mockRange.mockResolvedValue({ data: mockTokens, error: null, count: 1 });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });

      const result = await service.getTokensForAdmin(1, 50);

      expect(result.data).toEqual(mockTokens);
      expect(result.count).toBe(1);
      expect(result.error).toBeUndefined();
      expect(mockRange).toHaveBeenCalledWith(0, 49);
    });

    it('should handle pagination correctly', async () => {
      mockRange.mockResolvedValue({ data: [], error: null, count: 0 });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });

      await service.getTokensForAdmin(2, 25);

      expect(mockRange).toHaveBeenCalledWith(25, 49);
    });

    it('should handle database errors', async () => {
      const mockError = { code: 'DB_ERROR', message: 'Database error' };
      mockRange.mockResolvedValue({ data: null, error: mockError, count: null });
      mockOrder.mockReturnValue({ range: mockRange });
      mockSelect.mockReturnValue({ order: mockOrder });

      const result = await service.getTokensForAdmin();

      expect(result.data).toBeUndefined();
      expect(result.error?.code).toBe('ADMIN_TOKEN_FETCH_FAILED');
    });
  });
});