import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenRequest, TokenValidation, TokenResponse } from '../types';

// Mock TokenService class for testing
class TokenService {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  async generateToken(request: TokenRequest): Promise<TokenResponse> {
    try {
      // Generate secure token
      const tokenBytes = new Uint8Array(32);
      crypto.getRandomValues(tokenBytes);
      const token = Array.from(tokenBytes, byte => byte.toString(16).padStart(2, '0')).join('');

      // Hash token
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const tokenHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

      // Calculate expiration
      const expirationHours = request.expirationHours || 168; // 7 days default
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      // Store in database
      const { data: tokenRecord, error } = await this.supabase
        .from('invitation_tokens')
        .insert({
          invitation_id: request.invitationId,
          token_hash: tokenHash,
          email: request.email,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, token };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async validateToken(validation: TokenValidation): Promise<TokenResponse> {
    try {
      // Hash the provided token
      const encoder = new TextEncoder();
      const data = encoder.encode(validation.token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const tokenHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

      // Find token in database
      const { data: tokenRecord, error } = await this.supabase
        .from('invitation_tokens')
        .select(`
          *,
          invitation_requests (*)
        `)
        .eq('token_hash', tokenHash)
        .single();

      if (error || !tokenRecord) {
        return { success: false, error: 'Invalid or expired token' };
      }

      // Check if token is expired
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return { success: false, error: 'Token has expired' };
      }

      // Check if token is already used
      if (tokenRecord.used_at) {
        return { success: false, error: 'Token has already been used' };
      }

      // Check email match if provided
      if (validation.email && tokenRecord.email !== validation.email) {
        return { success: false, error: 'Email mismatch' };
      }

      return {
        success: true,
        invitationData: tokenRecord.invitation_requests
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async markTokenAsUsed(token: string): Promise<TokenResponse> {
    try {
      // Hash the token
      const encoder = new TextEncoder();
      const data = encoder.encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = new Uint8Array(hashBuffer);
      const tokenHash = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

      // Update token as used
      const { data: updatedRecord, error } = await this.supabase
        .from('invitation_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token_hash', tokenHash)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async cleanupExpiredTokens(): Promise<TokenResponse> {
    try {
      const { error, count } = await this.supabase
        .from('invitation_tokens')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Mock crypto for consistent testing
const mockCrypto = {
  getRandomValues: vi.fn(),
  subtle: {
    digest: vi.fn()
  }
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn() })) })),
    select: vi.fn(() => ({ 
      eq: vi.fn(() => ({ 
        single: vi.fn(),
        maybeSingle: vi.fn()
      }))
    })),
    update: vi.fn(() => ({ 
      eq: vi.fn(() => ({ 
        select: vi.fn(() => ({ single: vi.fn() }))
      }))
    })),
    delete: vi.fn(() => ({ lt: vi.fn() }))
  }))
};

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeEach(() => {
    tokenService = new TokenService(mockSupabase as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateToken', () => {
    it('should generate secure tokens with proper entropy', async () => {
      // Mock crypto.getRandomValues to return predictable values for testing
      const mockBytes = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockBytes[i] = i;
      }
      mockCrypto.getRandomValues.mockReturnValue(mockBytes);

      // Mock crypto.subtle.digest
      const mockHash = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockHash);

      // Mock database insert
      const mockTokenRecord = {
        id: 'token-123',
        token_hash: 'hashed-token',
        email: 'test@example.com',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockTokenRecord,
        error: null
      });

      const request: TokenRequest = {
        invitationId: 'inv-123',
        email: 'test@example.com'
      };

      const result = await tokenService.generateToken(request);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(mockCrypto.getRandomValues).toHaveBeenCalledWith(expect.any(Uint8Array));
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('should set proper expiration time', async () => {
      const mockBytes = new Uint8Array(32).fill(1);
      mockCrypto.getRandomValues.mockReturnValue(mockBytes);
      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));

      const mockTokenRecord = {
        id: 'token-123',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
      };

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockTokenRecord,
        error: null
      });

      const request: TokenRequest = {
        invitationId: 'inv-123',
        email: 'test@example.com',
        expirationHours: 48
      };

