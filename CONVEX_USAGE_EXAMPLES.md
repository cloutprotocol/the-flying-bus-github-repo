# Convex Usage Examples

This document provides practical examples of how to use Convex in your application, replacing Supabase patterns with Convex equivalents.

## Table of Contents
1. [Basic Queries](#basic-queries)
2. [Mutations](#mutations)
3. [React Hooks](#react-hooks)
4. [Real-time Updates](#real-time-updates)
5. [Pagination](#pagination)
6. [Error Handling](#error-handling)
7. [Component Examples](#component-examples)
8. [Migration Patterns](#migration-patterns)

---

## Basic Queries

### Fetching a Single Article

**Before (Supabase):**
```typescript
import { supabase } from '@/integrations/supabase/client';

async function fetchArticle(articleId: string) {
  const { data, error } = await supabase
    .from('articles')
    .select('*, profiles(*), categories(*)')
    .eq('id', articleId)
    .single();

  if (error) throw error;
  return data;
}
```

**After (Convex - Service Layer):**
```typescript
import { api } from '../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

async function fetchArticle(articleId: Id<"articles">) {
  const article = await convex.query(api.articles.getById, { articleId });
  return article; // Includes author, category, and video data
}
```

**After (Convex - React Hook):**
```typescript
import { useArticle } from '@/hooks/convex/useArticles';

function ArticleDetail({ articleId }: { articleId: Id<"articles"> }) {
  const article = useArticle(articleId);

  if (article === undefined) return <div>Loading...</div>;
  if (article === null) return <div>Article not found</div>;

  return <div>{article.title}</div>;
}
```

### Fetching Multiple Articles

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('articles')
  .select('*')
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(10);
```

**After (Convex - React Hook):**
```typescript
import { usePublishedArticles } from '@/hooks/convex/useArticles';

function ArticleList() {
  const articlesData = usePublishedArticles(undefined, 1, 10);

  if (!articlesData) return <div>Loading...</div>;

  return (
    <div>
      {articlesData.articles.map(article => (
        <ArticleCard key={article._id} article={article} />
      ))}
    </div>
  );
}
```

---

## Mutations

### Creating an Article

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('articles')
  .insert({
    title: 'My Article',
    content: 'Article content...',
    author_id: userId,
    status: 'draft'
  })
  .select()
  .single();
```

**After (Convex - React Hook):**
```typescript
import { useCreateArticle } from '@/hooks/convex/useArticles';

function CreateArticleButton() {
  const createArticle = useCreateArticle();

  const handleCreate = async () => {
    try {
      const articleId = await createArticle({
        title: 'My Article',
        slug: 'my-article',
        content: 'Article content...',
        article_type: 'standard',
        author_id: userId as Id<"profiles">,
        status: 'draft'
      });

      console.log('Created article:', articleId);
    } catch (error) {
      console.error('Failed to create article:', error);
    }
  };

  return <button onClick={handleCreate}>Create Article</button>;
}
```

### Updating an Article

**Before (Supabase):**
```typescript
const { data, error } = await supabase
  .from('articles')
  .update({ title: 'Updated Title' })
  .eq('id', articleId)
  .select()
  .single();
```

**After (Convex - React Hook):**
```typescript
import { useUpdateArticle } from '@/hooks/convex/useArticles';

function UpdateArticleButton({ articleId }: { articleId: Id<"articles"> }) {
  const updateArticle = useUpdateArticle();

  const handleUpdate = async () => {
    try {
      await updateArticle({
        id: articleId,
        title: 'Updated Title'
      });
    } catch (error) {
      console.error('Failed to update article:', error);
    }
  };

  return <button onClick={handleUpdate}>Update Article</button>;
}
```

### Deleting an Article

**Before (Supabase):**
```typescript
const { error } = await supabase
  .from('articles')
  .delete()
  .eq('id', articleId);
```

**After (Convex - React Hook):**
```typescript
import { useDeleteArticle } from '@/hooks/convex/useArticles';

function DeleteArticleButton({ articleId }: { articleId: Id<"articles"> }) {
  const deleteArticle = useDeleteArticle();

  const handleDelete = async () => {
    if (!confirm('Are you sure?')) return;

    try {
      await deleteArticle({ id: articleId });
    } catch (error) {
      console.error('Failed to delete article:', error);
    }
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

---

## React Hooks

### Article Hooks

```typescript
import {
  useArticle,
  useArticlesByStatus,
  usePublishedArticles,
  useArticlesByAuthor,
  useArticleBySlug,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle
} from '@/hooks/convex/useArticles';

// Fetch single article
const article = useArticle(articleId);

// Fetch articles by status
const drafts = useArticlesByStatus('draft');
const published = useArticlesByStatus('published');

// Fetch by author
const myArticles = useArticlesByAuthor(authorId, 'draft');

// Fetch by slug
const article = useArticleBySlug('my-article-slug');

// Mutations
const createArticle = useCreateArticle();
const updateArticle = useUpdateArticle();
const deleteArticle = useDeleteArticle();
```

### Comment Hooks

```typescript
import {
  useArticleComments,
  useUserComments,
  useFlaggedComments,
  useCreateComment,
  useUpdateCommentStatus
} from '@/hooks/convex/useComments';

// Fetch comments for an article
const comments = useArticleComments(articleId);

// Fetch approved comments only
const approvedComments = useArticleComments(articleId, 'approved');

// Fetch flagged comments for moderation
const flaggedComments = useFlaggedComments('flagged', '', 1, 10);

// Create comment
const createComment = useCreateComment();

await createComment({
  article_id: articleId,
  user_id: userId,
  content: 'Great article!',
  status: 'pending'
});
```

### Profile Hooks

```typescript
import {
  useProfile,
  useProfileByEmail,
  useProfileByUsername,
  useProfilesByRole,
  useUpdateProfile
} from '@/hooks/convex/useProfiles';

// Fetch profile by email
const profile = useProfileByEmail('user@example.com');

// Fetch all authors
const authors = useProfilesByRole('author');

// Update profile
const updateProfile = useUpdateProfile();

await updateProfile({
  id: profileId,
  display_name: 'New Name',
  bio: 'Updated bio'
});
```

### Category Hooks

```typescript
import {
  useCategories,
  useActiveCategories,
  useCategoryBySlug
} from '@/hooks/convex/useCategories';

// Fetch all categories
const categories = useCategories();

// Fetch active categories only
const activeCategories = useActiveCategories();

// Fetch category by slug
const category = useCategoryBySlug('technology');
```

---

## Real-time Updates

### Automatic Updates with Convex

**Supabase Required Manual Subscriptions:**
```typescript
// Supabase - Manual subscription management
useEffect(() => {
  const subscription = supabase
    .channel('articles')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'articles'
    }, (payload) => {
      // Manually update state
      setArticles(prev => [...prev, payload.new]);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

**Convex - Automatic Real-time:**
```typescript
// Convex - Automatically reactive, no subscription code needed!
function ArticleList() {
  // This query automatically updates when articles change
  const articlesData = usePublishedArticles();

  // No useEffect, no subscriptions, no manual state management
  // Just works! ✨

  return (
    <div>
      {articlesData?.articles.map(article => (
        <ArticleCard key={article._id} article={article} />
      ))}
    </div>
  );
}
```

### Live Comment Count

```typescript
function ArticleCommentCount({ articleId }: { articleId: Id<"articles"> }) {
  const comments = useArticleComments(articleId, 'approved');

  // This count updates in real-time as comments are added/removed!
  return <span>{comments?.length || 0} comments</span>;
}
```

---

## Pagination

### Paginated Article List

```typescript
import { useState } from 'react';
import { usePublishedArticles } from '@/hooks/convex/useArticles';

function PaginatedArticleList() {
  const [page, setPage] = useState(1);
  const limit = 10;

  const articlesData = usePublishedArticles(undefined, page, limit);

  if (!articlesData) return <div>Loading...</div>;

  const { articles, count } = articlesData;
  const totalPages = Math.ceil(count / limit);

  return (
    <div>
      <div className="articles">
        {articles.map(article => (
          <ArticleCard key={article._id} article={article} />
        ))}
      </div>

      <div className="pagination">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

---

## Error Handling

### Handling Loading and Error States

```typescript
function ArticleDetail({ articleId }: { articleId: Id<"articles"> }) {
  const article = useArticle(articleId);

  // undefined = loading
  if (article === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  // null = not found or error
  if (article === null) {
    return (
      <div className="text-center text-red-500 p-4">
        Article not found or failed to load
      </div>
    );
  }

  // data loaded successfully
  return (
    <article>
      <h1>{article.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: article.content }} />
    </article>
  );
}
```

### Error Handling with Mutations

```typescript
function CreateArticleForm() {
  const createArticle = useCreateArticle();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: any) => {
    setLoading(true);
    setError(null);

    try {
      const articleId = await createArticle(data);
      console.log('Article created:', articleId);
      // Navigate to article or show success message
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create article');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(formData); }}>
      {error && <div className="error">{error}</div>}
      <button disabled={loading}>
        {loading ? 'Creating...' : 'Create Article'}
      </button>
    </form>
  );
}
```

---

## Component Examples

### Article Dashboard with Filters

```typescript
import { useState } from 'react';
import { useArticlesByStatus } from '@/hooks/convex/useArticles';
import { useActiveCategories } from '@/hooks/convex/useCategories';

function ArticleDashboard() {
  const [status, setStatus] = useState<string>('all');
  const [categoryId, setCategoryId] = useState<Id<"categories"> | undefined>();

  const categories = useActiveCategories();
  const articlesData = useArticlesByStatus(status, categoryId);

  return (
    <div>
      {/* Status Filter */}
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">All Status</option>
        <option value="draft">Drafts</option>
        <option value="published">Published</option>
        <option value="pending_review">Pending Review</option>
      </select>

      {/* Category Filter */}
      <select
        value={categoryId || ''}
        onChange={(e) => setCategoryId(e.target.value as Id<"categories"> || undefined)}
      >
        <option value="">All Categories</option>
        {categories?.map(cat => (
          <option key={cat._id} value={cat._id}>{cat.name}</option>
        ))}
      </select>

      {/* Articles List */}
      <div>
        {articlesData?.articles.map(article => (
          <div key={article._id}>
            <h3>{article.title}</h3>
            <span>Status: {article.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Comment Moderation Dashboard

```typescript
import { useState } from 'react';
import { useFlaggedComments, useUpdateCommentStatus } from '@/hooks/convex/useComments';

function CommentModerationDashboard() {
  const [filter, setFilter] = useState('flagged');
  const [searchTerm, setSearchTerm] = useState('');

  const commentsData = useFlaggedComments(filter, searchTerm, 1, 20);
  const updateStatus = useUpdateCommentStatus();

  const handleApprove = async (commentId: Id<"comments">) => {
    await updateStatus({ id: commentId, status: 'approved' });
  };

  const handleReject = async (commentId: Id<"comments">) => {
    await updateStatus({ id: commentId, status: 'rejected' });
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search comments..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
        <option value="flagged">Flagged</option>
        <option value="pending">Pending</option>
        <option value="all">All</option>
      </select>

      <div>
        {commentsData?.comments.map(comment => (
          <div key={comment._id}>
            <p>{comment.content}</p>
            <p>By: {comment.profile?.display_name}</p>
            <button onClick={() => handleApprove(comment._id)}>Approve</button>
            <button onClick={() => handleReject(comment._id)}>Reject</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Migration Patterns

### Pattern 1: Service Layer First

Migrate services before components to maintain compatibility:

```typescript
// OLD: src/services/articleService.ts
import { supabase } from '@/integrations/supabase/client';

export async function getArticles() {
  const { data } = await supabase.from('articles').select('*');
  return data;
}

// NEW: src/services/articleService.ts
import { api } from '../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

export async function getArticles() {
  const result = await convex.query(api.articles.getPublished);
  return result.articles;
}

// Components using getArticles() don't need to change!
```

### Pattern 2: Gradual Hook Migration

Migrate hooks one at a time:

```typescript
// OLD: useArticles.ts (Supabase)
function useArticles() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    supabase.from('articles').select('*').then(({ data }) => {
      setArticles(data);
    });
  }, []);

  return articles;
}

// NEW: useArticles.ts (Convex)
import { usePublishedArticles } from '@/hooks/convex/useArticles';

function useArticles() {
  const articlesData = usePublishedArticles();
  return articlesData?.articles || [];
}

// Components using useArticles() don't need to change!
```

### Pattern 3: Feature Flag Approach

Use feature flags for A/B testing:

```typescript
const USE_CONVEX = import.meta.env.VITE_USE_CONVEX === 'true';

function useArticles() {
  if (USE_CONVEX) {
    return useConvexArticles();
  } else {
    return useSupabaseArticles();
  }
}
```

---

## Best Practices

### 1. Use TypeScript

Always use proper types from Convex:

```typescript
import { Id } from '../../convex/_generated/dataModel';

// Good ✅
const articleId: Id<"articles"> = "k123456789";

// Bad ❌
const articleId = "k123456789";
```

### 2. Handle Loading States

Always check for undefined (loading) and null (error):

```typescript
const data = useQuery(...);

if (data === undefined) return <Loading />;
if (data === null) return <Error />;

return <Success data={data} />;
```

### 3. Batch Mutations

When possible, batch mutations together:

```typescript
// Instead of multiple calls
await updateArticle({ id, title: 'New' });
await updateArticle({ id, content: 'New content' });

// Do one call
await updateArticle({
  id,
  title: 'New',
  content: 'New content'
});
```

### 4. Optimize Queries

Only query what you need:

```typescript
// If you only need the title, create a specific query in Convex
export const getTitles = query({
  handler: async (ctx) => {
    const articles = await ctx.db.query("articles").collect();
    return articles.map(a => ({ _id: a._id, title: a.title }));
  }
});
```

---

## Summary

### Key Differences

| Feature | Supabase | Convex |
|---------|----------|--------|
| **Real-time** | Manual subscriptions | Automatic |
| **Loading States** | Manual management | Built-in (`undefined`) |
| **Error Handling** | Check `error` property | Try/catch or `null` |
| **Type Safety** | Manual types | Generated types |
| **Relationships** | SQL joins | Fetch in handler |
| **IDs** | UUID strings | Typed `Id<"table">` |

### Next Steps

1. Start with service layer migration
2. Gradually convert hooks to use Convex
3. Update components to use new hooks
4. Test thoroughly at each step
5. Monitor performance and optimize

Happy migrating! 🚀
