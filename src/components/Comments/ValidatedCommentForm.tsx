
import React from 'react';
import { createCommentSchema } from '@/utils/validation/commentValidation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ValidatedForm from '@/components/common/ValidatedForm';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CommentFormProps {
  articleId: string;
  parentId?: string;
  onCommentSubmitted?: () => void;
  placeholder?: string;
}

const ValidatedCommentForm: React.FC<CommentFormProps> = ({
  articleId,
  parentId,
  onCommentSubmitted,
  placeholder = 'Share your thoughts...',
}) => {
  const { currentUser, isLoggedIn } = useAuth();
  const { toast } = useToast();
  
  const handleSubmit = async (data: {
    content: string;
  }) => {
    if (!isLoggedIn || !currentUser) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to post a comment.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      // This would be replaced with actual API call
      console.log('Submitting comment:', {
        content: data.content,
        articleId,
        parentId,
        userId: currentUser.id,
      });
      
      toast({
        title: 'Comment submitted',
        description: 'Your comment has been submitted for moderation.',
      });
      
      if (onCommentSubmitted) {
        onCommentSubmitted();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while submitting your comment.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser?.avatar} alt={currentUser?.displayName || 'User'} />
          <AvatarFallback>
            {currentUser?.displayName?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <ValidatedForm
          schema={createCommentSchema.pick({ content: true })}
          onSubmit={handleSubmit}
          defaultValues={{ content: '' }}
          className="flex-1"
        >
          {(methods) => (
            <>
              <FormField
                control={methods.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder={placeholder}
                        rows={3}
                        className="resize-none bg-gray-50 border-gray-200 focus:bg-white"
                        disabled={!isLoggedIn}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end mt-2">
                <Button 
                  type="submit"
                  disabled={!isLoggedIn || methods.formState.isSubmitting}
                  className="bg-flyingbus-purple hover:bg-flyingbus-purple/90"
                >
                  {methods.formState.isSubmitting ? 'Submitting...' : 'Post Comment'}
                </Button>
              </div>
            </>
          )}
        </ValidatedForm>
      </div>
    </div>
  );
};

export default ValidatedCommentForm;
