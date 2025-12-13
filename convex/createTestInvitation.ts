/**
 * Admin utility to create test invitation tokens
 * Use this to create invitations for testing the signup flow
 */

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Creates a test invitation token that can be used for signup
 *
 * Usage in Convex dashboard or via npx convex run:
 *
 * npx convex run createTestInvitation:create --email "test@example.com" --role "reader"
 */
export const create = mutation({
  args: {
    email: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const role = args.role || "reader";

    console.log('[createTestInvitation] Creating invitation for:', normalizedEmail);

    // Generate a random token
    const token = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Find an admin profile to use as invited_by (or create a system profile)
    let adminProfile = await ctx.db
      .query("profiles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    // If no admin exists, create a system profile
    if (!adminProfile) {
      console.log('[createTestInvitation] No admin found, creating system profile');
      const now = new Date().toISOString();
      const systemProfileId = await ctx.db.insert("profiles", {
        email: "system@flyingbus.com",
        role: "admin",
        display_name: "System",
        created_at: now,
        updated_at: now,
      });
      adminProfile = await ctx.db.get(systemProfileId);
    }

    if (!adminProfile) {
      throw new Error("Failed to get or create admin profile");
    }

    // Create the invitation token
    const now = new Date().toISOString();
    const tokenId = await ctx.db.insert("invitation_tokens", {
      token,
      email: normalizedEmail,
      role,
      invited_by: adminProfile._id,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      created_at: now,
    });

    console.log('[createTestInvitation] Created invitation token:', tokenId);

    return {
      success: true,
      token,
      email: normalizedEmail,
      role,
      expiresAt: expiresAt.toISOString(),
      signupUrl: `/invitation-register?token=${token}`,
      message: `Invitation created! User can sign up at: /invitation-register?token=${token}`,
    };
  },
});

/**
 * Quick helper to create an invitation for yourself for testing
 */
export const createForCurrentUser = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const role = "reader";

    console.log('[createTestInvitation] Creating invitation for:', normalizedEmail);

    // Generate a random token
    const token = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Find an admin profile to use as invited_by (or create a system profile)
    let adminProfile = await ctx.db
      .query("profiles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    // If no admin exists, create a system profile
    if (!adminProfile) {
      console.log('[createTestInvitation] No admin found, creating system profile');
      const now = new Date().toISOString();
      const systemProfileId = await ctx.db.insert("profiles", {
        email: "system@flyingbus.com",
        role: "admin",
        display_name: "System",
        created_at: now,
        updated_at: now,
      });
      adminProfile = await ctx.db.get(systemProfileId);
    }

    if (!adminProfile) {
      throw new Error("Failed to get or create admin profile");
    }

    // Create the invitation token
    const now = new Date().toISOString();
    const tokenId = await ctx.db.insert("invitation_tokens", {
      token,
      email: normalizedEmail,
      role,
      invited_by: adminProfile._id,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      created_at: now,
    });

    console.log('[createTestInvitation] Created invitation token:', tokenId);

    return {
      success: true,
      token,
      email: normalizedEmail,
      role,
      expiresAt: expiresAt.toISOString(),
      signupUrl: `/invitation-register?token=${token}`,
      message: `Invitation created! User can sign up at: /invitation-register?token=${token}`,
    };
  },
});
