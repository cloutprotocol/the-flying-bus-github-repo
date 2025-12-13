import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const createSeriesWithEpisodes = mutation({
  args: {
    series: v.object({
      title: v.string(),
      slug: v.string(),
      description: v.optional(v.string()),
      coverImage: v.optional(v.string()),
      categoryId: v.string(),
      excerpt: v.optional(v.string()),
      status: v.optional(v.string()),
    }),
    episodes: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        videoUrl: v.optional(v.string()),
        thumbnailUrl: v.optional(v.string()),
        duration: v.optional(v.string()),
        number: v.number(),
        content: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Unauthenticated");

    const userProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (!userProfile) throw new Error("Profile not found");

    const now = new Date().toISOString();
    const seriesId = await ctx.db.insert("storyboard_series", {
      title: args.series.title,
      description: args.series.description ?? "",
      author_id: userProfile._id,
      thumbnail_url: args.series.coverImage ?? "",
      episode_count: args.episodes.length,
      status: args.series.status ?? "active",
      created_at: now,
      updated_at: now,
    });

    for (const ep of args.episodes) {
      await ctx.db.insert("storyboard_episodes", {
        series_id: seriesId,
        article_id: undefined,
        episode_number: ep.number,
        title: ep.title,
        content: ep.content ?? "",
        image_url: ep.thumbnailUrl ?? "",
        created_at: now,
        updated_at: now,
      });
    }

    return { seriesId };
  },
});

export const getSeries = query({
  args: { seriesId: v.id("storyboard_series") },
  handler: async (ctx, args) => {
    const series = await ctx.db.get(args.seriesId);
    if (!series) return null;

    const author = await ctx.db.get(series.author_id as any);
    const episodes = await ctx.db
      .query("storyboard_episodes")
      .withIndex("by_series", (q) => q.eq("series_id", args.seriesId))
      .order("asc")
      .collect();

    return { ...series, author, episodes };
  },
});

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    let series = await ctx.db.query("storyboard_series").collect();
    series = series.filter((s) => s.status === "active");
    // newest first
    series.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return series;
  },
});

