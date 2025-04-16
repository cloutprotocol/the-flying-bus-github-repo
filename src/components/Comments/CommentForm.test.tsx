
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test/TestRenderer';
import CommentForm from './CommentForm';

describe('CommentForm', () => {
  const mockOnSubmit = vi.fn();
  
  beforeEach(() => {
    mockOnSubmit.mockClear();
  });
  
  it('renders correctly when user is not logged in', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />);
    
    // Should show sign in message
    expect(screen.getByPlaceholderText('Sign in to join the discussion')).toBeInTheDocument();
    
    // The textarea should be disabled
    expect(screen.getByRole('textbox')).toBeDisabled();
    
    // Should have a sign in button
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    
    // Post button should be disabled
    expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled();
  });
  
  it('renders correctly when user is logged in', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />, { authenticated: true });
    
    // Should show proper placeholder
    expect(screen.getByPlaceholderText('Share your thoughts...')).toBeInTheDocument();
    
    // The textarea should be enabled
    expect(screen.getByRole('textbox')).not.toBeDisabled();
    
    // Should not have a sign in button
    expect(screen.queryByRole('button', { name: /sign in/i })).not.toBeInTheDocument();
    
    // Post button should be disabled (until text is entered)
    expect(screen.getByRole('button', { name: /post comment/i })).toBeDisabled();
  });
  
  it('enables post button when text is entered', async () => {
    const user = userEvent.setup();
    render(<CommentForm onSubmit={mockOnSubmit} />, { authenticated: true });
    
    const textarea = screen.getByRole('textbox');
    const postButton = screen.getByRole('button', { name: /post comment/i });
    
    // Initially disabled
    expect(postButton).toBeDisabled();
    
    // Enter text
    await user.type(textarea, 'This is a test comment');
    
    // Now button should be enabled
    expect(postButton).not.toBeDisabled();
  });
  
  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    render(<CommentForm onSubmit={mockOnSubmit} />, { authenticated: true });
    
    const textarea = screen.getByRole('textbox');
    const postButton = screen.getByRole('button', { name: /post comment/i });
    
    // Enter text and submit
    await user.type(textarea, 'This is a test comment');
    await user.click(postButton);
    
    // onSubmit should be called with the entered text
    expect(mockOnSubmit).toHaveBeenCalledWith('This is a test comment');
    
    // Textarea should be cleared after submission
    expect(textarea).toHaveValue('');
  });
  
  it('disables the form when isSubmitting is true', () => {
    render(<CommentForm onSubmit={mockOnSubmit} isSubmitting={true} />, { authenticated: true });
    
    // Both textarea and button should be disabled
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: /posting/i })).toBeDisabled();
    
    // Button text should change
    expect(screen.getByText('Posting...')).toBeInTheDocument();
  });
});
