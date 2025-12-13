// reimport_clean_data.js - Clear and re-import with cleaned data
import { ConvexHttpClient } from "convex/browser";
import fs from 'fs';

const client = new ConvexHttpClient("https://adventurous-parakeet-119.convex.cloud");

async function clearAndReimport() {
  try {
    console.log('🗑️  Clearing existing data...\n');

    const clearResult = await client.mutation("clearData:clearAllTables", {});
    console.log(`✓ Cleared ${clearResult.total} total records`);
    console.log('Details:', clearResult.cleared);
    console.log('');

    console.log('📥 Starting fresh import with cleaned data...\n');

    // Load cleaned data files
    const profiles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__profiles.json', 'utf-8'));
    const categories = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__categories.json', 'utf-8'));
    const articles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__articles.json', 'utf-8'));
    const comments = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__comments.json', 'utf-8'));
    const tags = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__tags.json', 'utf-8'));
    const debateArticles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__debate_articles.json', 'utf-8'));
    const videoArticles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__video_articles.json', 'utf-8'));

    console.log('Data loaded:');
    console.log(`  Profiles: ${profiles.length}`);
    console.log(`  Categories: ${categories.length}`);
    console.log(`  Articles: ${articles.length}`);
    console.log(`  Comments: ${comments.length}`);
    console.log(`  Tags: ${tags.length}`);
    console.log(`  Debate Articles: ${debateArticles.length}`);
    console.log(`  Video Articles: ${videoArticles.length}`);
    console.log('');

    // Import profiles
    console.log('Importing profiles...');
    const profilesResult = await client.mutation("importData:importProfiles", { data: profiles });
    const profilesSuccess = profilesResult.filter(r => r.status === 'success').length;
    console.log(`✓ Profiles: ${profilesSuccess}/${profiles.length}`);

    if (profilesSuccess < profiles.length) {
      const failed = profilesResult.filter(r => r.status === 'error');
      console.log('  Failed profiles:', failed.slice(0, 3));
    }

    // Import categories
    console.log('Importing categories...');
    const categoriesResult = await client.mutation("importData:importCategories", { data: categories });
    const categoriesSuccess = categoriesResult.filter(r => r.status === 'success').length;
    console.log(`✓ Categories: ${categoriesSuccess}/${categories.length}`);

    // Import articles
    console.log('Importing articles...');
    const articlesResult = await client.mutation("importData:importArticles", { data: articles });
    const articlesSuccess = articlesResult.filter(r => r.status === 'success').length;
    console.log(`✓ Articles: ${articlesSuccess}/${articles.length}`);

    if (articlesSuccess < articles.length) {
      const failed = articlesResult.filter(r => r.status === 'error');
      console.log('  Failed articles:', failed.slice(0, 3));
    }

    // Import comments
    console.log('Importing comments...');
    const commentsResult = await client.mutation("importData:importComments", { data: comments });
    const commentsSuccess = commentsResult.filter(r => r.status === 'success').length;
    console.log(`✓ Comments: ${commentsSuccess}/${comments.length}`);

    // Import tags
    console.log('Importing tags...');
    const tagsResult = await client.mutation("importData:importTags", { data: tags });
    const tagsSuccess = tagsResult.filter(r => r.status === 'success').length;
    console.log(`✓ Tags: ${tagsSuccess}/${tags.length}`);

    // Import debate articles
    if (debateArticles.length > 0) {
      console.log('Importing debate articles...');
      const debateResult = await client.mutation("importData:importDebateArticles", { data: debateArticles });
      const debateSuccess = debateResult.filter(r => r.status === 'success').length;
      console.log(`✓ Debate Articles: ${debateSuccess}/${debateArticles.length}`);
    }

    // Import video articles
    if (videoArticles.length > 0) {
      console.log('Importing video articles...');
      const videoResult = await client.mutation("importData:importVideoArticles", { data: videoArticles });
      const videoSuccess = videoResult.filter(r => r.status === 'success').length;
      console.log(`✓ Video Articles: ${videoSuccess}/${videoArticles.length}`);
    }

    console.log('\n✅ Clean import complete!');
    console.log('\nView your data at: https://dashboard.convex.dev/deployment/adventurous-parakeet-119');
    console.log('\nData should now show without extra quotes (e.g., "standard" not "\\"standard\\"")');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

clearAndReimport().catch(console.error);
