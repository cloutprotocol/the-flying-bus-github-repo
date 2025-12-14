/**
 * Category Queries and Mutations for Convex
 * Replaces Supabase category operations
 */

import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * QUERIES
 */

// Get all categories
export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();

    // Sort by display_order
    categories.sort((a, b) => {
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      return orderA - orderB;
    });

    return categories;
  },
});

// Get active categories
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const activeCategories = await ctx.db
      .query("categories")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    // Sort by display_order
    activeCategories.sort((a, b) => {
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      return orderA - orderB;
    });

    return activeCategories;
  },
});

// Get category by ID
export const getById = query({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.categoryId);
  },
});

// Get category by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    // Primary lookup via index
    const direct = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (direct) return direct;

    // Fallback: case-insensitive match for legacy data where slug casing wasn’t normalized
    const normalized = args.slug.trim().toLowerCase();
    const all = await ctx.db.query("categories").collect();
    return all.find((c) => (c.slug || '').toLowerCase() === normalized) || null;
  },
});

// Get child categories
export const getChildren = query({
  args: { parentId: v.id("categories") },
  handler: async (ctx, args) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parent_id", args.parentId))
      .collect();

    // Sort by display_order
    categories.sort((a, b) => {
      const orderA = a.display_order ?? 999;
      const orderB = b.display_order ?? 999;
      return orderA - orderB;
    });

    return categories;
  },
});

/**
 * MUTATIONS
 */

// Create category
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    parent_id: v.optional(v.id("categories")),
    display_order: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();

    // Normalize slug for uniqueness checks
    const normalizedSlug = args.slug.trim().toLowerCase();

    // Check for existing category with the same slug
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
      .first();

    if (existing) {
      throw new Error("Slug already exists");
    }

    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      // Store normalized slug to enforce consistent lookups
      slug: normalizedSlug,
      description: args.description,
      icon: args.icon,
      color: args.color,
      parent_id: args.parent_id,
      display_order: args.display_order,
      is_active: args.is_active ?? true,
      created_at: now,
      updated_at: now,
    });

    return categoryId;
  },
});

// Update category
export const update = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    color: v.optional(v.string()),
    parent_id: v.optional(v.id("categories")),
    display_order: v.optional(v.number()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    if (updates.slug) {
      const normalizedSlug = updates.slug.trim().toLowerCase();

      // Check for existing category with the same slug
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("Slug already exists");
      }

      // Use the normalized slug
      updates.slug = normalizedSlug;
    }

    await ctx.db.patch(id, {
      ...updates,
      updated_at: new Date().toISOString(),
    });

    return id;
  },
});

// Delete category
export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    // Check for child categories
    const children = await ctx.db
      .query("categories")
      .withIndex("by_parent", (q) => q.eq("parent_id", args.id))
      .first();

    if (children) {
      return { success: false, error: "Category has child categories" };
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
