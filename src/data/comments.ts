
import { CommentProps, CommentData } from '@/components/Comments/CommentItem';

// Sample comments data - Used for fallback when Supabase connection isn't available
const commentsData: Record<string, CommentProps[]> = {
  '1': [
    {
      id: '1',
      author: {
        name: 'Jamie Fields',
        avatar: '/avatar-placeholder.jpg',
        badges: ['reader']
      },
      content: 'This is such an inspiring article! I\'m going to see if my school can organize something similar.',
      createdAt: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      likes: 12,
      articleId: '1', // Make sure this is added
      replies: [
        {
          id: '1-1',
          author: {
            name: 'Principal Adams',
            avatar: '/avatar-placeholder.jpg',
            badges: ['moderator']
          },
          content: 'That\'s a wonderful idea, Jamie. Let\'s discuss this at the next student council meeting.',
          createdAt: new Date(new Date().getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          likes: 8,
          articleId: '1' // Make sure this is added
        }
      ]
    }
  ]
};

export const getCommentsByArticleId = (articleId: string): CommentProps[] => {
  // This function is kept for backward compatibility
  // The actual data now comes from Supabase via the useComments hook
  return commentsData[articleId] || [];
};
