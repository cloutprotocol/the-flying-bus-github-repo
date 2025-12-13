/**
 * Article Queries and Mutations for Convex
 * Replaces Supabase article operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { auth } from "./auth";

/**
 * QUERIES
 */

// Get article by ID with related data (author, category, video)
export const getById = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return null;

    // Get related author
    const author = article.author_id
      ? await ctx.db.get(article.author_id as Id<"profiles">)
      : null;

    // Get related category
    const category = article.category_id
      ? await ctx.db.get(article.category_id as Id<"categories">)
      : null;

    // Get video data if article type is video
    let videoData = null;
    if (article.article_type === "video") {
      videoData = await ctx.db
        .query("video_articles")
        .withIndex("by_article", (q) => q.eq("article_id", args.articleId))
        .first();
    }

    // Get debate data if article type is debate
    let debateData = null;
    if (article.article_type === "debate") {
      debateData = await ctx.db
        .query("debate_articles")
        .withIndex("by_article", (q) => q.eq("article_id", args.articleId))
        .first();
    }

    return {
      ...article,
      author,
      category,
      videoData,
      debateData,
    };
  },
});

// Get articles by status with pagination
export const getByStatus = query({
  args: {
    status: v.optional(v.string()),
    categoryId: v.optional(v.id("categories")),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 10;
    const skip = (page - 1) * limit;

    let articles;

    // Apply status filter
    if (args.status && args.status !== "all") {
      articles = await ctx.db
        .query("articles")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      articles = await ctx.db.query("articles").collect();
    }

    // Apply category filter
    if (args.categoryId) {
      articles = articles.filter((a) => a.category_id === args.categoryId);
    }

    // Sort by updated_at descending
    articles.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA;
    });

    const totalCount = articles.length;
    const paginatedArticles = articles.slice(skip, skip + limit);

    return {
      articles: paginatedArticles,
      count: totalCount,
    };
  },
});

// Get published articles with pagination and filtering
export const getPublished = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.string()), // 'newest', 'oldest', 'a-z'
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = args.sortBy ?? 'newest';

    let articles = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .collect();

    // Filter by category if provided
    if (args.categoryId) {
      articles = articles.filter((a) => a.category_id === args.categoryId);
    }

    // Sort articles
    articles.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          {
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
            return dateA - dateB;
          }
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'newest':
        default:
          {
            const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
            const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
            return dateB - dateA;
          }
      }
    });

    const totalCount = articles.length;
    const paginatedArticles = articles.slice(skip, skip + limit);

    // Fetch related authors and categories for the paginated results
    const articlesWithRelations = await Promise.all(
      paginatedArticles.map(async (article) => {
        const author = article.author_id
          // @ts-ignore
          ? await ctx.db.get(article.author_id)
          : null;
        const category = article.category_id
          // @ts-ignore
          ? await ctx.db.get(article.category_id)
          : null;
        return { ...article, author, category };
      })
    );

    return {
      articles: articlesWithRelations,
      count: totalCount,
    };
  },
});

// Get articles by author
export const getByAuthor = query({
  args: {
    authorId: v.optional(v.string()), // Optional, if empty use current user
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let targetAuthorId = args.authorId;

    if (!targetAuthorId) {
      const userId = await auth.getUserId(ctx);
      if (!userId) return [];

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
      if (!profile) return [];
      targetAuthorId = profile._id;
    }

    let articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("author_id", targetAuthorId!))
      .collect();

    // Filter by status if provided
    if (args.status && args.status !== "all") {
      articles = articles.filter((a) => a.status === args.status);
    }

    // Sort by updated_at descending
    articles.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return dateB - dateA;
    });

    return articles;
  },
});

// Get article by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!article) return null;

    // Get related data
    const author = article.author_id
      ? await ctx.db.get(article.author_id as Id<"profiles">)
      : null;

    const category = article.category_id
      ? await ctx.db.get(article.category_id as Id<"categories">)
      : null;

    return {
      ...article,
      author,
      category,
    };
  },
});

/**
 * MUTATIONS
 */

// Common article fields
const articleFields = {
  title: v.optional(v.string()), // Optional for drafts
  content: v.optional(v.string()),
  excerpt: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  categoryId: v.optional(v.string()),
  articleType: v.optional(v.string()), // Default to standard
  slug: v.optional(v.string()),
  shouldHighlight: v.optional(v.boolean()),
  status: v.optional(v.string()),
};

