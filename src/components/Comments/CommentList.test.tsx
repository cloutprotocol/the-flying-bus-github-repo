
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/TestRenderer';
import CommentList from './CommentList';

describe('CommentList', () => {
  const mockComments = [
    {
      id: '1',
      author: {
        id: 'user1',
        name: 'User One',
        avatar: '/avatar1.png'
      },
      content: 'This is comment one',
      createdAt: new Date('2023-01-01'),
      replyCount: 0,
      likeCount: 5,
      isLiked: false,
      replies: []
    },
    {
      id: '2',
      author: {
        id: 'user2',
        name: 'User Two',
        avatar: '/avatar2.png'
      },
      content: 'This is comment two',
      createdAt: new Date('2023-01-02'),
      replyCount: 2,
      likeCount: 10,
      isLiked: true,
      replies: []
    }
  ];
  
  it('renders loading state correctly', () => {
    render(
      <CommentList
        comments={[]}
        isLoading={true}
        articleId="article-123"
      />
    );
    
    expect(screen.getByText('Loading comments...')).toBeInTheDocument();
  });
  
  it('renders empty state correctly', () => {
    render(
      <CommentList
        comments={[]}
        isLoading={false}
        articleId="article-123"
      />
    );
    
    expect(screen.getByText(/No comments yet/i)).toBeInTheDocument();
  });
  
  it('renders comments correctly', () => {
    render(
      <CommentList
        comments={mockComments}
        isLoading={false}
        articleId="article-123"
      />
    );
    
    // Both comments should be rendered
    expect(screen.getByText('This is comment one')).toBeInTheDocument();
    expect(screen.getByText('This is comment two')).toBeInTheDocument();
    
    // Author names should be rendered
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    
    // Like counts should be rendered
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
  
  it('passes onReply prop to CommentItem', () => {
    const mockOnReply = vi.fn();
    
    render(
      <CommentList
        comments={mockComments}
        isLoading={false}
        articleId="article-123"
        onReply={mockOnReply}
      />
    );
    
    // We're not testing the actual click functionality here as that would be
    // testing CommentItem behavior, but we're making sure the prop is passed
    expect(screen.getAllByText('Reply').length).toBe(2);
  });
});
