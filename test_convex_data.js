// Test to check if data has embedded quotes
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://adventurous-parakeet-119.convex.cloud");

async function checkData() {
  try {
    const result = await client.query("testQueries:checkArticleTypes", {});

    console.log('Checking article_type values for embedded quotes:\n');

    result.forEach((article, index) => {
      console.log(`Article ${index + 1}:`);
      console.log(`  Title: ${article.title}`);
      console.log(`  article_type value: "${article.article_type}"`);
      console.log(`  Length: ${article.article_type_length}`);
      console.log(`  Has embedded quotes: ${article.has_quotes}`);
      console.log(`  Raw JSON: ${article.raw_value}`);
      console.log('');
    });

    const hasIssues = result.some(a => a.has_quotes || a.article_type_length > 15);

    if (hasIssues) {
      console.log('❌ ISSUE FOUND: Some articles have embedded quotes or unexpected length');
    } else {
      console.log('✅ All article_type values are clean (no embedded quotes)');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkData();
