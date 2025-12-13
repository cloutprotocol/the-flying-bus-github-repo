/**
 * Convex Client Configuration
 * Replaces Supabase client
 */

import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error('Missing VITE_CONVEX_URL environment variable. Please check your .env file.');
}

// Create and export the Convex client
export const convex = new ConvexReactClient(convexUrl, {
  verbose: true,
});
