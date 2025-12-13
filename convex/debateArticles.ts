/**
 * Debate Article Queries and Mutations for Convex
 * Replaces Supabase debate_articles operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * QUERIES
 */

// Get debate article by article ID
export const getByArticleId = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("debate_articles")
      .withIndex("by_article", (q) => q.eq("article_id", args.articleId))
      .first();
  },
});

/**
 * MUTATIONS
 */

// Create debate article
export const create = mutation({
  args: {
    article_id: v.id("articles"),
    pro_content: v.string(),
    con_content: v.string(),
    pro_author_id: v.optional(v.id("profiles")),
    con_author_id: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const debateArticleId = await ctx.db.insert("debate_articles", {
      ...args,
      created_at: now,
      updated_at: now,
    });

    return debateArticleId;
  },
});

// Update debate article
export const update = mutation({
  args: {
    id: v.id("debate_articles"),
    pro_content: v.optional(v.string()),
    con_content: v.optional(v.string()),
    pro_author_id: v.optional(v.id("profiles")),
    con_author_id: v.optional(v.id("profiles")),
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

// Delete debate article
export const remove = mutation({
  args: { id: v.id("debate_articles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
