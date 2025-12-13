/**
 * Tag Queries and Mutations for Convex
 * Replaces Supabase tags and article_tags operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * TAG QUERIES
 */

// Get all tags
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tags").collect();
  },
});

// Get tag by ID
export const getById = query({
  args: { tagId: v.id("tags") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tagId);
  },
});

// Get tag by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Get tags for an article
export const getByArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const articleTags = await ctx.db
      .query("article_tags")
      .withIndex("by_article", (q) => q.eq("article_id", args.articleId))
      .collect();

    const tags = await Promise.all(
      articleTags.map(async (at) => {
        return await ctx.db.get(at.tag_id as Id<"tags">);
      })
    );

    return tags.filter((t) => t !== null);
  },
});

/**
 * TAG MUTATIONS
 */

// Create tag
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const tagId = await ctx.db.insert("tags", {
      name: args.name,
      slug: args.slug,
      created_at: now,
    });

    return tagId;
  },
});

// Delete tag
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    // Delete all article_tags associations first
    const articleTags = await ctx.db
      .query("article_tags")
      .withIndex("by_tag", (q) => q.eq("tag_id", args.id))
      .collect();

    await Promise.all(articleTags.map((at) => ctx.db.delete(at._id)));

    // Delete the tag
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * ARTICLE_TAGS MUTATIONS
 */

// Add tag to article
export const addToArticle = mutation({
  args: {
    article_id: v.id("articles"),
    tag_id: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Check if association already exists
    const existing = await ctx.db
      .query("article_tags")
      .withIndex("by_article", (q) => q.eq("article_id", args.article_id))
      .collect();

    const alreadyExists = existing.some((at) => at.tag_id === args.tag_id);

    if (alreadyExists) {
      return { success: true, message: "Tag already associated" };
    }

    await ctx.db.insert("article_tags", {
      article_id: args.article_id,
      tag_id: args.tag_id,
      created_at: now,
    });

    return { success: true };
  },
});

// Remove tag from article
export const removeFromArticle = mutation({
  args: {
    article_id: v.id("articles"),
    tag_id: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const articleTags = await ctx.db
      .query("article_tags")
      .withIndex("by_article", (q) => q.eq("article_id", args.article_id))
      .collect();

    const toDelete = articleTags.find((at) => at.tag_id === args.tag_id);

    if (toDelete) {
      await ctx.db.delete(toDelete._id);
    }

    return { success: true };
  },
});
