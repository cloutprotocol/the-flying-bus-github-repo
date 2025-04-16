
export const transformArticleData = (data: any[]) => {
  return data.map(item => ({
    id: item.id,
    title: item.title,
    excerpt: item.excerpt || '',
    imageUrl: item.cover_image,
    category: item.categories?.name || '',
    categorySlug: item.categories?.slug || '',
    categoryColor: item.categories?.color || '',
    categoryId: item.category_id,
    readingLevel: 'Intermediate', // Default until we have reading levels
    readTime: 5, // Default reading time
    author: item.profiles?.display_name || 'Unknown',
    date: new Date(item.published_at || item.created_at).toLocaleDateString(),
    publishDate: new Date(item.published_at || item.created_at).toLocaleDateString(),
    articleType: item.article_type
  }));
};
