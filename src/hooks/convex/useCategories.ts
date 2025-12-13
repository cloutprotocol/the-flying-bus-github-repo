/**
 * Convex Category Hooks
 * Example hooks showing how to use Convex reactive queries for categories
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Hook to fetch all categories
 */
export function useCategories() {
  return useQuery(api.categories.getAll);
}

/**
 * Hook to fetch active categories only
 */
export function useActiveCategories() {
  return useQuery(api.categories.getActive);
}

/**
 * Hook to fetch a category by ID
 */
export function useCategory(categoryId: Id<"categories"> | undefined) {
  return useQuery(
    api.categories.getById,
    categoryId ? { categoryId } : "skip"
  );
}

/**
 * Hook to fetch a category by slug
 */
export function useCategoryBySlug(slug: string | undefined) {
  return useQuery(
    api.categories.getBySlug,
    slug ? { slug } : "skip"
  );
}

/**
 * Hook to fetch child categories
 */
export function useChildCategories(parentId: Id<"categories"> | undefined) {
  return useQuery(
    api.categories.getChildren,
    parentId ? { parentId } : "skip"
  );
}

/**
 * Hook to create a category
 */
export function useCreateCategory() {
  return useMutation(api.categories.create);
}

/**
 * Hook to update a category
 */
export function useUpdateCategory() {
  return useMutation(api.categories.update);
}

/**
 * Hook to delete a category
 */
export function useDeleteCategory() {
  return useMutation(api.categories.remove);
}
