/**
 * Author Article Creator Component
 * 
 * Provides a simplified article creation interface for authors with
 * automatic author assignment and ownership validation
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  PenLine, 
  Save, 
  Send,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { requestArticleReview } from '@/services/articles/articleReviewService';

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  excerpt: z.string().max(500, 'Excerpt must be less than 500 characters').optional(),
  category_id: z.string().min(1, 'Category is required')
});

type ArticleFormData = z.infer<typeof articleSchema>;

interface AuthorArticleCreatorProps {
  onArticleCreated?: (articleId: string) => void;
  className?: string;
}

export const AuthorArticleCreator: React.FC<AuthorArticleCreatorProps> = ({
  onArticleCreated,
  className
}) => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    mode: 'onChange'
  });

  // Load categories on mount
  React.useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (err) {
        console.error('Error loading categories:', err);
        setError('Failed to load categories');
      }
    };

    loadCategories();
  }, []);

  const createArticle = async (data: ArticleFormData, status: 'draft' | 'pending_review') => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const articleData = {
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || data.content.substring(0, 200) + '...',
      category_id: data.category_id,
      author_id: user.id, // Automatic author assignment
      status,
      article_type: 'standard',
      slug: `${slug}-${Date.now()}`, // Ensure uniqueness
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(status === 'pending_review' && {
        submitted_for_review_at: new Date().toISOString()
      })
    };

    const { data: article, error } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (error) throw error;
    return article;
  };

  const handleSaveDraft = async (data: ArticleFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const article = await createArticle(data, 'draft');
      
      setSuccess('Article saved as draft successfully!');
      reset();
      
      if (onArticleCreated) {
        onArticleCreated(article.id);
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async (data: ArticleFormData) => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const article = await createArticle(data, 'pending_review');
      
      setSuccess('Article submitted for review successfully!');
      reset();
      
      if (onArticleCreated) {
        onArticleCreated(article.id);
      }
    } catch (err) {
      console.error('Error submitting for review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit for review');
    } finally {
      setSubmitting(false);
    }
  };

  const watchedTitle = watch('title', '');
  const watchedContent = watch('content', '');

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            Create New Article
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter article title..."
                {...register('title')}
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {watchedTitle.length}/200 characters
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <select
                id="category_id"
                {...register('category_id')}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.category_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-sm text-red-500">{errors.category_id.message}</p>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                placeholder="Write your article content here..."
                rows={12}
                {...register('content')}
                className={errors.content ? 'border-red-500' : ''}
              />
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {watchedContent.length} characters
              </p>
            </div>

            {/* Excerpt */}
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt (Optional)</Label>
              <Textarea
                id="excerpt"
                placeholder="Brief summary of your article (will be auto-generated if left empty)..."
                rows={3}
                {...register('excerpt')}
                className={errors.excerpt ? 'border-red-500' : ''}
              />
              {errors.excerpt && (
                <p className="text-sm text-red-500">{errors.excerpt.message}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleSubmit(handleSaveDraft)}
                disabled={submitting || !isValid}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save as Draft
              </Button>
              
              <Button
                type="button"
                onClick={handleSubmit(handleSubmitForReview)}
                disabled={submitting || !isValid}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit for Review
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p className="font-medium mb-1">Article Creation Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Save as draft to continue editing later</li>
                <li>Submit for review when your article is ready for publication</li>
                <li>You can edit drafts and rejected articles</li>
                <li>Articles under review cannot be edited until reviewed</li>
              </ul>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthorArticleCreator;