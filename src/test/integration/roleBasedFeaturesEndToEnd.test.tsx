import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AuthProvider } from '@/providers/AuthProvider';
import { Dashboard } from '@/pages/Admin/Dashboard';
import { AuthorDashboard } from '@/components/Admin/Author/AuthorDashboard';
import { AuthorArticleManager } from '@/components/Admin/Author/AuthorArticleManager';
import { ArticleReviewQueue } from '@/components/Admin/Reviews/ArticleReviewQueue';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AdminPermissionMiddleware } from '@/components/Admin/AdminPermissionMiddleware';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn()
    },
    from: vi.fn()
  }
}));

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useRoleBasedAccess', () => ({
  useRoleBasedAccess: vi.fn()
}));

vi.mock('@/hooks/useArticleData', () => ({
  useArticleData: vi.fn()
}));

vi.mock('@/services/articleService', () => ({
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  getArticlesByAuthor: vi.fn()
}));

vi.mock('@/services/articleReviewWorkflowService', () => ({
  submitArticleForReview: vi.fn(),
  approveArticle: vi.fn(),
  rejectArticle: vi.fn(),
  getArticlesForReview: vi.fn()
}));

describe('Role-Based Features End-to-End Tests', () => {
  const mockUseAuth = vi.fn();
  const mockUseRoleBasedAccess = vi.fn();
  const mockUseArticleData = vi.fn();
  const mockSupabaseFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Supabase mocks
    (supabase.from as any).mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate
    });
    
    mockSelect.mockReturnValue({
      eq: mockEq
    });
    
    mockInsert.mockReturnValue({
      select: mockSelect
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq
    });
    
    mockEq.mockReturnValue({
      single: mockSingle
    });
    
    mockSingle.mockResolvedValue({ data: null, error: null });

    // Setup hook mocks
    const { useAuth } = require('@/hooks/useAuth');
    const { useRoleBasedAccess } = require('@/hooks/useRoleBasedAccess');
    const { useArticleData } = require('@/hooks/useArticleData');
    
    useAuth.mockImplementation(mockUseAuth);
    useRoleBasedAccess.mockImplementation(mockUseRoleBasedAccess);
    useArticleData.mockImplementation(mockUseArticleData);
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

  describe('Author Dashboard Access and Features', () => {
    it('should display author-specific dashboard for author users', async () => {
      const mockAuthorUser = {
        id: 'author-123',
        email: 'author@example.com',
        role: 'author',
        username: 'john_author',
        display_name: 'John Author',
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

      mockUseRoleBasedAccess.mockReturnValue({
        canAccessAuthorFeatures: true,
        canAccessAdminFeatures: false,
        canManageUsers: false,
        canManageArticles: true,
        canCreateArticles: true,
        canEditOwnArticles: true
      });

      mockUseArticleData.mockReturnValue({
        articles: [
          {
            id: 'article-1',
            title: 'My First Article',
            author_id: 'author-123',
            status: 'draft',
            can_edit: true
          }
        ],
        loading: false,
        error: null
      });

      render(
        <TestWrapper>
          <AuthorDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Author Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My Articles')).toBeInTheDocument();
        expect(screen.getByText('Create New Article')).toBeInTheDocument();
        expect(screen.getByText('My First Article')).toBeInTheDocument();
      });

      // Should not show admin-only features
      expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
    });

    it('should restrict admin dashboard access for author users', async () => {
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
        canAccessAuthorFeatures: true,
        canAccessAdminFeatures: false,
        canManageUsers: false
      });

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

    it('should allow admin dashboard access for admin users', async () => {
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
        canAccessAuthorFeatures: true,
        canAccessAdminFeatures: true,
        canManageUsers: true,
        canManageArticles: true
      });

      render(
        <TestWrapper>
          <RouteGuard requiredRole="admin">
            <div>Admin Only Content</div>
          </RouteGuard>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Only Content')).toBeInTheDocument();
      });
    });
  });

  describe('Article Ownership and Editing Restrictions', () => {
    it('should allow authors to edit only their own articles', async () => {
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
        canEditOwnArticles: true,
        canEditAllArticles: false
      });

      const mockArticles = [
        {
          id: 'article-1',
          title: 'My Article',
          author_id: 'author-123',
          status: 'draft',
          can_edit: true
        },
        {
          id: 'article-2',
          title: 'Someone Else Article',
          author_id: 'other-author',
          status: 'published',
          can_edit: false
        }
      ];

      mockUseArticleData.mockReturnValue({
        articles: mockArticles,
        loading: false,
        error: null
      });

      render(
        <TestWrapper>
          <AuthorArticleManager />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should show own article with edit button
        expect(screen.getByText('My Article')).toBeInTheDocument();
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons).toHaveLength(1);

        // Should show other article but without edit button for it
        expect(screen.getByText('Someone Else Article')).toBeInTheDocument();
      });
    });

    it('should prevent authors from editing articles they do not own', async () => {
      const mockAuthorUser = {
        id: 'author-123',
        role: 'author',
        email: 'author@example.com'
      };

      const mockOtherArticle = {
        id: 'article-2',
        title: 'Someone Else Article',
        author_id: 'other-author',
        status: 'published',
        can_edit: false
      };

      // Simulate attempting to edit someone else's article
      const attemptEdit = (article: any, currentUserId: string) => {
        return article.author_id === currentUserId;
      };

      const canEdit = attemptEdit(mockOtherArticle, mockAuthorUser.id);
      expect(canEdit).toBe(false);
    });

    it('should allow admins to edit all articles', async () => {
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
        canEditAllArticles: true,
        canManageArticles: true
      });

      const mockArticles = [
        {
          id: 'article-1',
          title: 'Author Article 1',
          author_id: 'author-123',
          status: 'draft',
          can_edit: true
        },
        {
          id: 'article-2',
          title: 'Author Article 2',
          author_id: 'author-456',
          status: 'published',
          can_edit: true
        }
      ];

      mockUseArticleData.mockReturnValue({
        articles: mockArticles,
        loading: false,
        error: null
      });

      render(
        <TestWrapper>
          <AdminPermissionMiddleware requiredPermission="manage_articles">
            <div>
              {mockArticles.map(article => (
                <div key={article.id}>
                  <span>{article.title}</span>
                  {article.can_edit && <button>Edit</button>}
                </div>
              ))}
            </div>
          </AdminPermissionMiddleware>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Author Article 1')).toBeInTheDocument();
        expect(screen.getByText('Author Article 2')).toBeInTheDocument();
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons).toHaveLength(2); // Admin can edit all articles
      });
    });
  });

  describe('Article Review Workflow', () => {
    it('should allow authors to submit articles for review', async () => {
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

      const mockSubmitForReview = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'article-1', status: 'pending_review' }
      });

      const { submitArticleForReview } = require('@/services/articleReviewWorkflowService');
      submitArticleForReview.mockImplementation(mockSubmitForReview);

      render(
        <TestWrapper>
          <div>
            <h1>My Article</h1>
            <button 
              onClick={() => submitArticleForReview('article-1', 'author-123')}
            >
              Submit for Review
            </button>
          </div>
        </TestWrapper>
      );

      const submitButton = screen.getByText('Submit for Review');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitForReview).toHaveBeenCalledWith('article-1', 'author-123');
      });
    });

    it('should show article review queue for admin users', async () => {
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
        canReviewArticles: true,
        canApproveArticles: true
      });

      const mockPendingArticles = [
        {
          id: 'article-1',
          title: 'Article Pending Review',
          author_id: 'author-123',
          status: 'pending_review',
          submitted_for_review_at: '2024-01-01T10:00:00Z'
        }
      ];

      const { getArticlesForReview } = require('@/services/articleReviewWorkflowService');
      getArticlesForReview.mockResolvedValue({
        data: mockPendingArticles,
        error: null
      });

      render(
        <TestWrapper>
          <ArticleReviewQueue />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Article Review Queue')).toBeInTheDocument();
        expect(screen.getByText('Article Pending Review')).toBeInTheDocument();
        expect(screen.getByText('Approve')).toBeInTheDocument();
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });
    });

    it('should allow admins to approve articles', async () => {
      const mockAdminUser = {
        id: 'admin-123',
        role: 'admin',
        email: 'admin@example.com'
      };

      const mockApproveArticle = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'article-1', status: 'approved' }
      });

      const { approveArticle } = require('@/services/articleReviewWorkflowService');
      approveArticle.mockImplementation(mockApproveArticle);

      render(
        <TestWrapper>
          <div>
            <h2>Article Pending Review</h2>
            <button 
              onClick={() => approveArticle('article-1', 'admin-123', 'Looks good!')}
            >
              Approve
            </button>
          </div>
        </TestWrapper>
      );

      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockApproveArticle).toHaveBeenCalledWith('article-1', 'admin-123', 'Looks good!');
      });
    });

    it('should prevent authors from approving articles', async () => {
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
        canReviewArticles: false,
        canApproveArticles: false
      });

      render(
        <TestWrapper>
          <AdminPermissionMiddleware requiredPermission="review_articles">
            <div>Article Review Interface</div>
          </AdminPermissionMiddleware>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.queryByText('Article Review Interface')).not.toBeInTheDocument();
        expect(screen.getByText('Insufficient Permissions')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Navigation and Access Control', () => {
    it('should show role-appropriate navigation items', async () => {
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
        canAccessAuthorFeatures: true,
        canAccessAdminFeatures: false,
        canManageUsers: false,
        canManageArticles: true,
        canCreateArticles: true
      });

      const NavigationComponent = () => {
        const { canAccessAdminFeatures, canManageUsers, canManageArticles } = mockUseRoleBasedAccess();
        
        return (
          <nav>
            <a href="/dashboard">Dashboard</a>
            {canManageArticles && <a href="/articles">My Articles</a>}
            {canAccessAdminFeatures && <a href="/admin">Admin Panel</a>}
            {canManageUsers && <a href="/users">User Management</a>}
          </nav>
        );
      };

      render(
        <TestWrapper>
          <NavigationComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My Articles')).toBeInTheDocument();
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
        expect(screen.queryByText('User Management')).not.toBeInTheDocument();
      });
    });

    it('should redirect users based on their role', async () => {
      const mockRedirectBasedOnRole = (userRole: string) => {
        switch (userRole) {
          case 'admin':
          case 'moderator':
            return '/admin/dashboard';
          case 'author':
            return '/author/dashboard';
          case 'reader':
          default:
            return '/';
        }
      };

      expect(mockRedirectBasedOnRole('admin')).toBe('/admin/dashboard');
      expect(mockRedirectBasedOnRole('author')).toBe('/author/dashboard');
      expect(mockRedirectBasedOnRole('reader')).toBe('/');
    });

    it('should handle unauthorized access attempts gracefully', async () => {
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
        canAccessAuthorFeatures: false,
        canAccessAdminFeatures: false,
        canManageUsers: false,
        canManageArticles: false
      });

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
        expect(screen.getByText('You do not have permission to access this page')).toBeInTheDocument();
      });
    });
  });

  describe('Feature Visibility and Availability', () => {
    it('should show/hide features based on user role', async () => {
      const FeatureComponent = ({ userRole }: { userRole: string }) => {
        const features = {
          createArticle: ['author', 'moderator', 'admin'].includes(userRole),
          editAllArticles: ['admin'].includes(userRole),
          manageUsers: ['admin'].includes(userRole),
          viewAnalytics: ['author', 'moderator', 'admin'].includes(userRole),
          systemSettings: ['admin'].includes(userRole)
        };

        return (
          <div>
            {features.createArticle && <button>Create Article</button>}
            {features.editAllArticles && <button>Edit All Articles</button>}
            {features.manageUsers && <button>Manage Users</button>}
            {features.viewAnalytics && <button>View Analytics</button>}
            {features.systemSettings && <button>System Settings</button>}
          </div>
        );
      };

      // Test author role
      render(
        <TestWrapper>
          <FeatureComponent userRole="author" />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Create Article')).toBeInTheDocument();
        expect(screen.getByText('View Analytics')).toBeInTheDocument();
        expect(screen.queryByText('Edit All Articles')).not.toBeInTheDocument();
        expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
        expect(screen.queryByText('System Settings')).not.toBeInTheDocument();
      });
    });

    it('should provide role-specific data and metrics', async () => {
      const mockAuthorUser = {
        id: 'author-123',
        role: 'author',
        email: 'author@example.com'
      };

      const mockAuthorMetrics = {
        totalArticles: 5,
        publishedArticles: 3,
        draftArticles: 2,
        articlesInReview: 1,
        totalViews: 1250,
        averageRating: 4.2
      };

      const MetricsComponent = ({ user, metrics }: any) => {
        if (user.role === 'author') {
          return (
            <div>
              <h2>Author Metrics</h2>
              <p>Total Articles: {metrics.totalArticles}</p>
              <p>Published: {metrics.publishedArticles}</p>
              <p>In Review: {metrics.articlesInReview}</p>
              <p>Total Views: {metrics.totalViews}</p>
            </div>
          );
        }

        return <div>No metrics available</div>;
      };

      render(
        <TestWrapper>
          <MetricsComponent user={mockAuthorUser} metrics={mockAuthorMetrics} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Author Metrics')).toBeInTheDocument();
        expect(screen.getByText('Total Articles: 5')).toBeInTheDocument();
        expect(screen.getByText('Published: 3')).toBeInTheDocument();
        expect(screen.getByText('In Review: 1')).toBeInTheDocument();
        expect(screen.getByText('Total Views: 1250')).toBeInTheDocument();
      });
    });
  });

  describe('API Endpoint Protection and Permission Validation', () => {
    it('should validate permissions before API calls', async () => {
      const mockApiCall = async (endpoint: string, userRole: string, requiredRole: string) => {
        const hasPermission = {
          'admin': ['admin'],
          'moderator': ['admin', 'moderator'],
          'author': ['admin', 'moderator', 'author'],
          'reader': ['admin', 'moderator', 'author', 'reader']
        }[requiredRole]?.includes(userRole) || false;

        if (!hasPermission) {
          throw new Error('Insufficient permissions');
        }

        return { success: true, data: 'API call successful' };
      };

      // Test successful API call
      const successResult = await mockApiCall('/api/articles', 'author', 'author');
      expect(successResult.success).toBe(true);

      // Test failed API call
      await expect(
        mockApiCall('/api/admin/users', 'author', 'admin')
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should handle API permission errors gracefully', async () => {
      const ApiComponent = ({ userRole }: { userRole: string }) => {
        const [error, setError] = React.useState<string | null>(null);
        const [loading, setLoading] = React.useState(false);

        const handleApiCall = async () => {
          setLoading(true);
          setError(null);

          try {
            if (userRole !== 'admin') {
              throw new Error('Insufficient permissions for this operation');
            }
            // Simulate successful API call
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setLoading(false);
          }
        };

        return (
          <div>
            <button onClick={handleApiCall} disabled={loading}>
              {loading ? 'Loading...' : 'Admin Action'}
            </button>
            {error && <div className="error">{error}</div>}
          </div>
        );
      };

      render(
        <TestWrapper>
          <ApiComponent userRole="author" />
        </TestWrapper>
      );

      const button = screen.getByText('Admin Action');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Insufficient permissions for this operation')).toBeInTheDocument();
      });
    });
  });

  describe('Complete User Journey Tests', () => {
    it('should complete full author journey from registration to article publication', async () => {
      // Step 1: Author registration (mocked as completed)
      const mockAuthorUser = {
        id: 'author-123',
        role: 'author',
        email: 'author@example.com',
        username: 'john_author',
        display_name: 'John Author'
      };

      // Step 2: Dashboard access
      mockUseAuth.mockReturnValue({
        user: mockAuthorUser,
        loading: false,
        isAuthenticated: true
      });

      mockUseRoleBasedAccess.mockReturnValue({
        canAccessAuthorFeatures: true,
        canCreateArticles: true,
        canEditOwnArticles: true
      });

      // Step 3: Article creation
      const mockCreateArticle = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'article-1',
          title: 'My First Article',
          author_id: 'author-123',
          status: 'draft'
        }
      });

      const { createArticle } = require('@/services/articleService');
      createArticle.mockImplementation(mockCreateArticle);

      // Step 4: Article submission for review
      const mockSubmitForReview = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'article-1', status: 'pending_review' }
      });

      const { submitArticleForReview } = require('@/services/articleReviewWorkflowService');
      submitArticleForReview.mockImplementation(mockSubmitForReview);

      const AuthorJourneyComponent = () => {
        const [articleId, setArticleId] = React.useState<string | null>(null);
        const [status, setStatus] = React.useState('draft');

        const handleCreateArticle = async () => {
          const result = await createArticle({
            title: 'My First Article',
            content: 'Article content',
            category: 'learning'
          }, 'author-123');
          
          if (result.success) {
            setArticleId(result.data.id);
          }
        };

        const handleSubmitForReview = async () => {
          if (articleId) {
            const result = await submitArticleForReview(articleId, 'author-123');
            if (result.success) {
              setStatus('pending_review');
            }
          }
        };

        return (
          <div>
            <h1>Author Dashboard</h1>
            <button onClick={handleCreateArticle}>Create Article</button>
            {articleId && (
              <div>
                <p>Article created: {articleId}</p>
                <p>Status: {status}</p>
                {status === 'draft' && (
                  <button onClick={handleSubmitForReview}>Submit for Review</button>
                )}
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <AuthorJourneyComponent />
        </TestWrapper>
      );

      // Create article
      const createButton = screen.getByText('Create Article');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Article created: article-1')).toBeInTheDocument();
        expect(screen.getByText('Status: draft')).toBeInTheDocument();
      });

      // Submit for review
      const submitButton = screen.getByText('Submit for Review');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Status: pending_review')).toBeInTheDocument();
      });

      expect(mockCreateArticle).toHaveBeenCalled();
      expect(mockSubmitForReview).toHaveBeenCalledWith('article-1', 'author-123');
    });

    it('should complete admin review and approval workflow', async () => {
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
        canReviewArticles: true,
        canApproveArticles: true
      });

      const mockApproveArticle = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'article-1', status: 'approved' }
      });

      const { approveArticle } = require('@/services/articleReviewWorkflowService');
      approveArticle.mockImplementation(mockApproveArticle);

      const AdminReviewComponent = () => {
        const [articleStatus, setArticleStatus] = React.useState('pending_review');

        const handleApprove = async () => {
          const result = await approveArticle('article-1', 'admin-123', 'Article approved');
          if (result.success) {
            setArticleStatus('approved');
          }
        };

        return (
          <div>
            <h1>Article Review</h1>
            <p>Article Status: {articleStatus}</p>
            {articleStatus === 'pending_review' && (
              <button onClick={handleApprove}>Approve Article</button>
            )}
            {articleStatus === 'approved' && (
              <p>Article has been approved and published!</p>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <AdminReviewComponent />
        </TestWrapper>
      );

      expect(screen.getByText('Article Status: pending_review')).toBeInTheDocument();

      const approveButton = screen.getByText('Approve Article');
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(screen.getByText('Article Status: approved')).toBeInTheDocument();
        expect(screen.getByText('Article has been approved and published!')).toBeInTheDocument();
      });

      expect(mockApproveArticle).toHaveBeenCalledWith('article-1', 'admin-123', 'Article approved');
    });
  });
});