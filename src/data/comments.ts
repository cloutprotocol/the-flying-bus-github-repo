
import { CommentProps } from '@/components/Comments/CommentItem';

// Sample comments data
const commentsData: Record<string, CommentProps[]> = {
  '1': [
    {
      id: '1',
      author: 'Jamie Fields',
      authorImage: '/avatar-placeholder.jpg',
      content: 'This is such an inspiring article! I\'m going to see if my school can organize something similar.',
      date: '2 hours ago',
      likes: 12,
      replyCount: 2,
      isModerator: false,
      isVerified: true,
      replies: [
        {
          id: '1-1',
          author: 'Principal Adams',
          authorImage: '/avatar-placeholder.jpg',
          content: 'That\'s a wonderful idea, Jamie. Let\'s discuss this at the next student council meeting.',
          date: '1 hour ago',
          likes: 8,
          isModerator: true,
          isVerified: true
        }
      ]
    }
  ]
};

export const getCommentsByArticleId = (articleId: string): CommentProps[] => {
  return commentsData[articleId] || [];
};
