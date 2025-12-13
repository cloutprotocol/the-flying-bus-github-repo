/**
 * Migration utility to link existing profiles to newly created auth users
 * This is needed when you import profiles from Supabase but create new auth users in Convex
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

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

    // Get all profiles without userId
    const unlinkedProfiles = await ctx.db
      .query("profiles")
      .collect()
      .then(profiles => profiles.filter(p => !p.userId));

    console.log('[linkAllProfilesByEmail] Found', unlinkedProfiles.length, 'unlinked profiles');

    const results = {
      total: unlinkedProfiles.length,
      linked: 0,
      noMatchingUser: 0,
      errors: [] as string[],
    };

    // Get all auth users
    const allUsers = await ctx.db.query("users").collect();
    console.log('[linkAllProfilesByEmail] Found', allUsers.length, 'auth users');

    for (const profile of unlinkedProfiles) {
      try {
        const normalizedEmail = profile.email.toLowerCase().trim();

        // Find matching auth user by email
        const matchingUser = allUsers.find(u => u.email?.toLowerCase().trim() === normalizedEmail);

        if (!matchingUser) {
          console.log('[linkAllProfilesByEmail] No auth user found for:', profile.email);
          results.noMatchingUser++;
          continue;
        }

        // Link the profile
        await ctx.db.patch(profile._id, {
          userId: matchingUser._id,
          updated_at: new Date().toISOString(),
        });

        console.log('[linkAllProfilesByEmail] Linked profile:', profile.email, 'to user:', matchingUser._id);
        results.linked++;
      } catch (error: any) {
        console.error('[linkAllProfilesByEmail] Error linking profile:', profile.email, error);
        results.errors.push(`${profile.email}: ${error.message}`);
      }
    }

    return results;
  },
});
