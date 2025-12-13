/**
 * Convex Article Hooks
 * Example hooks showing how to use Convex reactive queries for articles
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Hook to fetch a single article by ID
 * Automatically updates when article changes
 */
export function useArticle(articleId: Id<"articles"> | undefined) {
  return useQuery(
    api.articles.getById,
    articleId ? { articleId } : "skip"
  );
}

/**
 * Hook to fetch articles by status
 * Automatically updates when articles change
 */
export function useArticlesByStatus(
  status?: string,
  categoryId?: Id<"categories">,
  page: number = 1,
  limit: number = 10
) {
  return useQuery(api.articles.getByStatus, {
    status,
    categoryId,
    page,
    limit,
  });
}

/**
 * Hook to fetch published articles
 * Automatically updates when new articles are published
 */
export function usePublishedArticles(
  categoryId?: Id<"categories">,
  page: number = 1,
  limit: number = 10
) {
  return useQuery(api.articles.getPublished, {
    categoryId,
    page,
    limit,
  });
}

/**
 * Hook to fetch articles by author
 */
export function useArticlesByAuthor(
  authorId: Id<"profiles"> | undefined,
  status?: string
) {
  return useQuery(
    api.articles.getByAuthor,
    authorId ? { authorId, status } : "skip"
  );
}

/**
 * Hook to fetch article by slug
 */
export function useArticleBySlug(slug: string | undefined) {
  return useQuery(
    api.articles.getBySlug,
    slug ? { slug } : "skip"
  );
}

/**
 * Hook to create an article
 * Returns a mutation function
 */
export function useCreateArticle() {
  return useMutation(api.articles.create);
}

/**
 * Hook to update an article
 * Returns a mutation function
 */
export function useUpdateArticle() {
  return useMutation(api.articles.update);
}

/**
 * Hook to delete an article
 * Returns a mutation function
 */
export function useDeleteArticle() {
  return useMutation(api.articles.remove);
}

/**
 * Hook to update article status
 */
export function useUpdateArticleStatus() {
  return useMutation(api.articles.updateStatus);
}

/**
 * Hook to increment article view count
 */
export function useIncrementViewCount() {
  return useMutation(api.articles.incrementViewCount);
}
