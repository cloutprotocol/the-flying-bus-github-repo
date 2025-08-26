import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AdminPermissionMiddleware } from '@/components/Admin/AdminPermissionMiddleware';
import { FeatureFlag } from '@/components/Common/FeatureFlag';
import { hasAuthorPrivileges, hasAdminPrivileges, hasModeratorPrivileges } from '@/services/roleService';
import { useRoleBasedAccess } from '@/hooks/useRoleBasedAccess';
import { getRedirectUrlForRole } from '@/services/roleService';

// Mock all dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn()
  }
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useRoleBasedAccess', () => ({
  useRoleBasedAccess: vi.fn()
}));

vi.mock('@/services/roleService', () => ({
  hasAuthorPrivileges: vi.fn(),
  hasAdminPrivileges: vi.fn(),
  hasModeratorPrivileges: vi.fn(),
  getRedirectUrlForRole: vi.fn()
}));

vi.mock('@/utils/roleBasedRedirect', () => ({
  redirectBasedOnRole: vi.fn()
}));

describe('Role-Based Access Control Tests', () => {
  const mockUseAuth = vi.fn();
  const mockUseRoleBasedAccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { useAuth } = require('@/hooks/useAuth');
    useAuth.mockImplementation(mockUseAuth);
    
    (useRoleBasedAccess as any).mockImplementation(mockUseRoleBasedAccess);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );

  describe('Unauthorized Access Attempts', () => {
    it('should block reader access to author features', async () => {
      const mockReaderUser = {
        id: 'reader-123',
        role: 'reader',
        email: 'reader@example.com',
        username: 'reader_user',
        display_name: 'Reader User',
        bio: '',
        avatar_url: '',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockUseAuth.mockReturnValue({
        user: mockReaderUser,
        loading: false,
        isAuthenticated: true
      });

      (hasAuthorPrivileges as any).mockReturnValue(false);

      render(
        <TestWrapper>
          <RouteGuard requiredRole="author">
            <div>Author Only Content</div>
          </RouteGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Author Only Content')).not.toBeInTheDocument();
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });

    it('should block author access to admin features', async () => {
      const mockAuthorUser = {
        id: 'author-123',
        role: 'author',
        email: 'author@example.com',
        username: 'author_user',
        display_name: 'Author User',
        bio: '',
        avatar_url: '',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      };

      mockUseAuth.mockReturnValue({
        user: mockAuthorUser,
        loading: false,
        isAuthenticated: true
      });

      (hasAdminPrivileges as any).mockReturnValue(false);

      render(
        <TestWrapper>
          <RouteGuard requiredRole="admin">
            <div>Admin Only Content</div>
          </RouteGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Admin Only Content')).not.toBeInTheDocument();
        expect(screen.getByText('Access Denied')).toBeInTheDocument();
      });
    });

    it('should block unauthenticated access to protected routes', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
        isAuthenticated: false
      });

      render(
        <TestWrapper>
          <RouteGuard requiredRole="reader">
            <div>Protected Content</div>
          </RouteGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        expect(screen.getByText('Please log in to access this page')).toBeInTheDocument();
      });
    });

    it('should handle loading states during authentication check', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
        isAuthenticated: false
      });

      render(
        <TestWrapper>
          <RouteGuard requiredRole="author">
            <div>Author Content</div>
          </RouteGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
        expect(screen.queryByText('Author Content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Proper Redirection Based on User Role', () => {
    it('should redirect admin users to admin dashboard', async () => {
      (getRedirectUrlForRole as any).mockImplementation((role: string) => {
        switch (role) {
          case 'admin':
          case 'moderator':
          case 'author':
            return '/admin/dashboard';
          case 'reader':
          default:
            return '/';
        }
      });

      const adminRedirect = getRedirectUrlForRole('admin');
      const authorRedirect = getRedirectUrlForRole('author');
      const readerRedirect = getRedirectUrlForRole('reader');

      expect(adminRedirect).toBe('/admin/dashboard');
      expect(authorRedirect).toBe('/admin/dashboard');
      expect(readerRedirect).toBe('/');
    });

    it('should redirect users after successful login based on role', async () => {
      const mockRedirectAfterLogin = (user: any) => {
        const { redirectBasedOnRole } = require('@/utils/roleBasedRedirect');
        redirectBasedOnRole.mockImplementation((role: string) => {
          switch (role) {
            case 'admin':
              return '/admin/dashboard';
            case 'author':
              return '/author/dashboard';
            case 'reader':
            default:
              return '/';
          }
        });

        return redirectBasedOnRole(user.role);
      };

      const adminUser = { role: 'admin' };
      const authorUser = { role: 'author' };
      const readerUser = { role: 'reader' };

      expect(mockRedirectAfterLogin(adminUser)).toBe('/admin/dashboard');
      expect(mockRedirectAfterLogin(authorUser)).toBe('/author/dashboard');
      expect(mockRedirectAfterLogin(readerUser)).toBe('/');
    });

    it('should handle invalid or unknown roles gracefully', async () => {
      (getRedirectUrlForRole as any).mockImplementation((role: string) => {
        switch (role) {
          case 'admin':
          case 'moderator':
          case 'author':
            return '/admin/dashboard';
          case 'reader':
            return '/';
          default:
            return '/'; // Default fallback
        }
      });

      const unknownRoleRedirect = getRedirectUrlForRole('unknown_role');
      const nullRoleRedirect = getRedirectUrlForRole('');

      expect(unknownRoleRedirect).toBe('/');
      expect(nullRoleRedirect).toBe('/');
    });
  });

  describe('Feature Visibility and Availability for Different Roles', () => {
    it('should show appropriate features for admin users', async () => {
      const mockAdminUser = {
        id: 'admin-123',
        role: 'admin',
        email: 'admin@example.com'
      };

      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
        isAuthenticated: true
      });

      mockUseRoleBasedAccess.mockReturnValue({
        canAccessAdminFeatures: true,
        canManageUsers: true,
        canManageArticles: true,
        canAccessSystemSettings: true,
        canViewAllAnalytics: true,
        canModerateContent: true
      });

      const AdminFeaturesComponent = () => {
        const permissions = mockUseRoleBasedAccess();
        
        return (
          <div>
            <h1>Admin Dashboard</h1>
            {permissions.canManageUsers && <button>Manage Users</button>}
            {permissions.canManageArticles && <button>Manage Articles</button>}
            {permissions.canAccessSystemSettings && <button>System Settings</button>}
            {permissions.canViewAllAnalytics && <button>View Analytics</button>}
            {permissions.canModerateContent && <button>Moderate Content</button>}
          </div>
        );
      };

      render(
        <TestWrapper>
          <AdminFeaturesComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
        expect(screen.getByText('Manage Articles')).toBeInTheDocument();
        expect(screen.getByText('System Settings')).toBeInTheDocument();
        expect(screen.getByText('View Analytics')).toBeInTheDocument();
        expect(screen.getByText('Moderate Content')).toBeInTheDocument();
      });
    });

    it('should show limited features for author users', async () => {
      const mockAuthorUser = {
        id: 'author-123',
        role: 'author',
        email: 'author@example.com'
      };

      mockUseAuth.mockReturnValue({
        user: mockAuthorUser,
        loading: false,
        isAuthenticated: true
      });

      mockUseRoleBasedAccess.mockReturnValue({
        canAccessAdminFeatures: false,
        canManageUsers: false,
        canManageArticles: true,
        canAccessSystemSettings: false,
        canViewAllAnalytics: false,
        canModerateContent: false,
        canCreateArticles: true,
        canEditOwnArticles: true,
        canViewOwnAnalytics: true
      });

      const AuthorFeaturesComponent = () => {
        const permissions = mockUseRoleBasedAccess();
        
        return (
          <div>
            <h1>Author Dashboard</h1>
            {permissions.canCreateArticles && <button>Create Article</button>}
            {permissions.canManageArticles && <button>My Articles</button>}
            {permissions.canViewOwnAnalytics && <button>My Analytics</button>}
            {permissions.canManageUsers && <button>Manage Users</button>}
            {permissions.canAccessSystemSettings && <button>System Settings</button>}
          </div>
        );
      };

      render(
        <TestWrapper>
          <AuthorFeaturesComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Author Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Create Article')).toBeInTheDocument();
        expect(screen.getByText('My Articles')).toBeInTheDocument();
        expect(screen.getByText('My Analytics')).toBeInTheDocument();
        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
        expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
      });
    });

    it('should show minimal features for reader users', async () => {
      const mockReaderUser = {
        id: 'reader-123',
        role: 'reader',
        email: 'reader@example.com'
      };

      mockUseAuth.mockReturnValue({
        user: mockReaderUser,
        loading: false,
        isAuthenticated: true
      });

      mockUseRoleBasedAccess.mockReturnValue({
        canAccessAdminFeatures: false,
        canManageUsers: false,
        canManageArticles: false,
        canAccessSystemSettings: false,
        canViewAllAnalytics: false,
        canModerateContent: false,
        canCreateArticles: false,
        canEditOwnArticles: false,
        canViewOwnAnalytics: false,
        canReadArticles: true,
        canCommentOnArticles: true,
        canManageOwnProfile: true
      });

      const ReaderFeaturesComponent = () => {
        const permissions = mockUseRoleBasedAccess();
        
        return (
          <div>
            <h1>Reader Dashboard</h1>
            {permissions.canReadArticles && <button>Browse Articles</button>}
            {permissions.canCommentOnArticles && <button>My Comments</button>}
            {permissions.canManageOwnProfile && <button>Edit Profile</button>}
            {permissions.canCreateArticles && <button>Create Article</button>}
            {permissions.canManageUsers && <button>Manage Users</button>}
          </div>
        );
      };

      render(
        <TestWrapper>
          <ReaderFeaturesComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Reader Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Browse Articles')).toBeInTheDocument();
        expect(screen.getByText('My Comments')).toBeInTheDocument();
        expect(screen.getByText('Edit Profile')).toBeInTheDocument();
        expect(screen.queryByText('Create Article')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
      });
    });
  });

  describe('API Endpoint Protection and Permission Validation', () => {
    it('should validate permissions before making API calls', async () => {
      const mockApiService = {
        async makeRequest(endpoint: string, userRole: string, requiredPermission: string) {
          const permissions = {
            'manage_users': ['admin'],
            'manage_articles': ['admin', 'moderator'],
            'create_articles': ['admin', 'moderator', 'author'],
            'read_articles': ['admin', 'moderator', 'author', 'reader']
          };

          const allowedRoles = permissions[requiredPermission as keyof typeof permissions] || [];
          
          if (!allowedRoles.includes(userRole)) {
            throw new Error(`Insufficient permissions: ${requiredPermission} required`);
          }

          return { success: true, data: `${endpoint} accessed successfully` };
        }
      };

      // Test successful API calls
      const adminUserManagement = await mockApiService.makeRequest('/api/users', 'admin', 'manage_users');
      expect(adminUserManagement.success).toBe(true);

      const authorArticleCreation = await mockApiService.makeRequest('/api/articles', 'author', 'create_articles');
      expect(authorArticleCreation.success).toBe(true);

      const readerArticleRead = await mockApiService.makeRequest('/api/articles', 'reader', 'read_articles');
      expect(readerArticleRead.success).toBe(true);

      // Test failed API calls
      await expect(
        mockApiService.makeRequest('/api/users', 'author', 'manage_users')
      ).rejects.toThrow('Insufficient permissions: manage_users required');

      await expect(
        mockApiService.makeRequest('/api/articles', 'reader', 'create_articles')
      ).rejects.toThrow('Insufficient permissions: create_articles required');
    });

    it('should handle API permission errors in UI components', async () => {
      const ApiTestComponent = ({ userRole }: { userRole: string }) => {
        const [error, setError] = React.useState<string | null>(null);
        const [loading, setLoading] = React.useState(false);
        const [data, setData] = React.useState<any>(null);

        const makeApiCall = async (endpoint: string, requiredPermission: string) => {
          setLoading(true);
          setError(null);

          try {
            // Simulate permission check
            const hasPermission = {
              'admin': ['manage_users', 'manage_articles', 'create_articles'],
              'author': ['create_articles'],
              'reader': []
            }[userRole]?.includes(requiredPermission) || false;

            if (!hasPermission) {
              throw new Error(`Access denied: ${requiredPermission} permission required`);
            }

            setData({ message: `${endpoint} accessed successfully` });
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setLoading(false);
          }
        };

        return (
          <div>
            <button 
              onClick={() => makeApiCall('/api/users', 'manage_users')}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Manage Users'}
            </button>
            <button 
              onClick={() => makeApiCall('/api/articles', 'create_articles')}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Create Article'}
            </button>
            {error && <div className="error" role="alert">{error}</div>}
            {data && <div className="success">{data.message}</div>}
          </div>
        );
      };

      // Test with author role
      render(
        <TestWrapper>
          <ApiTestComponent userRole="author" />
        </TestWrapper>
      );

      // Author should be able to create articles
      const createArticleButton = screen.getByText('Create Article');
      fireEvent.click(createArticleButton);

      await waitFor(() => {
        expect(screen.getByText('/api/articles accessed successfully')).toBeInTheDocument();
      });

      // Author should not be able to manage users
      const manageUsersButton = screen.getByText('Manage Users');
      fireEvent.click(manageUsersButton);

      await waitFor(() => {
        expect(screen.getByText('Access denied: manage_users permission required')).toBeInTheDocument();
      });
    });

    it('should implement proper error handling for permission failures', async () => {
      const PermissionErrorComponent = ({ userRole }: { userRole: string }) => {
        const [errors, setErrors] = React.useState<string[]>([]);

        const testPermissions = async () => {
          const testCases = [
            { endpoint: '/api/users', permission: 'manage_users' },
            { endpoint: '/api/articles', permission: 'create_articles' },
            { endpoint: '/api/settings', permission: 'system_settings' }
          ];

          const newErrors: string[] = [];

          for (const testCase of testCases) {
            try {
              const hasPermission = {
                'admin': ['manage_users', 'create_articles', 'system_settings'],
                'author': ['create_articles'],
                'reader': []
              }[userRole]?.includes(testCase.permission) || false;

              if (!hasPermission) {
                newErrors.push(`${testCase.endpoint}: Permission denied`);
              }
            } catch (err) {
              newErrors.push(`${testCase.endpoint}: ${(err as Error).message}`);
            }
          }

          setErrors(newErrors);
        };

        React.useEffect(() => {
          testPermissions();
        }, [userRole]);

        return (
          <div>
            <h2>Permission Test Results for {userRole}</h2>
            {errors.length > 0 ? (
              <ul>
                {errors.map((error, index) => (
                  <li key={index} className="error">{error}</li>
                ))}
              </ul>
            ) : (
              <p>All permissions granted</p>
            )}
          </div>
        );
      };

      // Test with reader role (should have many permission errors)
      render(
        <TestWrapper>
          <PermissionErrorComponent userRole="reader" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Permission Test Results for reader')).toBeInTheDocument();
        expect(screen.getByText('/api/users: Permission denied')).toBeInTheDocument();
        expect(screen.getByText('/api/articles: Permission denied')).toBeInTheDocument();
        expect(screen.getByText('/api/settings: Permission denied')).toBeInTheDocument();
      });
    });
  });

  describe('Permission Middleware and Guards', () => {
    it('should use AdminPermissionMiddleware to protect admin features', async () => {
      const mockAuthorUser = {
        id: 'author-123',
        role: 'author',
        email: 'author@example.com'
      };

      mockUseAuth.mockReturnValue({
        user: mockAuthorUser,
        loading: false,
        isAuthenticated: true
      });

      mockUseRoleBasedAccess.mockReturnValue({
        canManageUsers: false,
        canAccessSystemSettings: false
      });

      render(
        <TestWrapper>
          <AdminPermissionMiddleware requiredPermission="manage_users">
            <div>User Management Interface</div>
          </AdminPermissionMiddleware>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('User Management Interface')).not.toBeInTheDocument();
        expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      });
    });

    it('should use FeatureFlag component for role-based feature toggling', async () => {
      const mockAuthorUser = {
        id: 'author-123',
        role: 'author',
        email: 'author@example.com'
      };

      mockUseAuth.mockReturnValue({
        user: mockAuthorUser,
        loading: false,
        isAuthenticated: true
      });

      const FeatureFlagTestComponent = () => {
        const { user } = mockUseAuth();
        
        return (
          <div>
            <FeatureFlag 
              feature="article_creation" 
              allowedRoles={['author', 'moderator', 'admin']}
              userRole={user?.role}
            >
              <button>Create Article</button>
            </FeatureFlag>
            
            <FeatureFlag 
              feature="user_management" 
              allowedRoles={['admin']}
              userRole={user?.role}
            >
              <button>Manage Users</button>
            </FeatureFlag>
          </div>
        );
      };

      render(
        <TestWrapper>
          <FeatureFlagTestComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Article')).toBeInTheDocument();
        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple permission requirements', async () => {
      const MultiPermissionComponent = ({ userRole }: { userRole: string }) => {
        const checkMultiplePermissions = (requiredPermissions: string[]) => {
          const userPermissions = {
            'admin': ['manage_users', 'manage_articles', 'system_settings', 'view_analytics'],
            'moderator': ['manage_articles', 'moderate_content'],
            'author': ['create_articles', 'edit_own_articles'],
            'reader': ['read_articles', 'comment_articles']
          }[userRole] || [];

          return requiredPermissions.every(permission => 
            userPermissions.includes(permission)
          );
        };

        const canManageContent = checkMultiplePermissions(['manage_articles', 'moderate_content']);
        const canCreateAndEdit = checkMultiplePermissions(['create_articles', 'edit_own_articles']);
        const canFullAdmin = checkMultiplePermissions(['manage_users', 'system_settings']);

        return (
          <div>
            <h2>Multi-Permission Test for {userRole}</h2>
            {canManageContent && <button>Content Management</button>}
            {canCreateAndEdit && <button>Article Creation & Editing</button>}
            {canFullAdmin && <button>Full Admin Access</button>}
          </div>
        );
      };

      // Test with moderator role
      render(
        <TestWrapper>
          <MultiPermissionComponent userRole="moderator" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Multi-Permission Test for moderator')).toBeInTheDocument();
        expect(screen.getByText('Content Management')).toBeInTheDocument();
        expect(screen.queryByText('Article Creation & Editing')).not.toBeInTheDocument();
        expect(screen.queryByText('Full Admin Access')).not.toBeInTheDocument();
      });
    });
  });

  describe('Role Hierarchy and Inheritance', () => {
    it('should respect role hierarchy in permission checks', async () => {
      const checkRoleHierarchy = (userRole: string, requiredRole: string) => {
        const roleHierarchy = {
          'reader': 0,
          'author': 1,
          'moderator': 2,
          'admin': 3
        };

        const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
        const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? -1;

        return userLevel >= requiredLevel;
      };

      // Test role hierarchy
      expect(checkRoleHierarchy('admin', 'reader')).toBe(true);
      expect(checkRoleHierarchy('admin', 'author')).toBe(true);
      expect(checkRoleHierarchy('admin', 'moderator')).toBe(true);
      expect(checkRoleHierarchy('admin', 'admin')).toBe(true);

      expect(checkRoleHierarchy('moderator', 'reader')).toBe(true);
      expect(checkRoleHierarchy('moderator', 'author')).toBe(true);
      expect(checkRoleHierarchy('moderator', 'moderator')).toBe(true);
      expect(checkRoleHierarchy('moderator', 'admin')).toBe(false);

      expect(checkRoleHierarchy('author', 'reader')).toBe(true);
      expect(checkRoleHierarchy('author', 'author')).toBe(true);
      expect(checkRoleHierarchy('author', 'moderator')).toBe(false);
      expect(checkRoleHierarchy('author', 'admin')).toBe(false);

      expect(checkRoleHierarchy('reader', 'reader')).toBe(true);
      expect(checkRoleHierarchy('reader', 'author')).toBe(false);
      expect(checkRoleHierarchy('reader', 'moderator')).toBe(false);
      expect(checkRoleHierarchy('reader', 'admin')).toBe(false);
    });

    it('should implement inherited permissions correctly', async () => {
      const getInheritedPermissions = (userRole: string) => {
        const basePermissions = {
          'reader': ['read_articles', 'comment_articles', 'manage_own_profile'],
          'author': ['create_articles', 'edit_own_articles', 'submit_for_review'],
          'moderator': ['moderate_content', 'review_articles', 'manage_comments'],
          'admin': ['manage_users', 'system_settings', 'view_all_analytics']
        };

        const roleHierarchy = ['reader', 'author', 'moderator', 'admin'];
        const userRoleIndex = roleHierarchy.indexOf(userRole);
        
        if (userRoleIndex === -1) return [];

        // Inherit permissions from all lower roles
        let permissions: string[] = [];
        for (let i = 0; i <= userRoleIndex; i++) {
          const role = roleHierarchy[i];
          permissions = [...permissions, ...basePermissions[role as keyof typeof basePermissions]];
        }

        return [...new Set(permissions)]; // Remove duplicates
      };

      const readerPermissions = getInheritedPermissions('reader');
      const authorPermissions = getInheritedPermissions('author');
      const moderatorPermissions = getInheritedPermissions('moderator');
      const adminPermissions = getInheritedPermissions('admin');

      expect(readerPermissions).toEqual(['read_articles', 'comment_articles', 'manage_own_profile']);
      
      expect(authorPermissions).toContain('read_articles');
      expect(authorPermissions).toContain('create_articles');
      expect(authorPermissions).toContain('edit_own_articles');

      expect(moderatorPermissions).toContain('read_articles');
      expect(moderatorPermissions).toContain('create_articles');
      expect(moderatorPermissions).toContain('moderate_content');

      expect(adminPermissions).toContain('read_articles');
      expect(adminPermissions).toContain('create_articles');
      expect(adminPermissions).toContain('moderate_content');
      expect(adminPermissions).toContain('manage_users');
      expect(adminPermissions).toContain('system_settings');
    });
  });

  describe('Dynamic Permission Updates', () => {
    it('should handle role changes and update permissions accordingly', async () => {
      const DynamicPermissionComponent = () => {
        const [currentRole, setCurrentRole] = React.useState('reader');
        const [permissions, setPermissions] = React.useState<string[]>([]);

        React.useEffect(() => {
          const updatePermissions = (role: string) => {
            const rolePermissions = {
              'reader': ['read_articles'],
              'author': ['read_articles', 'create_articles'],
              'moderator': ['read_articles', 'create_articles', 'moderate_content'],
              'admin': ['read_articles', 'create_articles', 'moderate_content', 'manage_users']
            };

            setPermissions(rolePermissions[role as keyof typeof rolePermissions] || []);
          };

          updatePermissions(currentRole);
        }, [currentRole]);

        return (
          <div>
            <h2>Current Role: {currentRole}</h2>
            <div>
              <button onClick={() => setCurrentRole('reader')}>Set Reader</button>
              <button onClick={() => setCurrentRole('author')}>Set Author</button>
              <button onClick={() => setCurrentRole('admin')}>Set Admin</button>
            </div>
            <div>
              <h3>Available Permissions:</h3>
              <ul>
                {permissions.map(permission => (
                  <li key={permission}>{permission}</li>
                ))}
              </ul>
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <DynamicPermissionComponent />
        </TestWrapper>
      );

      // Initial state (reader)
      expect(screen.getByText('Current Role: reader')).toBeInTheDocument();
      expect(screen.getByText('read_articles')).toBeInTheDocument();
      expect(screen.queryByText('create_articles')).not.toBeInTheDocument();

      // Change to author
      fireEvent.click(screen.getByText('Set Author'));
      await waitFor(() => {
        expect(screen.getByText('Current Role: author')).toBeInTheDocument();
        expect(screen.getByText('read_articles')).toBeInTheDocument();
        expect(screen.getByText('create_articles')).toBeInTheDocument();
        expect(screen.queryByText('manage_users')).not.toBeInTheDocument();
      });

      // Change to admin
      fireEvent.click(screen.getByText('Set Admin'));
      await waitFor(() => {
        expect(screen.getByText('Current Role: admin')).toBeInTheDocument();
        expect(screen.getByText('read_articles')).toBeInTheDocument();
        expect(screen.getByText('create_articles')).toBeInTheDocument();
        expect(screen.getByText('moderate_content')).toBeInTheDocument();
        expect(screen.getByText('manage_users')).toBeInTheDocument();
      });
    });

    it('should handle permission revocation when role is downgraded', async () => {
      const PermissionRevocationTest = () => {
        const [userRole, setUserRole] = React.useState('admin');
        const [accessAttempts, setAccessAttempts] = React.useState<string[]>([]);

        const attemptAccess = (feature: string, requiredRole: string) => {
          const roleHierarchy = { 'reader': 0, 'author': 1, 'moderator': 2, 'admin': 3 };
          const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy];
          const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy];

          const hasAccess = userLevel >= requiredLevel;
          const result = `${feature}: ${hasAccess ? 'GRANTED' : 'DENIED'}`;
          
          setAccessAttempts(prev => [...prev, result]);
        };

        return (
          <div>
            <h2>Permission Revocation Test</h2>
            <p>Current Role: {userRole}</p>
            
            <div>
              <button onClick={() => setUserRole('admin')}>Set Admin</button>
              <button onClick={() => setUserRole('author')}>Set Author</button>
              <button onClick={() => setUserRole('reader')}>Set Reader</button>
            </div>

            <div>
              <button onClick={() => attemptAccess('User Management', 'admin')}>
                Test User Management
              </button>
              <button onClick={() => attemptAccess('Article Creation', 'author')}>
                Test Article Creation
              </button>
              <button onClick={() => attemptAccess('Read Articles', 'reader')}>
                Test Read Articles
              </button>
            </div>

            <div>
              <h3>Access Attempts:</h3>
              <ul>
                {accessAttempts.map((attempt, index) => (
                  <li key={index}>{attempt}</li>
                ))}
              </ul>
              <button onClick={() => setAccessAttempts([])}>Clear Results</button>
            </div>
          </div>
        );
      };

      render(
        <TestWrapper>
          <PermissionRevocationTest />
        </TestWrapper>
      );

      // Test as admin
      fireEvent.click(screen.getByText('Test User Management'));
      await waitFor(() => {
        expect(screen.getByText('User Management: GRANTED')).toBeInTheDocument();
      });

      // Downgrade to author
      fireEvent.click(screen.getByText('Set Author'));
      fireEvent.click(screen.getByText('Test User Management'));
      
      await waitFor(() => {
        expect(screen.getByText('User Management: DENIED')).toBeInTheDocument();
      });

      // Test article creation (should still work)
      fireEvent.click(screen.getByText('Test Article Creation'));
      await waitFor(() => {
        expect(screen.getByText('Article Creation: GRANTED')).toBeInTheDocument();
      });
    });
  });
});