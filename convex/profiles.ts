/**
 * Profile Queries and Mutations for Convex
 * Replaces Supabase profile operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * QUERIES
 */

import { auth } from "./auth";

// Get profile by ID
export const getById = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.profileId);
  },
});

// Get current user's profile
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    // Try multiple ways to get the userId for debugging
    const userId = await auth.getUserId(ctx);
    console.log('[getMyProfile] auth.getUserId():', userId);

    // Also check if there's a session at all
    const session = await ctx.auth.getUserIdentity();
    console.log('[getMyProfile] ctx.auth.getUserIdentity():', session ? 'EXISTS' : 'NULL');
    if (session) {
      console.log('[getMyProfile] session.subject:', session.subject);
      console.log('[getMyProfile] session.tokenIdentifier:', session.tokenIdentifier);
    }

    if (!userId) {
      console.log('[getMyProfile] No userId from auth.getUserId(), returning null');
      return null;
    }

    // Find profile linked to this Auth userId
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    console.log('[getMyProfile] Found profile by userId:', profile ? 'YES' : 'NO');

    // If profile is null, let's also check if any profiles exist without userId
    if (!profile) {
      const allProfiles = await ctx.db.query("profiles").collect();
      console.log('[getMyProfile] Total profiles in DB:', allProfiles.length);
      console.log('[getMyProfile] Profiles with userId:', allProfiles.filter(p => p.userId).length);

      // Try to find by email from the auth user
      if (session?.email) {
        const userEmail = session.email;
        const profileByEmail = await ctx.db
          .query("profiles")
          .withIndex("by_email", (q) => q.eq("email", userEmail))
          .first();
        console.log('[getMyProfile] Found profile by email:', profileByEmail ? 'YES' : 'NO');
      }
    }

    return profile;
  },
});

// Get profile by email
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get profile by username
export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
  },
});

// Get profiles by role
export const getByRole = query({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

// Get all profiles with pagination and search
export const getAll = query({
  args: {
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const page = args.page ?? 1;
    const limit = args.limit ?? 20;
    const skip = (page - 1) * limit;

    let profiles = await ctx.db.query("profiles").collect();

    // Filter by role if provided
    if (args.role) {
      profiles = profiles.filter((p) => p.role === args.role);
    }

    // Filter by search term if provided
    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      profiles = profiles.filter(
        (p) =>
          (p.username && p.username.toLowerCase().includes(term)) ||
          (p.display_name && p.display_name.toLowerCase().includes(term)) ||
          p.email.toLowerCase().includes(term)
      );
    }

    // Sort by created_at descending
    profiles.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const totalCount = profiles.length;
    const paginatedProfiles = profiles.slice(skip, skip + limit);

    return {
      profiles: paginatedProfiles,
      count: totalCount,
    };
  },
});

/**
 * MUTATIONS
 */

// Create new profile
export const create = mutation({
  args: {
    email: v.string(),
    username: v.optional(v.string()),
    display_name: v.optional(v.string()),
    role: v.string(),
    bio: v.optional(v.string()),
    public_bio: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    crypto_wallet_address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    const profileId = await ctx.db.insert("profiles", {
      ...args,
      created_at: now,
      updated_at: now,
    });

    return profileId;
  },
});

// Update profile
export const update = mutation({
  args: {
    id: v.id("profiles"),
    username: v.optional(v.string()),
    display_name: v.optional(v.string()),
    bio: v.optional(v.string()),
    public_bio: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    crypto_wallet_address: v.optional(v.string()),
    badge_display_preferences: v.optional(v.any()),
    favorite_categories: v.optional(v.array(v.string())),
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

// Update role
export const updateRole = mutation({
  args: {
    id: v.id("profiles"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      role: args.role,
      updated_at: new Date().toISOString(),
    });

    return { success: true };
  },
});

// Delete profile
export const remove = mutation({
  args: { id: v.id("profiles") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

// Ensure profile exists for authenticated user
export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    console.log('[Profiles] ensureProfile called for userId:', userId);

    // Check if profile exists
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      console.log('[Profiles] Found existing profile:', existing._id);
      return existing._id;
    }

    // Fetch user details from Auth 'users' table
    const user = await ctx.db.get(userId);
    if (!user) {
      console.error('[Profiles] User record not found for userId:', userId);
      throw new Error("User record not found");
    }

    console.log('[Profiles] Creating new profile for user:', user.email);

    // Create new profile
    const now = new Date().toISOString();
    const profileId = await ctx.db.insert("profiles", {
      userId,
      email: user.email || "",
      role: 'reader',
      display_name: user.name || user.email?.split('@')[0] || "Reader",
      avatar_url: user.image,
      created_at: now,
      updated_at: now,
    });

    console.log('[Profiles] Created new profile:', profileId);

    return profileId;
  },
});
