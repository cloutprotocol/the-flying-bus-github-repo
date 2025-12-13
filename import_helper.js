// import_helper.js - Run with: node import_helper.js
import { ConvexHttpClient } from "convex/browser";
import fs from 'fs';

const client = new ConvexHttpClient("https://adventurous-parakeet-119.convex.cloud");

async function importData() {
  const profiles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__profiles.json', 'utf-8'));
  const categories = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__categories.json', 'utf-8'));
  const articles = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__articles.json', 'utf-8'));
  const comments = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__comments.json', 'utf-8'));
  const tags = JSON.parse(fs.readFileSync('./convex_migration/json_data/public__tags.json', 'utf-8'));

  console.log('Importing profiles...');
  const profilesResult = await client.mutation("importData:importProfiles", { data: profiles });
  console.log(`✓ Profiles: ${profilesResult.filter(r => r.status === 'success').length}/${profiles.length}`);

  console.log('Importing categories...');
  const categoriesResult = await client.mutation("importData:importCategories", { data: categories });
  console.log(`✓ Categories: ${categoriesResult.filter(r => r.status === 'success').length}/${categories.length}`);

  console.log('Importing articles...');
  const articlesResult = await client.mutation("importData:importArticles", { data: articles });
  console.log(`✓ Articles: ${articlesResult.filter(r => r.status === 'success').length}/${articles.length}`);

  console.log('Importing comments...');
  const commentsResult = await client.mutation("importData:importComments", { data: comments });
  console.log(`✓ Comments: ${commentsResult.filter(r => r.status === 'success').length}/${comments.length}`);

  console.log('Importing tags...');
  const tagsResult = await client.mutation("importData:importTags", { data: tags });
  console.log(`✓ Tags: ${tagsResult.filter(r => r.status === 'success').length}/${tags.length}`);

  console.log('\n✅ Import complete!');
}

importData().catch(console.error);
