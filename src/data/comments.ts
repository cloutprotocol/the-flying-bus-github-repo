
import { CommentProps } from '@/components/Comments/CommentItem';

// Sample comments data
const commentsData: Record<string, CommentProps[]> = {
  '1': [
    {
      id: '1',
      author: {
        name: 'Jamie Fields',
        avatar: '/avatar-placeholder.jpg'
      },
      content: 'This is such an inspiring article! I\'m going to see if my school can organize something similar.',
      createdAt: new Date(new Date().getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
      likes: 12,
      replies: [
        {
          id: '1-1',
          author: {
            name: 'Principal Adams',
            avatar: '/avatar-placeholder.jpg'
          },
          content: 'That\'s a wonderful idea, Jamie. Let\'s discuss this at the next student council meeting.',
          createdAt: new Date(new Date().getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
          likes: 8,
          isModerator: true,
          isVerified: true
        }
      ],
      isModerator: false,
      isVerified: true
    }
  ]
};

export const getCommentsByArticleId = (articleId: string): CommentProps[] => {
  return commentsData[articleId] || [];
};
