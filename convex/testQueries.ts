/**
 * Test queries to verify data format
 */

import { query } from "./_generated/server";

export const checkArticleTypes = query({
  handler: async (ctx) => {
    const articles = await ctx.db.query("articles").take(5);

    return articles.map(article => ({
      id: article._id,
      title: article.title,
      article_type: article.article_type,
      article_type_length: article.article_type.length,
      has_quotes: article.article_type.includes('"'),
      raw_value: JSON.stringify(article.article_type),
    }));
  },
});

export const getAllArticles = query({
  handler: async (ctx) => {
    return await ctx.db.query("articles").collect();
  },
});
