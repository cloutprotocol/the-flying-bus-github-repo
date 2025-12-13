/**
 * Comment Queries and Mutations for Convex
 * Replaces Supabase comment operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * QUERIES
 */

// Get comments by article
export const getByArticle = query({
  args: {
    articleId: v.id("articles"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let comments = await ctx.db
      .query("comments")
      .withIndex("by_article", (q) => q.eq("article_id", args.articleId))
      .collect();

    // Filter by status if provided
    if (args.status) {
      comments = comments.filter((c) => c.status === args.status);
    }

    // Get user profiles for each comment
    const commentsWithProfiles = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.user_id as Id<"profiles">);
        return {
          ...comment,
          profile: user,
        };
      })
    );

    // Sort by created_at descending
    commentsWithProfiles.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return commentsWithProfiles;
  },
});

// Get comments by user
export const getByUser = query({
  args: { userId: v.id("profiles") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_user", (q) => q.eq("user_id", args.userId))
      .collect();

    // Sort by created_at descending
    comments.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    return comments;
  },
});

// Get flagged comments with pagination
export const getFlagged = query({
  args: {
    filter: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 10;
    const skip = (page - 1) * limit;
    const filter = args.filter ?? "flagged";
    const searchTerm = args.searchTerm ?? "";

    let comments = await ctx.db.query("comments").collect();

    // Apply status filter
    if (filter !== "all") {
      if (filter === "flagged") {
        comments = comments.filter((c) => c.status === "flagged");
      } else if (filter === "pending") {
        comments = comments.filter((c) => c.status === "pending");
      } else if (filter === "approved") {
        comments = comments.filter((c) => c.status === "approved");
      } else if (filter === "rejected") {
        comments = comments.filter((c) => c.status === "rejected");
      }
    }

    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      comments = comments.filter((c) =>
        c.content.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // Get user profiles for each comment
    const commentsWithProfiles = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.user_id as Id<"profiles">);
        return {
          ...comment,
          profile: user,
        };
      })
    );

    // Sort by created_at descending
    commentsWithProfiles.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = commentsWithProfiles.length;
    const paginatedComments = commentsWithProfiles.slice(skip, skip + limit);

    return {
      comments: paginatedComments,
      count: totalCount,
    };
  },
});

// Get comment by ID
export const getById = query({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.commentId);
    if (!comment) return null;

    const user = await ctx.db.get(comment.user_id as Id<"profiles">);

    return {
      ...comment,
      profile: user,
    };
  },
});

/**
 * MUTATIONS
 */

// Create comment
export const create = mutation({
  args: {
    article_id: v.id("articles"),
    user_id: v.id("profiles"),
    content: v.string(),
    parent_comment_id: v.optional(v.id("comments")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const commentId = await ctx.db.insert("comments", {
      article_id: args.article_id,
      user_id: args.user_id,
      content: args.content,
      parent_comment_id: args.parent_comment_id,
      status: args.status ?? "pending",
      like_count: 0,
      created_at: now,
      updated_at: now,
    });

    return commentId;
  },
});

// Update comment
export const update = mutation({
  args: {
    id: v.id("comments"),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
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

// Update comment status
export const updateStatus = mutation({
  args: {
    id: v.id("comments"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updated_at: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Delete comment
export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Increment like count
export const incrementLikeCount = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");

    await ctx.db.patch(args.id, {
      like_count: comment.like_count + 1,
    });

    return { success: true };
  },
});

// Decrement like count
export const decrementLikeCount = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const comment = await ctx.db.get(args.id);
    if (!comment) throw new Error("Comment not found");

    await ctx.db.patch(args.id, {
      like_count: Math.max(0, comment.like_count - 1),
    });

    return { success: true };
  },
});
