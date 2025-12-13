/**
 * Video Article Queries and Mutations for Convex
 * Replaces Supabase video_articles operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * QUERIES
 */

// Get video article by article ID
export const getByArticleId = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("video_articles")
      .withIndex("by_article", (q) => q.eq("article_id", args.articleId))
      .first();
  },
});

/**
 * MUTATIONS
 */

// Create video article
export const create = mutation({
  args: {
    article_id: v.id("articles"),
    video_url: v.string(),
    video_duration: v.optional(v.number()),
    video_platform: v.optional(v.string()),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const videoArticleId = await ctx.db.insert("video_articles", {
      ...args,
      created_at: now,
      updated_at: now,
    });

    return videoArticleId;
  },
});

// Update video article
export const update = mutation({
  args: {
    id: v.id("video_articles"),
    video_url: v.optional(v.string()),
    video_duration: v.optional(v.number()),
    video_platform: v.optional(v.string()),
    transcript: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    return id;
  },
});

// Delete video article
export const remove = mutation({
  args: { id: v.id("video_articles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
