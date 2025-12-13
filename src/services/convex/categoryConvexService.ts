/**
 * Category Convex Service
 * Wrapper service to use Convex for category operations
 */

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export const categoryConvexService = {
    /**
     * Get all categories
     */
    async getAll() {
        try {
            const categories = await convexClient.query(api.categories.getAll);
            return { categories, error: null };
        } catch (error) {
            return { categories: [], error };
        }
    },

    /**
     * Get category by slug
     */
    async getBySlug(slug: string) {
        try {
            const category = await convexClient.query(api.categories.getBySlug, {
                slug,
            });
            return { category, error: null };
        } catch (error) {
            return { category: null, error };
        }
    },

    /**
     * Get category by ID
     */
    async getById(categoryId: string) {
        try {
            const category = await convexClient.query(api.categories.getById, {
                categoryId: categoryId as Id<"categories">,
            });
            return { category, error: null };
        } catch (error) {
            return { category: null, error };
        }
    }
};
