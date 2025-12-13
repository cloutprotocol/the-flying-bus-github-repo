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
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { user } = useAuth();
  const categories = useQuery(api.categories.getActive) || [];

  const submitMutation = useMutation(api.articles.submit);

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

  const generateSlug = (title: string) => {
    return title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  };

  const handleSaveDraft = async (data: ArticleFormData) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const articleId = await submitMutation({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        categoryId: data.category_id, // Map form field to mutation arg
        status: 'draft',
        articleType: 'standard',
        slug: generateSlug(data.title),
        publishImmediately: false,
      });

      setSuccess('Article saved as draft successfully!');
      reset();

      if (onArticleCreated && articleId) {
        onArticleCreated(articleId);
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async (data: ArticleFormData) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const articleId = await submitMutation({
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        categoryId: data.category_id,
        status: 'pending_review',
        articleType: 'standard',
        slug: generateSlug(data.title),
        publishImmediately: false,
      });

      setSuccess('Article submitted for review successfully!');
      reset();

      if (onArticleCreated && articleId) {
        onArticleCreated(articleId);
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
                className={`w-full px-3 py-2 border rounded-md ${errors.category_id ? 'border-red-500' : 'border-gray-300'
                  }`}
              >
                <option value="">Select a category...</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
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