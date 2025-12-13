/**
 * Clear all data from Convex tables
 * WARNING: This will delete all data!
 */

import { internalMutation } from "./_generated/server";

export const clearAllTables = internalMutation({
  handler: async (ctx) => {
    const results: Record<string, number> = {};

    // Clear all tables in dependency order (opposite of import)
    const tablesToClear = [
      "comment_likes",
      "comments",
      "article_tags",
      "article_views",
      "article_votes",
      "article_reviews",
      "storyboard_episodes",
      "storyboard_series",
      "video_articles",
      "debate_articles",
      "articles",
      "tags",
      "media_assets",
      "activities",
      "audit_logs",
      "invitation_tokens",
      "invitation_requests",
      "privacy_settings",
      "categories",
      "profiles",
      "flagged_content",
      "system_configuration",
      "user_achievements",
      "user_reading_stats",
    ];

    for (const tableName of tablesToClear) {
      try {
        const records = await ctx.db.query(tableName as any).collect();
        let deleted = 0;

        for (const record of records) {
          await ctx.db.delete(record._id);
          deleted++;
        }

        results[tableName] = deleted;
        console.log(`Cleared ${tableName}: ${deleted} records`);
      } catch (error: any) {
        console.error(`Error clearing ${tableName}:`, error.message);
        results[tableName] = -1;
      }
    }

    const anyFailures = Object.values(results).some((count) => count < 0);
    const total = Object.values(results).reduce(
      (sum, count) => sum + (count > 0 ? count : 0),
      0
    );

    return {
      success: !anyFailures,
      cleared: results,
      total,
    };
  },
});
