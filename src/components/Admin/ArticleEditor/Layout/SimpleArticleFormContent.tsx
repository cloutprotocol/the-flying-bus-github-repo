
import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { supabase } from '@/integrations/supabase/client';

interface SimpleArticleFormContentProps {
  formData: ArticleFormData;
  onChange: (field: keyof ArticleFormData, value: any) => void;
  isSubmitting?: boolean;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

const SimpleArticleFormContent: React.FC<SimpleArticleFormContentProps> = ({
  formData,
  onChange,
  isSubmitting = false
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name');
        
        if (error) {
          console.error('Error fetching categories:', error);
        } else if (data) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Exception fetching categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title">
          {formData.articleType === 'storyboard' ? 'Series Title' : 'Title'} *
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder={
            formData.articleType === 'storyboard' 
              ? "Enter your storyboard series title" 
              : "Enter your article title"
          }
          disabled={isSubmitting}
          required
        />
      </div>

      {/* Excerpt Field */}
      <div className="space-y-2">
        <Label htmlFor="excerpt">
          {formData.articleType === 'storyboard' ? 'Series Summary' : 'Excerpt'}
        </Label>
        <Textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) => onChange('excerpt', e.target.value)}
          placeholder={
            formData.articleType === 'storyboard'
              ? "Brief summary of your storyboard series"
              : "Brief summary or excerpt of your article"
          }
          rows={3}
          disabled={isSubmitting}
        />
      </div>

      {/* Cover Image URL Field */}
      <div className="space-y-2">
        <Label htmlFor="imageUrl">
          {formData.articleType === 'storyboard' ? 'Series Cover Image URL' : 'Cover Image URL'}
        </Label>
        <Input
          id="imageUrl"
          value={formData.imageUrl}
          onChange={(e) => onChange('imageUrl', e.target.value)}
          placeholder="Enter image URL"
          disabled={isSubmitting}
        />
      </div>

      {/* Category Selection */}
      <div className="space-y-2">
        <Label>Category *</Label>
        <Select 
          value={formData.categoryId} 
          onValueChange={(value) => onChange('categoryId', value)}
          disabled={isSubmitting || loadingCategories}
        >
          <SelectTrigger>
            <SelectValue placeholder={loadingCategories ? "Loading categories..." : "Select a category"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Field */}
      <div className="space-y-2">
        <Label htmlFor="content">
          {formData.articleType === 'storyboard' ? 'Series Description' : 'Content'} *
        </Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => onChange('content', e.target.value)}
          placeholder={
            formData.articleType === 'storyboard'
              ? "Detailed description of your storyboard series..."
              : "Write your article content here..."
          }
          rows={12}
          disabled={isSubmitting}
          className="min-h-[300px]"
        />
      </div>

      {/* Video URL for video articles */}
      {formData.articleType === 'video' && (
        <div className="space-y-2">
          <Label htmlFor="videoUrl">Video URL</Label>
          <Input
            id="videoUrl"
            value={formData.videoUrl || ''}
            onChange={(e) => onChange('videoUrl', e.target.value)}
            placeholder="Enter video URL"
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Slug Field */}
      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => onChange('slug', e.target.value)}
          placeholder="article-url-slug"
          disabled={isSubmitting}
        />
        <p className="text-sm text-muted-foreground">
          Leave empty to auto-generate from title
        </p>
      </div>
    </div>
  );
};

export default SimpleArticleFormContent;
