
# Architecture Overview - The Flying Bus

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Development Patterns](#development-patterns)
7. [Performance Considerations](#performance-considerations)

## System Architecture

### High-Level Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │◄──►│   Supabase API   │◄──►│   PostgreSQL    │
│   (Frontend)    │    │   (Backend)      │    │   (Database)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
    ┌────▼────┐             ┌────▼────┐             ┌────▼────┐
    │ Static  │             │  Edge   │             │  Row    │
    │ Assets  │             │Functions│             │ Level   │
    │ (CDN)   │             │ (APIs)  │             │Security │
    └─────────┘             └─────────┘             └─────────┘
```

### Technology Stack

**Frontend Layer:**
- React 18 with TypeScript for type safety
- Vite for development and build tooling
- Tailwind CSS + shadcn/ui for consistent design
- React Query for server state management
- React Router for client-side routing

**Backend Layer:**
- Supabase for managed backend services
- PostgreSQL with Row Level Security (RLS)
- Edge Functions for custom business logic
- Real-time subscriptions for live features

**Infrastructure:**
- Lovable for deployment and hosting
- Supabase for database and auth hosting
- CDN for static asset delivery

## Frontend Architecture

### Component Hierarchy

```
App
├── Layout Components
│   ├── MainLayout (public pages)
│   └── AdminPortalLayout (admin pages)
├── Page Components
│   ├── Public Pages (Index, CategoryPage, ArticlePage)
│   └── Admin Pages (Dashboard, ArticleEditor, UserManagement)
├── Feature Components
│   ├── Articles (ArticleCard, DebateVote, VideoPlayer)
│   ├── Comments (CommentForm, CommentList, ReplyForm)
│   ├── Auth (SignInForm, SignUpForm, UserMenu)
│   └── Admin (ApprovalQueue, MediaManager, Analytics)
└── UI Components (shadcn/ui based)
    ├── Primitives (Button, Input, Dialog)
    └── Composite (DataTable, DatePicker, FileUpload)
```

### State Management Strategy

**Local Component State (useState)**
- Form inputs and UI state
- Component-specific loading states
- Temporary user interactions

**Server State (React Query)**
- Article data and metadata
- User profiles and authentication
- Comments and voting data
- Admin analytics and metrics

**Global State (Context API)**
- User authentication status
- Theme and UI preferences
- Debug and development tools
- Navigation state

### Hook Architecture

```
Custom Hooks
├── Data Hooks
│   ├── useArticleData() - Article fetching and caching
│   ├── useComments() - Comment management
│   └── useDashboardMetrics() - Admin metrics
├── Form Hooks
│   ├── useArticleForm() - Article creation/editing
│   ├── useZodForm() - Form validation wrapper
│   └── useAutoSave() - Draft saving functionality
├── Feature Hooks
│   ├── useAuth() - Authentication management
│   ├── useDebateVoting() - Voting functionality
│   └── useMediaManager() - File upload/management
└── Utility Hooks
    ├── useMobile() - Responsive design helpers
    ├── useDebounce() - Performance optimization
    └── useLocalStorage() - Client-side persistence
```

## Backend Architecture

### Database Schema Design

**Core Entities:**
```sql
-- Content Management
articles (id, title, content, status, user_id, category_id, featured)
categories (id, name, slug, description, color)
comments (id, content, article_id, user_id, parent_id)

-- User Management  
auth.users (managed by Supabase Auth)
user_profiles (user_id, display_name, bio, avatar_url, role)

-- Interaction Systems
votes (id, article_id, user_id, vote_type)
flagged_content (id, content_type, content_id, reason, status)

-- Media & Files
media_files (id, file_path, file_type, user_id, article_id)
```

**Relationship Patterns:**
- One-to-many: Users → Articles, Articles → Comments
- Many-to-many: Users ↔ Article Votes (via votes table)
- Hierarchical: Comments (self-referencing for replies)
- Polymorphic: Flagged Content (references multiple content types)

### Supabase Features Utilized

**Authentication:**
- Email/password authentication
- Social logins (configurable)
- Row Level Security (RLS) policies
- Role-based access control

**Database:**
- PostgreSQL with full ACID compliance
- Real-time subscriptions for live features
- Database functions for complex operations
- Triggers for data consistency

**Storage:**
- File upload and management
- Image optimization and resizing
- Secure file access with RLS

**Edge Functions:**
- Custom API endpoints
- Third-party service integrations
- Background processing tasks
- Email notifications

### API Design Patterns

**RESTful Services:**
```typescript
// Service layer organization
services/
├── articles/
│   ├── articleQueryService.ts    // GET operations
│   ├── articleMutationService.ts // POST/PUT/DELETE
│   └── articleValidationService.ts // Business logic
├── auth/
│   ├── authService.ts           // Authentication
│   └── profileService.ts        // User profiles
└── moderation/
    ├── approvalService.ts       // Content approval
    └── flaggingService.ts       // Content reporting
```

**Error Handling Strategy:**
- Standardized error responses
- Client-side error boundaries
- Professional logging system
- User-friendly error messages

## Data Flow

### Article Creation Flow

```
1. User Input
   ├── Form Validation (client-side)
   ├── Draft Auto-save (every 30s)
   └── Rich Text Processing

2. Submission Process
   ├── Final Validation
   ├── Data Sanitization
   ├── Image Upload (if any)
   └── Database Insert

3. Moderation Workflow
   ├── Automatic Checks
   ├── Queue for Review
   ├── Moderator Approval
   └── Publication

4. Post-Publication
   ├── Cache Invalidation
   ├── Real-time Updates
   ├── Search Index Update
   └── Analytics Tracking
```

### Authentication Flow

```
1. Login Attempt
   ├── Credential Validation
   ├── Session Creation
   └── JWT Token Generation

2. Authorized Requests
   ├── Token Verification
   ├── RLS Policy Check
   ├── Permission Validation
   └── Data Access

3. Session Management
   ├── Auto-refresh Tokens
   ├── Logout Handling
   └── Session Expiry
```

## Security Architecture

### Authentication & Authorization

**Multi-layered Security:**
1. **Client-side**: Route protection and UI access control
2. **API Layer**: JWT token validation
3. **Database**: Row Level Security (RLS) policies
4. **Application**: Role-based permission checks

**RLS Policy Examples:**
```sql
-- Users can only see their own articles in draft status
CREATE POLICY "Users can view own drafts" 
ON articles FOR SELECT 
USING (auth.uid() = user_id OR status != 'draft');

-- Only moderators can approve articles
CREATE POLICY "Moderators can approve" 
ON articles FOR UPDATE 
USING (user_role() IN ('moderator', 'admin'));
```

### Content Security

**Input Sanitization:**
- HTML sanitization for rich text content
- Image validation and processing
- URL validation for external links
- File type and size restrictions

**Content Moderation:**
- Automated content filtering
- Manual review processes
- Community reporting system
- Escalation workflows

### Data Protection

**Privacy Measures:**
- Personal data encryption
- Secure file storage
- Access logging and auditing
- GDPR compliance considerations

## Development Patterns

### Component Patterns

**Composition over Inheritance:**
```typescript
// Good: Composable components
<ArticleCard>
  <ArticleHeader title={title} author={author} />
  <ArticleContent content={content} />
  <ArticleFooter actions={actions} />
</ArticleCard>

// Avoid: Monolithic components
<MonolithicArticleComponent {...allProps} />
```

**Custom Hook Patterns:**
```typescript
// Data fetching hook
const useArticles = (filters) => {
  return useQuery({
    queryKey: ['articles', filters],
    queryFn: () => getArticles(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Form management hook
const useArticleForm = (articleId) => {
  const form = useForm({ resolver: zodResolver(articleSchema) });
  const { mutate: saveArticle } = useMutation(saveArticleAPI);
  
  return { form, saveArticle, /* other methods */ };
};
```

### Error Boundary Strategy

**Component Error Boundaries:**
```typescript
// Page-level error boundaries
<ErrorBoundary fallback={<PageErrorFallback />}>
  <ArticlePage />
</ErrorBoundary>

// Feature-level error boundaries  
<ErrorBoundary fallback={<FormErrorFallback />}>
  <ArticleEditor />
</ErrorBoundary>
```

### Testing Patterns

**Testing Strategy:**
- Unit tests for pure functions and hooks
- Integration tests for component interactions
- Service tests for API interactions
- End-to-end tests for critical user flows

## Performance Considerations

### Frontend Optimization

**Code Splitting:**
```typescript
// Route-based splitting
const AdminPortal = lazy(() => import('@/pages/Admin/AdminPortalIndex'));
const ArticleEditor = lazy(() => import('@/pages/Admin/ArticleEditor'));

// Component-based splitting for large features
const MediaManager = lazy(() => import('@/components/Admin/MediaManager'));
```

**Caching Strategy:**
- React Query for server state caching
- Browser caching for static assets
- Service worker for offline capabilities
- Local storage for user preferences

**Rendering Optimization:**
```typescript
// Memo for expensive calculations
const expensiveValue = useMemo(() => 
  performExpensiveCalculation(data), [data]
);

// Callback memoization
const handleClick = useCallback((id) => 
  onClick(id), [onClick]
);

// Component memoization
const ArticleCard = memo(({ article }) => {
  // Component implementation
});
```

### Backend Optimization

**Database Performance:**
- Proper indexing on frequently queried columns
- Query optimization with EXPLAIN ANALYZE
- Connection pooling for high concurrency
- Read replicas for read-heavy operations

**Caching Layers:**
- Database query result caching
- CDN for static assets
- Redis for session storage (if needed)
- Application-level caching for computed data

### Monitoring & Analytics

**Performance Monitoring:**
- Web Vitals tracking
- Database performance metrics
- API response time monitoring
- Error rate tracking

**User Analytics:**
- Page view tracking
- Feature usage analytics
- User engagement metrics
- Conversion funnel analysis

---

This architecture is designed to be scalable, maintainable, and secure while providing an excellent user experience for young journalists and their audience.