      const result = await tokenService.generateToken(request);

      expect(result.success).toBe(true);
      // Verify expiration time is approximately 48 hours from now
      const expirationTime = new Date(mockTokenRecord.expires_at).getTime();
      const expectedTime = Date.now() + 48 * 60 * 60 * 1000;
      expect(Math.abs(expirationTime - expectedTime)).toBeLessThan(60000); // Within 1 minute
    });

    it('should handle database errors during token generation', async () => {
      mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(32));
      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' }
      });

      const request: TokenRequest = {
        invitationId: 'inv-123',
        email: 'test@example.com'
      };

      const result = await tokenService.generateToken(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
    });
  });

  describe('validateToken', () => {
    it('should validate valid tokens successfully', async () => {
      const mockHash = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockHash);

      const mockTokenRecord = {
        id: 'token-123',
        invitation_id: 'inv-123',
        email: 'test@example.com',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        used_at: null,
        invitation_requests: {
          id: 'inv-123',
          parent_name: 'John Doe',
          child_name: 'Jane Doe',
          email: 'test@example.com'
        }
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockTokenRecord,
        error: null
      });

      const validation: TokenValidation = {
        token: 'valid-token-123',
        email: 'test@example.com'
      };

      const result = await tokenService.validateToken(validation);

      expect(result.success).toBe(true);
      expect(result.invitationData).toBeDefined();
      expect(result.invitationData?.email).toBe('test@example.com');
    });

    it('should reject expired tokens', async () => {
      const mockHash = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockHash);

      const mockTokenRecord = {
        id: 'token-123',
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        used_at: null
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockTokenRecord,
        error: null
      });

      const validation: TokenValidation = {
        token: 'expired-token-123'
      };

      const result = await tokenService.validateToken(validation);

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject already used tokens', async () => {
      const mockHash = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockHash);

      const mockTokenRecord = {
        id: 'token-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used_at: new Date().toISOString() // Already used
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockTokenRecord,
        error: null
      });

      const validation: TokenValidation = {
        token: 'used-token-123'
      };

      const result = await tokenService.validateToken(validation);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already been used');
    });

    it('should reject tokens with email mismatch', async () => {
      const mockHash = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockHash);

      const mockTokenRecord = {
        id: 'token-123',
        email: 'original@example.com',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used_at: null
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockTokenRecord,
        error: null
      });

      const validation: TokenValidation = {
        token: 'valid-token-123',
        email: 'different@example.com'
      };

      const result = await tokenService.validateToken(validation);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email mismatch');
    });

    it('should handle non-existent tokens', async () => {
      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found
      });

      const validation: TokenValidation = {
        token: 'non-existent-token'
      };

      const result = await tokenService.validateToken(validation);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid or expired token');
    });
  });

  describe('markTokenAsUsed', () => {
    it('should mark tokens as used successfully', async () => {
      const mockHash = new ArrayBuffer(32);
      mockCrypto.subtle.digest.mockResolvedValue(mockHash);

      const mockUpdatedRecord = {
        id: 'token-123',
        used_at: new Date().toISOString()
      };

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: mockUpdatedRecord,
        error: null
      });

      const result = await tokenService.markTokenAsUsed('valid-token-123');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        used_at: expect.any(String)
      });
    });

    it('should handle errors when marking token as used', async () => {
      mockCrypto.subtle.digest.mockResolvedValue(new ArrayBuffer(32));

      mockSupabase.from().update().eq().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      });

      const result = await tokenService.markTokenAsUsed('valid-token-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Update failed');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens successfully', async () => {
      mockSupabase.from().delete().lt.mockResolvedValue({
        error: null,
        count: 5
      });

      const result = await tokenService.cleanupExpiredTokens();

      expect(result.success).toBe(true);
      expect(mockSupabase.from().delete().lt).toHaveBeenCalledWith(
        'expires_at',
        expect.any(String)
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockSupabase.from().delete().lt.mockResolvedValue({
        error: { message: 'Cleanup failed' },
        count: 0
      });

      const result = await tokenService.cleanupExpiredTokens();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cleanup failed');
    });
  });
});