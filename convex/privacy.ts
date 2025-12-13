import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByUser = query({
  args: { userId: v.id("profiles") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query('privacy_settings')
      .withIndex('by_user', q => q.eq('user_id', args.userId))
      .first();
    return settings;
  }
});

export const upsert = mutation({
  args: {
    userId: v.id('profiles'),
    profile_visibility: v.string(),
    show_reading_history: v.boolean(),
    allow_comments: v.boolean(),
    email_notifications: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('privacy_settings')
      .withIndex('by_user', q => q.eq('user_id', args.userId))
      .first();
    const payload = {
      user_id: args.userId,
      profile_visibility: args.profile_visibility,
      show_reading_history: args.show_reading_history,
      allow_comments: args.allow_comments,
      email_notifications: args.email_notifications,
      updated_at: new Date().toISOString(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    const id = await ctx.db.insert('privacy_settings', payload);
    return id;
  }
});
