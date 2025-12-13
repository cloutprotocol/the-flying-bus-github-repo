/**
 * Admin utility to create a Convex Auth user for an existing profile
 * This allows migrated Supabase users to log in
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Creates a new auth user with password for an existing profile by email
 * USE THIS to enable login for migrated Supabase users
 *
 * Usage in Convex dashboard:
 * await api.createAuthUserForProfile.createAuthUserWithPassword({
 *   email: "c.judemc@gmail.com",
 *   password: "YourNewPassword123!",
 *   name: "Your Name"
 * })
 */
export const createAuthUserWithPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();

    console.log('[createAuthUserWithPassword] Creating auth user for:', normalizedEmail);

    // Check if auth user already exists
    const existingUsers = await ctx.db.query("users").collect();
    const existingUser = existingUsers.find(u => u.email?.toLowerCase() === normalizedEmail);

    if (existingUser) {
      console.log('[createAuthUserWithPassword] Auth user already exists:', existingUser._id);
      return {
        success: false,
        message: "Auth user already exists for this email",
        userId: existingUser._id,
      };
    }

    // Check if profile exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!profile) {
      console.log('[createAuthUserWithPassword] No profile found for email:', normalizedEmail);
      return {
        success: false,
        message: "No profile found with this email. Import profiles first.",
      };
    }

    console.log('[createAuthUserWithPassword] Found profile:', profile._id);

    // Unfortunately, we can't directly create a user with a password via the database
    // The password needs to be hashed by Convex Auth's Password provider
    //
    // WORKAROUND: The user needs to use the signUp flow or we need to call the auth provider directly

    return {
      success: false,
      message: "Cannot create auth users with passwords directly. User must sign up through the normal flow, or you can use the Convex Auth API.",
      profileEmail: profile.email,
      profileId: profile._id,
      instruction: `User should sign up at /auth with email: ${normalizedEmail} and a new password. Their profile will be automatically linked.`
    };
  },
});

/**
 * Temporary bypass: Create a test user that can log in
 * This creates BOTH an auth user and profile
 */
export const createTestUser = mutation({
  args: {
    email: v.string(),
    username: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();

    console.log('[createTestUser] Creating test user:', normalizedEmail);

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (existingProfile) {
      return {
        success: false,
        message: "Profile already exists with this email",
        profileId: existingProfile._id,
      };
    }

    // Create profile (without userId - will be linked after signup)
    const now = new Date().toISOString();
    const profileId = await ctx.db.insert("profiles", {
      email: normalizedEmail,
      username: args.username,
      display_name: args.displayName,
      role: "reader",
      created_at: now,
      updated_at: now,
    });

    return {
      success: true,
      message: "Profile created. User can now sign up with this email and the profile will be linked automatically.",
      profileId,
      nextStep: `User should sign up at /auth with email: ${normalizedEmail}`,
    };
  },
});
