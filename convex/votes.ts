import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { auth } from "./auth";

export const getCounts = query({
  args: { articleId: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query('article_votes')
      .withIndex('by_article', q => q.eq('article_id', args.articleId))
      .collect();
    const yes = all.filter(v => v.vote_type === 'up').length;
    const no = all.filter(v => v.vote_type === 'down').length;
    return { yes, no };
  }
});

export const getUserVote = query({
  args: { articleId: v.string() },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (!profile) return null;

    const existing = await ctx.db
      .query('article_votes')
      .withIndex('by_user', q => q.eq('user_id', profile._id))
      .collect();
    const match = existing.find(v => v.article_id === args.articleId);
    if (!match) return null;
    return match.vote_type === 'up' ? 'yes' : 'no';
  }
});

export const recordVote = mutation({
  args: { articleId: v.string(), choice: v.union(v.literal('yes'), v.literal('no')) },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_userId', q => q.eq('userId', userId))
      .first();
    if (!profile) throw new Error('Profile not found');

    const existing = await ctx.db
      .query('article_votes')
      .withIndex('by_user', q => q.eq('user_id', profile._id))
      .collect();
    const current = existing.find(v => v.article_id === args.articleId);
    const vote_type = args.choice === 'yes' ? 'up' : 'down';
    const now = new Date().toISOString();
    if (current) {
      await ctx.db.patch(current._id, { vote_type, created_at: now });
      return current._id;
    }
    const id = await ctx.db.insert('article_votes', {
      article_id: args.articleId,
      user_id: profile._id,
      vote_type,
      created_at: now,
    });
    return id;
  }
});

