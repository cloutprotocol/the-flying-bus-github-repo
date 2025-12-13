/**
 * Test script to verify signup creates proper auth user + profile
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const testCreateUser = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user exists in auth users table
    const users = await ctx.db.query("users").collect();
    const user = users.find(u => u.email === args.email);

    // Check if profile exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return {
      authUser: user ? {
        id: user._id,
        email: user.email,
        hasPassword: !!user.emailVerificationTime, // Convex auth stores this
      } : null,
      profile: profile ? {
        id: profile._id,
        email: profile.email,
        userId: profile.userId,
        role: profile.role,
      } : null,
      totalAuthUsers: users.length,
    };
  },
});
