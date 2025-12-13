# Convex Migration Guide

## Overview

This guide documents the migration from Supabase (PostgreSQL) to Convex for The Flying Bus application. All data has been successfully migrated to the Convex dev deployment, and the necessary queries and mutations have been created.

## Migration Status

✅ **COMPLETED:**
- Data migration to Convex dev deployment (83/83 records - 100% success)
- Convex schema definition (`convex/schema.ts`)
- Convex query and mutation functions created
- Convex provider and client setup
- Wrapper services for gradual migration

## Convex Deployments

### Dev Environment (Current Data)
- **URL:** `https://aromatic-pelican-422.convex.cloud`
- **Dashboard:** `https://dashboard.convex.dev/d/aromatic-pelican-422`
- **Deployment ID:** `dev:aromatic-pelican-422`
- **Status:** ✅ Data imported (83 records)

### Production Environment
- **URL:** `https://polished-avocet-511.convex.cloud`
- **Dashboard:** `https://dashboard.convex.dev/d/polished-avocet-511`
- **Status:** Empty (ready for production deployment)

## Environment Configuration

Update your `.env.local` file:

```env
# Convex Configuration
VITE_CONVEX_URL=https://aromatic-pelican-422.convex.cloud
CONVEX_DEPLOYMENT=dev:aromatic-pelican-422

# Keep Supabase config for gradual migration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Convex Files Created

### 1. Schema Definition
- **File:** `convex/schema.ts`
- **Description:** Complete schema matching Supabase tables with proper indexes

### 2. Query and Mutation Functions

#### Articles (`convex/articles.ts`)
- **Queries:**
  - `getById` - Get article by ID with related data (author, category, video, debate)
  - `getByStatus` - Get articles by status with pagination
  - `getPublished` - Get published articles with filtering
  - `getByAuthor` - Get articles by author
  - `getBySlug` - Get article by slug

- **Mutations:**
  - `create` - Create new article
  - `update` - Update article
  - `remove` - Delete article
  - `updateStatus` - Update article status
  - `incrementViewCount` - Increment view count
  - `incrementLikeCount` - Increment like count
  - `updateCommentCount` - Update comment count

#### Profiles (`convex/profiles.ts`)
- **Queries:**
  - `getById` - Get profile by ID
  - `getByEmail` - Get profile by email
  - `getByUsername` - Get profile by username
  - `getByRole` - Get profiles by role
  - `getAll` - Get all profiles with pagination

- **Mutations:**
  - `create` - Create new profile
  - `update` - Update profile
  - `updateRole` - Update user role
  - `remove` - Delete profile

#### Comments (`convex/comments.ts`)
- **Queries:**
  - `getByArticle` - Get comments for an article
  - `getByUser` - Get comments by user
  - `getFlagged` - Get flagged comments with filtering
  - `getById` - Get comment by ID

- **Mutations:**
  - `create` - Create comment
  - `update` - Update comment
  - `updateStatus` - Update comment status
  - `remove` - Delete comment
  - `incrementLikeCount` - Increment like count
  - `decrementLikeCount` - Decrement like count

#### Categories (`convex/categories.ts`)
- **Queries:**
  - `getAll` - Get all categories
  - `getActive` - Get active categories
  - `getById` - Get category by ID
  - `getBySlug` - Get category by slug
  - `getChildren` - Get child categories

- **Mutations:**
  - `create` - Create category
  - `update` - Update category
  - `remove` - Delete category

#### Video Articles (`convex/videoArticles.ts`)
- **Queries:**
  - `getByArticleId` - Get video data for an article

- **Mutations:**
  - `create` - Create video article
  - `update` - Update video article
  - `remove` - Delete video article

#### Debate Articles (`convex/debateArticles.ts`)
- **Queries:**
  - `getByArticleId` - Get debate data for an article

- **Mutations:**
  - `create` - Create debate article
  - `update` - Update debate article
  - `remove` - Delete debate article

#### Tags (`convex/tags.ts`)
- **Queries:**
  - `getAll` - Get all tags
  - `getById` - Get tag by ID
  - `getBySlug` - Get tag by slug
  - `getByArticle` - Get tags for an article

- **Mutations:**
  - `create` - Create tag
  - `remove` - Delete tag
  - `addToArticle` - Add tag to article
  - `removeFromArticle` - Remove tag from article

#### Invitations (`convex/invitations.ts`)
- **Token Queries:**
  - `getByToken` - Get invitation token by token string
  - `getByEmail` - Get invitation tokens by email
  - `getAllTokens` - Get all tokens with pagination

- **Token Mutations:**
  - `createToken` - Create invitation token
  - `updateToken` - Update invitation token
  - `markTokenAsUsed` - Mark token as used
  - `revokeToken` - Revoke token

- **Request Queries:**
  - `getAllRequests` - Get all invitation requests
  - `getRequestByEmail` - Get request by email

- **Request Mutations:**
  - `createRequest` - Create invitation request
  - `updateRequest` - Update invitation request
  - `removeRequest` - Delete invitation request

#### Activities & Audit Logs (`convex/activities.ts`)
- **Activity Queries:**
  - `getByUser` - Get activities by user
  - `getByType` - Get activities by type

- **Activity Mutations:**
  - `logActivity` - Create activity log

- **Audit Log Queries:**
  - `getAuditLogsByUser` - Get audit logs by user
  - `getAuditLogsByAction` - Get audit logs by action

- **Audit Log Mutations:**
  - `createAuditLog` - Create audit log

### 3. Client Setup

#### Convex Client (`src/lib/convex.ts`)
```typescript
import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
export const convex = new ConvexReactClient(convexUrl);
```

#### Provider Setup (`src/main.tsx`)
```typescript
import { ConvexProvider } from "convex/react";
import { convex } from './lib/convex';