// Unified Submit Mutation (Handles Create & Update + Feature Logic)
export const submit = mutation({
  args: {
    id: v.optional(v.id("articles")),
    ...articleFields,
    publishImmediately: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // 1. Authentication
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const userProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile) {
      throw new Error("Profile not found");
    }
    const profileId = userProfile._id;

    // 2. Featured Article Handling
    if (args.shouldHighlight) {
      const featuredArticles = await ctx.db
        .query("articles")
        // @ts-ignore
        .filter((q) => q.eq(q.field("featured"), true))
        .collect();

      for (const article of featuredArticles) {
        if (args.id && article._id === args.id) continue;
        await ctx.db.patch(article._id, { featured: false });
      }
    }

    // 3. Prepare Data
    const now = new Date().toISOString();
    const title = args.title?.trim() || "Untitled Draft";
    const slug = args.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "untitled";
    const status = args.status || (args.publishImmediately ? "published" : "pending_review");

    const articleData = {
      title,
      content: args.content?.trim() || "",
      excerpt: args.excerpt?.trim(),
      featured_image_url: args.imageUrl?.trim(),
      category_id: args.categoryId,
      featured: args.shouldHighlight || false,
      status,
      article_type: args.articleType || "standard",
      slug,
      author_id: profileId,
      updated_at: now,
      ...(status === "published" ? { published_at: now } : {}),
    };

    // 4. Update or Insert
    if (args.id) {
      // Auth Check
      const existing = await ctx.db.get(args.id);
      if (!existing) throw new Error("Article not found");
      if (existing.author_id !== profileId && userProfile.role !== "admin") {
        throw new Error("Unauthorized");
      }

      await ctx.db.patch(args.id, articleData);
      return args.id;
    } else {
      const newId = await ctx.db.insert("articles", {
        ...articleData,
        created_at: now,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
      });
      return newId;
    }
  },
});

// Request Review Mutation
export const requestReview = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const userProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile) throw new Error("Profile not found");

    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found");

    if (article.author_id !== userProfile._id && userProfile.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.articleId, {
      status: "pending_review",
      submitted_for_review_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Delete article (Secured)
export const remove = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const userProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!userProfile) throw new Error("Profile not found");

    const article = await ctx.db.get(args.id);
    if (!article) throw new Error("Article not found");

    // Only author or admin can delete
    if (article.author_id !== userProfile._id && userProfile.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Increment view count (Public)
export const incrementViewCount = mutation({
  args: { id: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.id);
    if (!article) {
      // Silent fail or throw? Throw for now.
      return null;
    }

    const currentCount = article.view_count ?? 0;
    await ctx.db.patch(args.id, {
      view_count: currentCount + 1,
    });

    return { success: true };
  },
});

// Compatibility: create article wrapper
export const create = mutation({
  args: {
    title: v.string(),
    content: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    categoryId: v.optional(v.string()),
    articleType: v.optional(v.string()),
    slug: v.optional(v.string()),
    shouldHighlight: v.optional(v.boolean()),
    publishImmediately: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Delegate to submit without id
    // @ts-ignore submit is defined in this module
    return await (await import('./articles')).submit.handler(ctx, { ...args });
  },
});

// Compatibility: update article wrapper
export const update = mutation({
  args: {
    id: v.id('articles'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    categoryId: v.optional(v.string()),
    articleType: v.optional(v.string()),
    slug: v.optional(v.string()),
    shouldHighlight: v.optional(v.boolean()),
    publishImmediately: v.optional(v.boolean()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    // Delegate to submit with id
    // @ts-ignore submit is defined in this module
    return await (await import('./articles')).submit.handler(ctx, { id, ...rest });
  },
});

// Compatibility: update only status
export const updateStatus = mutation({
  args: { id: v.id('articles'), status: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error('Unauthenticated');
    const userProfile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (!userProfile) throw new Error('Profile not found');
    const article = await ctx.db.get(args.id);
    if (!article) throw new Error('Article not found');
    if (article.author_id !== userProfile._id && userProfile.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    await ctx.db.patch(args.id, { status: args.status, updated_at: new Date().toISOString() });
    return { success: true };
  },
});
// Get Review History
export const getReviewHistory = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const userProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile) throw new Error("Profile not found");

    const article = await ctx.db.get(args.articleId);
    if (!article) return [];

    if (article.author_id !== userProfile._id && userProfile.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const reviews = await ctx.db
      .query("article_reviews")
      .withIndex("by_article", (q) => q.eq("article_id", args.articleId))
      .order("desc")
      .collect();

    const reviewsWithReviewer = await Promise.all(
      reviews.map(async (review) => {
        let reviewer: any = null;
        try {
          // @ts-ignore
          reviewer = await ctx.db.get(review.reviewer_id);
        } catch (e) {
          // If ID is invalid string
        }
        return {
          ...review,
          reviewer: reviewer ? { display_name: reviewer.display_name, avatar_url: reviewer.avatar_url } : null
        };
      })
    );

    return reviewsWithReviewer;
  },
});
