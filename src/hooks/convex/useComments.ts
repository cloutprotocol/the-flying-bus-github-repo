/**
 * Convex Comment Hooks
 * Example hooks showing how to use Convex reactive queries for comments
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Hook to fetch comments for an article
 * Automatically updates when comments are added/modified
 */
export function useArticleComments(
  articleId: Id<"articles"> | undefined,
  status?: string
) {
  return useQuery(
    api.comments.getByArticle,
    articleId ? { articleId, status } : "skip"
  );
}

/**
 * Hook to fetch comments by user
 */
export function useUserComments(userId: Id<"profiles"> | undefined) {
  return useQuery(
    api.comments.getByUser,
    userId ? { userId } : "skip"
  );
}

/**
 * Hook to fetch flagged comments with filtering
 * Useful for moderation dashboard
 */
export function useFlaggedComments(
  filter?: string,
  searchTerm?: string,
  page: number = 1,
  limit: number = 10
) {
  return useQuery(api.comments.getFlagged, {
    filter,
    searchTerm,
    page,
    limit,
  });
}

/**
 * Hook to fetch a single comment
 */
export function useComment(commentId: Id<"comments"> | undefined) {
  return useQuery(
    api.comments.getById,
    commentId ? { commentId } : "skip"
  );
}

/**
 * Hook to create a comment
 */
export function useCreateComment() {
  return useMutation(api.comments.create);
}

/**
 * Hook to update a comment
 */
export function useUpdateComment() {
  return useMutation(api.comments.update);
}

/**
 * Hook to update comment status
 */
export function useUpdateCommentStatus() {
  return useMutation(api.comments.updateStatus);
}

/**
 * Hook to delete a comment
 */
export function useDeleteComment() {
  return useMutation(api.comments.remove);
}

/**
 * Hook to increment comment like count
 */
export function useIncrementCommentLikes() {
  return useMutation(api.comments.incrementLikeCount);
}

/**
 * Hook to decrement comment like count
 */
export function useDecrementCommentLikes() {
  return useMutation(api.comments.decrementLikeCount);
}