<ConvexProvider client={convex}>
  {/* Your app */}
</ConvexProvider>
```

### 4. Wrapper Services

Wrapper services created in `src/services/convex/` for gradual migration:

- `articleConvexService.ts` - Article operations
- `commentConvexService.ts` - Comment operations
- `profileConvexService.ts` - Profile operations

These services provide a Supabase-compatible API while using Convex underneath.

## Migration Strategy

### Phase 1: Preparation (✅ COMPLETED)
1. ✅ Create Convex schema
2. ✅ Migrate data to Convex
3. ✅ Create Convex queries and mutations
4. ✅ Create wrapper services
5. ✅ Setup Convex provider

### Phase 2: Gradual Service Migration (NEXT STEPS)

Replace Supabase calls with Convex wrapper services one service at a time:

#### Example Migration

**Before (Supabase):**
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase
  .from('articles')
  .select('*')
  .eq('id', articleId)
  .single();
```

**After (Convex):**
```typescript
import { articleConvexService } from '@/services/convex/articleConvexService';

const { article, error } = await articleConvexService.getById(articleId);
```

#### Files to Update (Priority Order)

1. **Article Services:**
   - `src/services/articles/articleQueryService.ts`
   - `src/services/articles/articleMutationService.ts`
   - `src/services/articles/articleSubmissionService.ts`
   - `src/services/articles/articleReviewService.ts`
   - `src/services/articles/draft/unifiedDraftService.ts`

2. **Comment Services:**
   - `src/services/commentService.ts`
   - `src/services/moderationService.ts`

3. **Profile Services:**
   - `src/services/userService.ts`
   - `src/services/auth/profileService.ts`

4. **Category Services:**
   - `src/utils/categoryUtils.ts`

5. **Invitation Services:**
   - `src/services/invitationService.ts`

### Phase 3: React Hooks Migration

Migrate hooks to use Convex reactive queries:

**Before (Supabase):**
```typescript
const [articles, setArticles] = useState([]);

useEffect(() => {
  async function fetchArticles() {
    const { data } = await supabase.from('articles').select('*');
    setArticles(data);
  }
  fetchArticles();
}, []);
```

**After (Convex):**
```typescript
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const articles = useQuery(api.articles.getPublished, { page: 1, limit: 10 });
```

Benefits of Convex reactive queries:
- Automatic real-time updates
- No manual subscription management
- Built-in loading and error states
- Optimistic updates

### Phase 4: Component Migration

Update components to use Convex hooks:

#### Files to Update:
- `src/hooks/useComments.tsx`
- `src/hooks/useArticlePagination.tsx`
- `src/hooks/useDebateVoting.ts`
- `src/hooks/useDashboardMetrics.ts`
- `src/components/Admin/**/*.tsx`
- `src/pages/**/*.tsx`

### Phase 5: Authentication Migration

**Note:** Supabase Auth should remain unchanged as it handles user authentication. Only profile data operations need migration to Convex.

Profile operations:
- Create profile → Use `profileConvexService.create()`
- Update profile → Use `profileConvexService.update()`
- Fetch profile → Use `profileConvexService.getByEmail()`

## Key Differences: Supabase vs Convex

### 1. Data Fetching

**Supabase:**
- Async/await with manual state management
- Manual error handling
- Requires useEffect for data fetching

**Convex:**
- Reactive queries with `useQuery` hook
- Automatic re-fetching and caching
- Built-in loading and error states

### 2. Real-time Updates

**Supabase:**
```typescript
const subscription = supabase
  .channel('articles')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, handleChange)
  .subscribe();
```

**Convex:**
```typescript
// Queries are automatically reactive - no subscription code needed
const articles = useQuery(api.articles.getPublished);
```

### 3. Relationships

**Supabase:**
- SQL joins with `.select('*, profiles(*)')`
- Foreign key constraints

