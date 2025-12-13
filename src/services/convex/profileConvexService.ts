/**
 * Profile Convex Service
 * Wrapper service to use Convex for profile operations
 */

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";

const convexUrl = import.meta.env.VITE_CONVEX_URL!;
const convexClient = new ConvexHttpClient(convexUrl);

export const profileConvexService = {
  /**
   * Get profile by ID
   */
  async getById(profileId: string) {
    try {
      const profile = await convexClient.query(api.profiles.getById, {
        profileId: profileId as Id<"profiles">,
      });
      return { profile, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  },

  /**
   * Get profile by email
   */
  async getByEmail(email: string) {
    try {
      const profile = await convexClient.query(api.profiles.getByEmail, {
        email,
      });
      return { profile, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  },

  /**
   * Get profile by username
   */
  async getByUsername(username: string) {
    try {
      const profile = await convexClient.query(api.profiles.getByUsername, {
        username,
      });
      return { profile, error: null };
    } catch (error) {
      return { profile: null, error };
    }
  },

  /**
   * Get profiles by role
   */
  async getByRole(role: string) {
    try {
      const profiles = await convexClient.query(api.profiles.getByRole, {
        role,
      });
      return { profiles, error: null };
    } catch (error) {
      return { profiles: [], error };
    }
  },

  /**
   * Get all profiles
   */
  async getAll(page: number = 1, limit: number = 20, searchTerm?: string, role?: string) {
    try {
      const result = await convexClient.query(api.profiles.getAll, {
        page,
        limit,
        searchTerm,
        role,
      });
      return { profiles: result.profiles, count: result.count, error: null };
    } catch (error) {
      return { profiles: [], count: 0, error };
    }
  },

  /**
   * Create profile
   */
  async create(profileData: {
    email: string;
    username?: string;
    display_name?: string;
    role: string;
    bio?: string;
    public_bio?: string;
    avatar_url?: string;
    crypto_wallet_address?: string;
  }) {
    try {
      const profileId = await convexClient.mutation(api.profiles.create, profileData);
      return { data: { _id: profileId, ...profileData }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update profile
   */
  async update(profileId: string, updates: any) {
    try {
      await convexClient.mutation(api.profiles.update, {
        id: profileId as Id<"profiles">,
        ...updates,
      });
      return { data: { _id: profileId, ...updates }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  /**
   * Update role
   */
  async updateRole(profileId: string, role: string) {
    try {
      await convexClient.mutation(api.profiles.updateRole, {
        id: profileId as Id<"profiles">,
        role,
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },

  /**
   * Delete profile
   */
  async delete(profileId: string) {
    try {
      await convexClient.mutation(api.profiles.remove, {
        id: profileId as Id<"profiles">,
      });
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  },
};
