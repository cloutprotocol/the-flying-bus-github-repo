
export const fetchVideoDetails = async (_articleId: string) => {
  // Legacy Supabase path removed. Video details now come from Convex-backed articles.
  // For now, return null to indicate no separate video metadata.
  return null as any;
};
