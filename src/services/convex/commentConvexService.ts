/**
 * Comment Convex Service
 * Wrapper service to use Convex for comment operations
 */

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export const commentConvexService = {
  /**
   * Get comments by article
   */
  async getByArticle(articleId: string, status?: string) {
    // Basic validation to prevent Convex errors with mock IDs like "1"
    if (!articleId || articleId.length < 10) {
      return { comments: [], error: null };
    }

    try {
      const comments = await convexClient.query(api.comments.getByArticle, {
        articleId: articleId as Id<"articles">,
        status,
      });
      return { comments, error: null };
    } catch (error) {
      return { comments: [], error };
    }
  },

  /**
   * Get comments by user
   */
  async getByUser(userId: string) {
    try {
      const comments = await convexClient.query(api.comments.getByUser, {
        userId: userId as Id<"profiles">,
      });
      return { comments, error: null };
    } catch (error) {
      return { comments: [], error };
    }
  },

  /**
   * Get flagged comments
   */
  async getFlagged(
    filter: string = "flagged",
    searchTerm: string = "",
    page: number = 1,
    limit: number = 10
  ) {
    try {
      const result = await convexClient.query(api.comments.getFlagged, {
        filter,
        searchTerm,
        page,
        limit,
      });
      return { comments: result.comments, count: result.count, error: null };
    } catch (error) {
      return { comments: [], count: 0, error };
    }
  },

  /**
   * Get comment by ID
   */
  async getById(commentId: string) {
    try {
      const comment = await convexClient.query(api.comments.getById, {
        commentId: commentId as Id<"comments">,
      });
      return { comment, error: null };
    } catch (error) {
      return { comment: null, error };
    }
  },

  /**
   * Create comment
   */
  async create(commentData: {
    article_id: string;
    user_id: string;
    content: string;
    parent_comment_id?: string;
    status?: string;
  }) {
    try {
      const commentId = await convexClient.mutation(api.comments.create, {
        article_id: commentData.article_id as Id<"articles">,
        user_id: commentData.user_id as Id<"profiles">,
        content: commentData.content,
        parent_comment_id: commentData.parent_comment_id as Id<"comments"> | undefined,
        status: commentData.status,
      });
      return { data: { _id: commentId, ...commentData }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update comment
   */
  async update(commentId: string, updates: { content?: string; status?: string }) {
    try {
      await convexClient.mutation(api.comments.update, {
        id: commentId as Id<"comments">,
        ...updates,
      });
      return { data: { _id: commentId, ...updates }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update comment status
   */
  async updateStatus(commentId: string, status: string) {
    try {
      await convexClient.mutation(api.comments.updateStatus, {
        id: commentId as Id<"comments">,
        status,
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Delete comment
   */
  async delete(commentId: string) {
    try {
      await convexClient.mutation(api.comments.remove, {
        id: commentId as Id<"comments">,
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },
};
