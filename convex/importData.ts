/**
 * Data Import Script for Convex
 * Imports data from Supabase export to Convex
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Import profiles
export const importProfiles = mutation({
  args: {
    data: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const profile of args.data) {
      try {
        // Handle favorite_categories - ensure it's an array or undefined
        let favoriteCategories = profile.favorite_categories;
        if (favoriteCategories) {
          if (typeof favoriteCategories === 'string') {
            // Parse string like "{headliners,debates}" to array
            favoriteCategories = favoriteCategories
              .replace(/[{}]/g, '')
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else if (typeof favoriteCategories === 'object' && !Array.isArray(favoriteCategories)) {
            // Convert object to array or skip
            favoriteCategories = undefined;
          }
        }

        const id = await ctx.db.insert("profiles", {
          username: profile.username || undefined,
          display_name: profile.display_name || undefined,
          email: profile.email,
          role: profile.role || "user",
          bio: profile.bio || undefined,
          public_bio: profile.public_bio || undefined,
          avatar_url: profile.avatar_url || undefined,
          crypto_wallet_address: profile.crypto_wallet_address || undefined,
          badge_display_preferences: profile.badge_display_preferences || undefined,
          favorite_categories: favoriteCategories,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString(),
        });
        results.push({ oldId: profile.id, newId: id, status: "success" });
      } catch (error: any) {
        results.push({ oldId: profile.id, status: "error", error: error.message });
      }
    }

    return results;
  },
});

// Import categories
export const importCategories = mutation({
  args: {
    data: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const category of args.data) {
      try {
        const id = await ctx.db.insert("categories", {
          name: category.name,
          slug: category.slug,
          description: category.description || undefined,
          icon: category.icon || undefined,
          color: category.color || undefined,
          parent_id: category.parent_id || undefined,
          display_order: category.display_order || undefined,
          is_active: category.is_active !== false,
          created_at: category.created_at || new Date().toISOString(),
          updated_at: category.updated_at || new Date().toISOString(),
        });
        results.push({ oldId: category.id, newId: id, status: "success" });
      } catch (error: any) {
        results.push({ oldId: category.id, status: "error", error: error.message });
      }
    }

    return results;
  },
});

// Import articles
export const importArticles = mutation({
  args: {
    data: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const article of args.data) {
      try {
        const id = await ctx.db.insert("articles", {
          title: article.title,
          slug: article.slug,
          content: article.content || "",
          excerpt: article.excerpt || undefined,
          article_type: article.article_type || "standard",
          author_id: article.author_id,
          category_id: article.category_id || undefined,
          featured_image_url: article.featured_image_url || undefined,
          thumbnail_url: article.thumbnail_url || undefined,
          reading_time: article.reading_time || undefined,
          difficulty_level: article.difficulty_level || undefined,
          age_range: article.age_range || undefined,
          status: article.status || "draft",
          published_at: article.published_at || undefined,
          scheduled_for: article.scheduled_for || undefined,
          view_count: article.view_count || 0,
          like_count: article.like_count || 0,
          comment_count: article.comment_count || 0,
          meta_title: article.meta_title || undefined,
          meta_description: article.meta_description || undefined,
          meta_keywords: article.meta_keywords || undefined,
          created_at: article.created_at || new Date().toISOString(),
          updated_at: article.updated_at || new Date().toISOString(),
        });
        results.push({ oldId: article.id, newId: id, status: "success" });
      } catch (error: any) {
        results.push({ oldId: article.id, status: "error", error: error.message });
      }
    }

    return results;
  },
});

// Import comments
export const importComments = mutation({
  args: {
    data: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const comment of args.data) {
      try {
        const id = await ctx.db.insert("comments", {
          article_id: comment.article_id,
          user_id: comment.user_id,
          content: comment.content,
          parent_comment_id: comment.parent_comment_id || undefined,
          status: comment.status || "approved",
          like_count: comment.like_count || 0,
          created_at: comment.created_at || new Date().toISOString(),
          updated_at: comment.updated_at || new Date().toISOString(),
        });
        results.push({ oldId: comment.id, newId: id, status: "success" });
      } catch (error: any) {
        results.push({ oldId: comment.id, status: "error", error: error.message });
      }
    }

    return results;
  },
});

// Import tags
export const importTags = mutation({
  args: {
    data: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const tag of args.data) {
      try {
        const id = await ctx.db.insert("tags", {
          name: tag.name,
          slug: tag.slug,
          created_at: tag.created_at || new Date().toISOString(),
        });
        results.push({ oldId: tag.id, newId: id, status: "success" });
      } catch (error: any) {
        results.push({ oldId: tag.id, status: "error", error: error.message });
      }
    }

    return results;
  },
});

// Import debate articles
export const importDebateArticles = mutation({
  args: {
    data: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const debate of args.data) {
      try {
        const id = await ctx.db.insert("debate_articles", {
          article_id: debate.article_id,
          pro_content: debate.pro_content || "",
          con_content: debate.con_content || "",
          pro_author_id: debate.pro_author_id || undefined,
          con_author_id: debate.con_author_id || undefined,
          created_at: debate.created_at || new Date().toISOString(),
          updated_at: debate.updated_at || new Date().toISOString(),
        });
        results.push({ oldId: debate.id, newId: id, status: "success" });
      } catch (error: any) {
        results.push({ oldId: debate.id, status: "error", error: error.message });
      }
    }

    return results;
  },
});

// Import video articles
export const importVideoArticles = mutation({
  args: {
    data: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const results = [];

    for (const video of args.data) {
      try {
        const id = await ctx.db.insert("video_articles", {
          article_id: video.article_id,
          video_url: video.video_url,
          video_duration: video.video_duration || undefined,
          video_platform: video.video_platform || undefined,
          transcript: video.transcript || undefined,
          created_at: video.created_at || new Date().toISOString(),
          updated_at: video.updated_at || new Date().toISOString(),
        });
        results.push({ oldId: video.id, newId: id, status: "success" });
      } catch (error: any) {
        results.push({ oldId: video.id, status: "error", error: error.message });
      }
    }

    return results;
  },
});

// Batch import all data
export const importAll = mutation({
  args: {
    profiles: v.array(v.any()),
    categories: v.array(v.any()),
    articles: v.array(v.any()),
    comments: v.optional(v.array(v.any())),
    tags: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const results: Record<string, any> = {};

    // Import in dependency order
    const profileResults = [];
    for (const profile of args.profiles) {
      try {
        let favoriteCategories = profile.favorite_categories;
        if (favoriteCategories) {
          if (typeof favoriteCategories === 'string') {
            favoriteCategories = favoriteCategories
              .replace(/[{}]/g, '')
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
          } else if (typeof favoriteCategories === 'object' && !Array.isArray(favoriteCategories)) {
            favoriteCategories = undefined;
          }
        }
        const id = await ctx.db.insert("profiles", {
          username: profile.username || undefined,
          display_name: profile.display_name || undefined,
          email: profile.email,
          role: profile.role || "user",
          bio: profile.bio || undefined,
          public_bio: profile.public_bio || undefined,
          avatar_url: profile.avatar_url || undefined,
          crypto_wallet_address: profile.crypto_wallet_address || undefined,
          badge_display_preferences: profile.badge_display_preferences || undefined,
          favorite_categories: favoriteCategories,
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString(),
        });
        profileResults.push({ oldId: profile.id, newId: id, status: "success" });
      } catch (error: any) {
        profileResults.push({ oldId: profile.id, status: "error", error: error.message });
      }
    }
    results.profiles = profileResults;

    const categoryResults = [];
    for (const category of args.categories) {
      try {
        const id = await ctx.db.insert("categories", {
          name: category.name,
          slug: category.slug,
          description: category.description || undefined,
          icon: category.icon || undefined,
          color: category.color || undefined,
          parent_id: category.parent_id || undefined,
          display_order: category.display_order || undefined,
          is_active: category.is_active !== false,
          created_at: category.created_at || new Date().toISOString(),
          updated_at: category.updated_at || new Date().toISOString(),
        });
        categoryResults.push({ oldId: category.id, newId: id, status: "success" });
      } catch (error: any) {
        categoryResults.push({ oldId: category.id, status: "error", error: error.message });
      }
    }
    results.categories = categoryResults;

    const articleResults = [];
    for (const article of args.articles) {
      try {
        const id = await ctx.db.insert("articles", {
          title: article.title,
          slug: article.slug,
          content: article.content || "",
          excerpt: article.excerpt || undefined,
          article_type: article.article_type || "standard",
          author_id: article.author_id,
          category_id: article.category_id || undefined,
          featured_image_url: article.featured_image_url || article.cover_image || undefined,
          thumbnail_url: article.thumbnail_url || undefined,
          reading_time: article.reading_time || undefined,
          difficulty_level: article.difficulty_level || undefined,
          age_range: article.age_range || undefined,
          status: article.status || "draft",
          published_at: article.published_at || undefined,
          scheduled_for: article.scheduled_for || undefined,
          view_count: article.view_count || 0,
          like_count: article.like_count || 0,
          comment_count: article.comment_count || 0,
          meta_title: article.meta_title || undefined,
          meta_description: article.meta_description || undefined,
          meta_keywords: article.meta_keywords || undefined,
          created_at: article.created_at || new Date().toISOString(),
          updated_at: article.updated_at || new Date().toISOString(),
        });
        articleResults.push({ oldId: article.id, newId: id, status: "success" });
      } catch (error: any) {
        articleResults.push({ oldId: article.id, status: "error", error: error.message });
      }
    }
    results.articles = articleResults;

    if (args.comments) {
      const commentResults = [];
      for (const comment of args.comments) {
        try {
          const id = await ctx.db.insert("comments", {
            article_id: comment.article_id,
            user_id: comment.user_id,
            content: comment.content,
            parent_comment_id: comment.parent_comment_id || undefined,
            status: comment.status || "approved",
            like_count: comment.like_count || 0,
            created_at: comment.created_at || new Date().toISOString(),
            updated_at: comment.updated_at || new Date().toISOString(),
          });
          commentResults.push({ oldId: comment.id, newId: id, status: "success" });
        } catch (error: any) {
          commentResults.push({ oldId: comment.id, status: "error", error: error.message });
        }
      }
      results.comments = commentResults;
    }

    if (args.tags) {
      const tagResults = [];
      for (const tag of args.tags) {
        try {
          const id = await ctx.db.insert("tags", {
            name: tag.name,
            slug: tag.slug,
            created_at: tag.created_at || new Date().toISOString(),
          });
          tagResults.push({ oldId: tag.id, newId: id, status: "success" });
        } catch (error: any) {
          tagResults.push({ oldId: tag.id, status: "error", error: error.message });
        }
      }
      results.tags = tagResults;
    }

    return {
      success: true,
      summary: {
        profiles: results.profiles.filter((r: any) => r.status === "success").length,
        categories: results.categories.filter((r: any) => r.status === "success").length,
        articles: results.articles.filter((r: any) => r.status === "success").length,
        comments: results.comments ? results.comments.filter((r: any) => r.status === "success").length : 0,
        tags: results.tags ? results.tags.filter((r: any) => r.status === "success").length : 0,
      },
      details: results,
    };
  },
});
