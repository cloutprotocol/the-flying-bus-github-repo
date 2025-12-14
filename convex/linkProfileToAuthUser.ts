/**
 * Migration utility to link existing profiles to newly created auth users
 * This is needed when you import profiles from Supabase but create new auth users in Convex
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

/**
 * Links the current authenticated user to an existing profile by email
 * Call this after logging in if the profile exists but isn't linked to the auth user
 */
export const linkMyProfileToAuthUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the auth user's email
    const user = await ctx.db.get(userId);
    if (!user || !user.email) {
      throw new Error("User email not found");
    }

    const normalizedEmail = user.email.toLowerCase().trim();
    console.log('[linkMyProfileToAuthUser] Looking for profile with email:', normalizedEmail);

    // Check if a profile already exists linked to this userId
    const existingLinkedProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingLinkedProfile) {
      console.log('[linkMyProfileToAuthUser] Profile already linked:', existingLinkedProfile._id);
      return { success: true, message: "Profile already linked", profileId: existingLinkedProfile._id };
    }

    // Find unlinked profile by email
    const profileByEmail = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!profileByEmail) {
      console.log('[linkMyProfileToAuthUser] No profile found with email:', normalizedEmail);
      return { success: false, message: "No profile found with this email" };
    }

    // Check if this profile is already linked to a different user
    if (profileByEmail.userId && profileByEmail.userId !== userId) {
      console.log('[linkMyProfileToAuthUser] Profile already linked to different user');
      return { success: false, message: "Profile already linked to a different user" };
    }

    // Link the profile to this auth user
    await ctx.db.patch(profileByEmail._id, {
      userId,
      updated_at: new Date().toISOString(),
    });

    console.log('[linkMyProfileToAuthUser] Successfully linked profile:', profileByEmail._id);
    return { success: true, message: "Profile linked successfully", profileId: profileByEmail._id };
  },
});

/**
 * Admin function to link all unlinked profiles to auth users by email
 * Use this to migrate all imported profiles at once
 */
// Batch size to prevent timeouts
const BATCH_SIZE = 100;

export const linkAllProfilesByEmail = mutation({
  args: {},
  handler: async (ctx) => {
    // Authentication and authorization: admin only
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const adminProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!adminProfile || adminProfile.role !== 'admin') {
      throw new Error("Not authorized");
    }

    // 1. Build an email-to-user Map from all users
    // Fetching all users might still be heavy if there are thousands, but better than O(n^2)
    const allUsers = await ctx.db.query("users").collect();
    const userEmailMap = new Map<string, Id<"users">>();

    for (const user of allUsers) {
      if (user.email) {
        userEmailMap.set(user.email.toLowerCase().trim(), user._id);
      }
    }

    console.log('[linkAllProfilesByEmail] Built user map with', userEmailMap.size, 'emails');

    // 2. Get a batch of profiles without userId
    // Using server-side filter and limit
    const unlinkedProfiles = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("userId"), undefined))
      .take(BATCH_SIZE);

    console.log('[linkAllProfilesByEmail] Processing batch of', unlinkedProfiles.length, 'unlinked profiles');

    const results = {
      processed: unlinkedProfiles.length,
      linked: 0,
      noMatchingUser: 0,
      errors: [] as string[],
      hasMore: unlinkedProfiles.length === BATCH_SIZE
    };

    // 3. Process the batch using the Map for O(1) lookup
    for (const profile of unlinkedProfiles) {
      try {
        const normalizedEmail = profile.email.toLowerCase().trim();

        // O(1) lookup
        const matchingUserId = userEmailMap.get(normalizedEmail);

        if (!matchingUserId) {
          // console.log('[linkAllProfilesByEmail] No auth user found for:', profile.email);
          results.noMatchingUser++;
          continue;
        }

        // Link the profile
        await ctx.db.patch(profile._id, {
          userId: matchingUserId,
          updated_at: new Date().toISOString(),
        });

        // console.log('[linkAllProfilesByEmail] Linked profile:', profile.email, 'to user:', matchingUserId);
        results.linked++;
      } catch (error: any) {
        console.error('[linkAllProfilesByEmail] Error linking profile:', profile.email, error);
        results.errors.push(`${profile.email}: ${error.message}`);
      }
    }

    return results;
  },
});
