/**
 * Invitation Queries and Mutations for Convex
 * Replaces Supabase invitation_tokens and invitation_requests operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * INVITATION TOKEN QUERIES
 */

// Get invitation token by token string
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitation_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
  },
});

// Get invitation tokens by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitation_tokens")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect();
  },
});

// Get all invitation tokens with pagination
export const getAllTokens = query({
  args: {
    status: v.optional(v.string()),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    let tokens = await ctx.db.query("invitation_tokens").collect();

    // Filter by status if provided
    if (args.status) {
      tokens = tokens.filter((t) => t.status === args.status);
    }

    // Sort by created_at descending
    tokens.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = tokens.length;
    const paginatedTokens = tokens.slice(skip, skip + limit);

    return {
      tokens: paginatedTokens,
      count: totalCount,
    };
  },
});

/**
 * INVITATION TOKEN MUTATIONS
 */

// Create invitation token
export const createToken = mutation({
  args: {
    token: v.string(),
    email: v.string(),
    role: v.string(),
    invited_by: v.id("profiles"),
    expires_at: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const tokenId = await ctx.db.insert("invitation_tokens", {
      token: args.token,
      email: args.email,
      role: args.role,
      invited_by: args.invited_by,
      status: "pending",
      expires_at: args.expires_at,
      created_at: now,
    });

    return tokenId;
  },
});

// Update invitation token
export const updateToken = mutation({
  args: {
    id: v.id("invitation_tokens"),
    status: v.optional(v.string()),
    used_at: v.optional(v.string()),
    used_by: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    await ctx.db.patch(id, updates);

    return id;
  },
});

// Mark token as used
export const markTokenAsUsed = mutation({
  args: {
    token: v.string(),
    used_by: v.id("profiles"),
  },
  handler: async (ctx, args) => {
    const invitationToken = await ctx.db
      .query("invitation_tokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitationToken) {
      throw new Error("Token not found");
    }

    await ctx.db.patch(invitationToken._id, {
      status: "accepted",
      used_at: new Date().toISOString(),
      used_by: args.used_by,
    });

    return { success: true };
  },
});

// Revoke token
export const revokeToken = mutation({
  args: { id: v.id("invitation_tokens") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "revoked",
    });

    return { success: true };
  },
});

/**
 * INVITATION REQUEST QUERIES
 */

// Get all invitation requests
export const getAllRequests = query({
  args: {
    status: v.optional(v.string()),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    let requests = await ctx.db.query("invitation_requests").collect();

    // Filter by status if provided
    if (args.status) {
      requests = requests.filter((r) => r.status === args.status);
    }

    // Sort by created_at descending
    requests.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = requests.length;
    const paginatedRequests = requests.slice(skip, skip + limit);

    return {
      requests: paginatedRequests,
      count: totalCount,
    };
  },
});

// Get invitation request by email
export const getRequestByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitation_requests")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

/**
 * INVITATION REQUEST MUTATIONS
 */

// Create invitation request
export const createRequest = mutation({
  args: {
    email: v.string(),
    first_name: v.string(),
    last_name: v.string(),
    bio: v.optional(v.string()),
    portfolio_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const requestId = await ctx.db.insert("invitation_requests", {
      email: args.email,
      first_name: args.first_name,
      last_name: args.last_name,
      bio: args.bio,
      portfolio_url: args.portfolio_url,
      status: "pending",
      created_at: now,
    });

    return requestId;
  },
});

// Update invitation request
export const updateRequest = mutation({
  args: {
    id: v.id("invitation_requests"),
    status: v.string(),
    reviewed_by: v.optional(v.id("profiles")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    await ctx.db.patch(args.id, {
      status: args.status,
      reviewed_by: args.reviewed_by,
      reviewed_at: now,
    });

    return { success: true };
  },
});

// Delete invitation request
export const removeRequest = mutation({
  args: { id: v.id("invitation_requests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