**Convex:**
- Fetch related data in query handler
- References stored as Id types
- Manual relationship loading in queries

### 4. IDs

**Supabase:**
- UUIDs (string format)
- Example: `'550e8400-e29b-41d4-a716-446655440000'`

**Convex:**
- Convex IDs (typed format)
- Example: `Id<"articles">`
- Type-safe references between documents

### 5. Filtering

**Supabase:**
```typescript
.eq('status', 'published')
.gt('view_count', 100)
.order('created_at', { ascending: false })
```

**Convex:**
```typescript
// In query handler
.withIndex("by_status", (q) => q.eq("status", "published"))
// Then filter and sort in JavaScript
.filter(a => a.view_count > 100)
.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
```

## Testing Strategy

### 1. Test Convex Functions
```bash
# Deploy to dev
CONVEX_DEPLOYMENT=dev:aromatic-pelican-422 npx convex deploy --typecheck=disable

# Test queries in dashboard
# Visit: https://dashboard.convex.dev/d/aromatic-pelican-422
```

### 2. Test Wrapper Services
Create test files in `src/services/convex/__tests__/`:
```typescript
import { articleConvexService } from '../articleConvexService';

test('should fetch article by ID', async () => {
  const { article, error } = await articleConvexService.getById('article-id');
  expect(error).toBeNull();
  expect(article).toBeDefined();
});
```

### 3. Integration Testing
- Test each migrated service independently
- Verify data matches between Supabase and Convex during transition
- Test real-time updates work correctly

### 4. End-to-End Testing
- Test complete user flows (article creation, commenting, etc.)
- Verify UI updates correctly with Convex data
- Test error handling and edge cases

## Deployment to Production

### 1. Test on Dev Deployment
```bash
# Ensure all tests pass
npm test

# Build application
npm run build

# Test with dev deployment
VITE_CONVEX_URL=https://aromatic-pelican-422.convex.cloud npm run preview
```

### 2. Deploy to Production Convex
```bash
# Switch to production deployment
export CONVEX_DEPLOYMENT=polished-avocet-511

# Deploy functions
npx convex deploy

# Import data to production
node import_to_prod.js
```

### 3. Update Environment Variables
```env
VITE_CONVEX_URL=https://polished-avocet-511.convex.cloud
CONVEX_DEPLOYMENT=polished-avocet-511
```

### 4. Deploy Application
```bash
npm run deploy:production
```

## Rollback Plan

If issues arise, you can easily rollback:

1. **Revert environment variables** to Supabase URLs
2. **Keep Supabase database active** during migration
3. **Gradual cutover** allows testing each component
4. **Data is in both systems** during transition

## Performance Considerations

### Convex Benefits:
- **Reactive Queries:** Automatic real-time updates without WebSocket management
- **Built-in Caching:** Reduced network requests
- **Optimistic Updates:** Better UX with immediate UI updates
- **Type Safety:** Full TypeScript support with generated types

### Optimization Tips:
1. Use indexes for frequently queried fields
2. Paginate large result sets
3. Avoid fetching unnecessary related data
4. Use Convex's built-in caching effectively

## Troubleshooting

### Issue: Convex client not connecting
**Solution:** Verify `VITE_CONVEX_URL` in `.env.local` matches your deployment URL

### Issue: Type errors with Convex IDs
**Solution:** Use proper type casting: `articleId as Id<"articles">`

### Issue: Queries returning stale data
**Solution:** Convex queries are reactive - if data seems stale, check your query parameters

### Issue: Authentication with Convex
**Solution:** Continue using Supabase Auth, only migrate data operations to Convex

## Next Steps

1. **Start with Article Services** - Begin migrating article-related operations
2. **Test Thoroughly** - Verify each migrated service works correctly
3. **Migrate Hooks** - Convert to reactive Convex queries
4. **Update Components** - Use Convex hooks in React components
5. **Monitor Performance** - Track application performance during migration
6. **Production Deployment** - Deploy to production Convex after thorough testing

## Support and Resources

- **Convex Documentation:** https://docs.convex.dev
- **Convex Dashboard (Dev):** https://dashboard.convex.dev/d/aromatic-pelican-422
- **Convex Dashboard (Prod):** https://dashboard.convex.dev/d/polished-avocet-511
- **Project Convex Config:** `convex.json`

## Summary

✅ **Completed:**
- All data migrated to Convex (83/83 records)
- Complete set of queries and mutations created
- Convex provider configured
- Wrapper services for gradual migration

🔄 **In Progress:**
- Service layer migration
- Hook conversion to reactive queries
- Component updates

📋 **Pending:**
- Full integration testing
- Production deployment
- Performance monitoring

The migration foundation is complete. You can now begin the gradual process of replacing Supabase calls with Convex operations, starting with the wrapper services and progressively moving to reactive hooks.
