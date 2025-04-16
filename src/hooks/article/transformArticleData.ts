
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
    readingLevel: item.reading_level || 'Intermediate', // Default until we have reading levels
    readTime: item.read_time || 5, // Default reading time
    author: item.profiles?.display_name || 'Unknown',
    date: new Date(item.published_at || item.created_at).toLocaleDateString(),
    publishDate: item.published_at ? new Date(item.published_at).toLocaleDateString() : null,
    articleType: item.article_type,
    status: item.status,
    videoUrl: item.video_url,
    hasRevisions: item.article_revisions_count > 0,
    revisionCount: item.article_revisions_count || 0,
    // Debate article properties
    debateSettings: item.debate_settings ? {
      question: item.debate_settings.question,
      yesPosition: item.debate_settings.yes_position,
      noPosition: item.debate_settings.no_position,
      votingEnabled: item.debate_settings.voting_enabled,
      votingEndsAt: item.debate_settings.voting_ends_at
    } : undefined
  }));
};
