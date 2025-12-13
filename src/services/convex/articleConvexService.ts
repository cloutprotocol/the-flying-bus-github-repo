/**
 * Article Convex Service
 * Wrapper service to use Convex for article operations
 * This replaces Supabase article operations with Convex
 */

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export const articleConvexService = {
  /**
   * Get article by ID
   */
  async getById(articleId: string) {
    try {
      const article = await convexClient.query(api.articles.getById, {
        articleId: articleId as Id<"articles">,
      });
      return { article, error: null };
    } catch (error) {
      return { article: null, error };
    }
  },

  /**
   * Get articles by status
   */
  async getByStatus(
    status: string = "all",
    categoryId?: string,
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const result = await convexClient.query(api.articles.getByStatus, {
        status,
        categoryId: categoryId as Id<"categories"> | undefined,
        page,
        limit,
      });
      return { articles: result.articles, error: null, count: result.count };
    } catch (error) {
      return { articles: [], error, count: 0 };
    }
  },

  /**
   * Get published articles
   */
  async getPublished(categoryId?: string, page: number = 1, limit: number = 10) {
    try {
      const result = await convexClient.query(api.articles.getPublished, {
        categoryId: categoryId as Id<"categories"> | undefined,
        page,
        limit,
      });
      return { articles: result.articles, error: null, count: result.count };
    } catch (error) {
      return { articles: [], error, count: 0 };
    }
  },

  /**
   * Get articles by author
   */
  async getByAuthor(authorId: string, status?: string) {
    try {
      const articles = await convexClient.query(api.articles.getByAuthor, {
        authorId: authorId as Id<"profiles">,
        status,
      });
      return { articles, error: null };
    } catch (error) {
      return { articles: [], error };
    }
  },

  /**
   * Get article by slug
   */
  async getBySlug(slug: string) {
    try {
      const article = await convexClient.query(api.articles.getBySlug, {
        slug,
      });
      return { article, error: null };
    } catch (error) {
      return { article: null, error };
    }
  },

  /**
   * Create article
   */
  async create(articleData: any) {
    try {
      const articleId = await convexClient.mutation(api.articles.create, articleData);
      return { data: { _id: articleId, ...articleData }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update article
   */
  async update(articleId: string, updates: any) {
    try {
      await convexClient.mutation(api.articles.update, {
        id: articleId as Id<"articles">,
        ...updates,
      });
      return { data: { _id: articleId, ...updates }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Delete article
   */
  async delete(articleId: string) {
    try {
      await convexClient.mutation(api.articles.remove, {
        id: articleId as Id<"articles">,
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Update article status
   */
  async updateStatus(articleId: string, status: string) {
    try {
      await convexClient.mutation(api.articles.updateStatus, {
        id: articleId as Id<"articles">,
        status,
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Increment view count
   */
  async incrementViewCount(articleId: string) {
    try {
      await convexClient.mutation(api.articles.incrementViewCount, {
        id: articleId as Id<"articles">,
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },
};
