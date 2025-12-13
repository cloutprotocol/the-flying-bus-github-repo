/**
 * Dashboard metrics and activity queries for Convex
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { auth } from "./auth";

export const getMetrics = query({
  args: { role: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const role = (args.role || 'reader').toLowerCase();

    // Admin: totals across collections
    if (role === 'admin') {
      const [articles, profiles, comments] = await Promise.all([
        ctx.db.query('articles').collect(),
        ctx.db.query('profiles').collect(),
        ctx.db.query('comments').collect(),
      ]);
      return {
        totalArticles: articles.length,
        totalUsers: profiles.length,
        commentCount: comments.length,
        pendingReviews: articles.filter(a => a.status === 'pending_review').length,
      };
    }

    // Moderator: content-centric counts
    if (role === 'moderator') {
      const [articles, comments, categories] = await Promise.all([
        ctx.db.query('articles').collect(),
        ctx.db.query('comments').collect(),
        ctx.db.query('categories').collect(),
      ]);
      return {
        totalArticles: articles.length,
        commentCount: comments.length,
        pendingReviews: articles.filter(a => a.status === 'pending_review').length,
        categoriesCount: categories.length,
      };
    }

    // Author: user-specific counts
    if (role === 'author') {
      const userId = await auth.getUserId(ctx);
      if (!userId) return {};
      const profile = await ctx.db
        .query('profiles')
        .withIndex('by_userId', q => q.eq('userId', userId))
        .first();
      if (!profile) return {};

      const articles = await ctx.db
        .query('articles')
        .withIndex('by_author', q => q.eq('author_id', profile._id))
        .collect();

      return {
        myArticles: articles.length,
        myComments: 0,
        myArticleViews: articles.reduce((sum, a) => sum + (a.view_count || 0), 0),
        articlesInReview: articles.filter(a => a.status === 'pending_review').length,
        articlesPublished: articles.filter(a => a.status === 'published').length,
      };
    }

    // Reader: no metrics
    return {};
  },
});

export const getRecentActivities = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const items = await ctx.db.query('activities').collect();
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const recent = items.slice(0, limit);

    // Attach basic profile info
    const withProfiles = await Promise.all(
      recent.map(async (a) => {
        let profile: any = null;
        try {
          // @ts-ignore
          profile = await ctx.db.get(a.user_id);
        } catch {}
        return { ...a, profile: profile ? { display_name: profile.display_name, avatar_url: profile.avatar_url } : null };
      })
    );

    return withProfiles;
  },
});

