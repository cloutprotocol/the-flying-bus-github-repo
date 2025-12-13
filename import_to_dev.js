// import_to_dev.js - Import all data to dev deployment
import { ConvexHttpClient } from "convex/browser";
import fs from 'fs';

const client = new ConvexHttpClient("https://aromatic-pelican-422.convex.cloud");

async function importAllData() {
  try {
    console.log('📥 Starting full data import to DEV deployment...\n');
    console.log('Dev URL: https://aromatic-pelican-422.convex.cloud');
    console.log('Dashboard: https://dashboard.convex.dev/d/aromatic-pelican-422\n');

    // Load all data files
    const profiles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__profiles.json', 'utf-8'));
    const categories = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__categories.json', 'utf-8'));
    const articles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__articles.json', 'utf-8'));
    const comments = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__comments.json', 'utf-8'));
    const tags = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__tags.json', 'utf-8'));
    const debateArticles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__debate_articles.json', 'utf-8'));
    const videoArticles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__video_articles.json', 'utf-8'));

    console.log('Data loaded:');
    console.log(`  ✓ Profiles: ${profiles.length}`);
    console.log(`  ✓ Categories: ${categories.length}`);
    console.log(`  ✓ Articles: ${articles.length}`);
    console.log(`  ✓ Comments: ${comments.length}`);
    console.log(`  ✓ Tags: ${tags.length}`);
    console.log(`  ✓ Debate Articles: ${debateArticles.length}`);
    console.log(`  ✓ Video Articles: ${videoArticles.length}`);
    console.log('');

    // Import profiles
    console.log('[1/7] Importing profiles...');
    const profilesResult = await client.mutation("importData:importProfiles", { data: profiles });
    const profilesSuccess = profilesResult.filter(r => r.status === 'success').length;
    console.log(`      ✓ Profiles: ${profilesSuccess}/${profiles.length}`);

    // Import categories
    console.log('[2/7] Importing categories...');
    const categoriesResult = await client.mutation("importData:importCategories", { data: categories });
    const categoriesSuccess = categoriesResult.filter(r => r.status === 'success').length;
    console.log(`      ✓ Categories: ${categoriesSuccess}/${categories.length}`);

    // Import articles
    console.log('[3/7] Importing articles...');
    const articlesResult = await client.mutation("importData:importArticles", { data: articles });
    const articlesSuccess = articlesResult.filter(r => r.status === 'success').length;
    console.log(`      ✓ Articles: ${articlesSuccess}/${articles.length}`);

    // Import comments
    console.log('[4/7] Importing comments...');
    const commentsResult = await client.mutation("importData:importComments", { data: comments });
    const commentsSuccess = commentsResult.filter(r => r.status === 'success').length;
    console.log(`      ✓ Comments: ${commentsSuccess}/${comments.length}`);

    // Import tags
    console.log('[5/7] Importing tags...');
    const tagsResult = await client.mutation("importData:importTags", { data: tags });
    const tagsSuccess = tagsResult.filter(r => r.status === 'success').length;
    console.log(`      ✓ Tags: ${tagsSuccess}/${tags.length}`);

    // Import debate articles
    console.log('[6/7] Importing debate articles...');
    const debateResult = await client.mutation("importData:importDebateArticles", { data: debateArticles });
    const debateSuccess = debateResult.filter(r => r.status === 'success').length;
    console.log(`      ✓ Debate Articles: ${debateSuccess}/${debateArticles.length}`);

    // Import video articles
    console.log('[7/7] Importing video articles...');
    const videoResult = await client.mutation("importData:importVideoArticles", { data: videoArticles });
    const videoSuccess = videoResult.filter(r => r.status === 'success').length;
    console.log(`      ✓ Video Articles: ${videoSuccess}/${videoArticles.length}`);

    const totalImported = profilesSuccess + categoriesSuccess + articlesSuccess + commentsSuccess + tagsSuccess + debateSuccess + videoSuccess;
    const totalRecords = profiles.length + categories.length + articles.length + comments.length + tags.length + debateArticles.length + videoArticles.length;

    console.log('\n✅ Import complete!');
    console.log(`\nTotal: ${totalImported}/${totalRecords} records imported successfully`);
    console.log('\nDev Dashboard: https://dashboard.convex.dev/d/aromatic-pelican-422');
    console.log('Prod Dashboard: https://dashboard.convex.dev/d/polished-avocet-511');

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importAllData().catch(console.error);
