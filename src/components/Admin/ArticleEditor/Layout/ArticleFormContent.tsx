
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import RichTextEditor from '../RichTextEditor';
import CategorySelector from '../CategorySelector';
import MetadataFields from '../MetadataFields';
import VideoFormSection from '../VideoFormSection';
import DebateFormSection from '../DebateFormSection';
import StoryboardFields from '../StoryboardFields';
import MediaSelector from '../MediaSelector/MediaSelector';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

interface ArticleFormContentProps {
  formData: ArticleFormData;
  onChange: (field: keyof ArticleFormData, value: any) => void;
  isSubmitting?: boolean;
}

const ArticleFormContent: React.FC<ArticleFormContentProps> = ({
  formData,
  onChange,
  isSubmitting = false
}) => {
  // Create a complete mock form object that satisfies the UseFormReturn interface
  const mockForm = {
    control: null as any,
    getValues: () => formData,
    setValue: (field: string, value: any) => {
      onChange(field as keyof ArticleFormData, value);
    },
    watch: ((field?: string) => {
      if (field) {
        return formData[field as keyof ArticleFormData];
      }
      return formData;
    }) as any,
    register: () => ({ name: '', onBlur: () => {}, onChange: () => {}, ref: () => {} }),
    getFieldState: () => ({ invalid: false, isTouched: false, isDirty: false, error: undefined }),
    setError: () => {},
    clearErrors: () => {},
    trigger: () => Promise.resolve(true),
    reset: () => {},
    resetField: () => {},
    setFocus: () => {},
    unregister: () => {},
    handleSubmit: (onValid: any) => (e?: any) => {
      e?.preventDefault();
      onValid(formData);
    },
    formState: {
      errors: {},
      isDirty: false,
      isValid: true,
      isSubmitting: false,
      isValidating: false,
      submitCount: 0,
      touchedFields: {},
      dirtyFields: {}
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Article Information */}
      <div className="space-y-4">
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

        <div className="space-y-2">
          <Label>
            {formData.articleType === 'storyboard' ? 'Series Cover Image' : 'Cover Image'}
          </Label>
          <MediaSelector form={mockForm} />
        </div>

        <CategorySelector form={mockForm} />
      </div>

      {/* Content Section - Different for each article type */}
      {formData.articleType === 'storyboard' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Series Description</Label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => onChange('content', value)}
              placeholder="Detailed description of your storyboard series..."
            />
          </div>
          
          <StoryboardFields
            episodes={formData.storyboardEpisodes || []}
            onEpisodesChange={(episodes) => onChange('storyboardEpisodes', episodes)}
            isSubmitting={isSubmitting}
          />
        </div>
      ) : formData.articleType === 'video' ? (
        <div className="space-y-4">
          <VideoFormSection form={mockForm} />
          
          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => onChange('content', value)}
              placeholder="Write your article content here..."
            />
          </div>
        </div>
      ) : formData.articleType === 'debate' ? (
        <div className="space-y-4">
          <DebateFormSection form={mockForm} />
          
          <div className="space-y-2">
            <Label htmlFor="content">Additional Context</Label>
            <RichTextEditor
              value={formData.content}
              onChange={(value) => onChange('content', value)}
              placeholder="Provide additional context for the debate..."
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <RichTextEditor
            value={formData.content}
            onChange={(value) => onChange('content', value)}
            placeholder="Write your article content here..."
          />
        </div>
      )}

      {/* Metadata Fields */}
      <MetadataFields form={mockForm} articleType={formData.articleType} />
    </div>
  );
};

export default ArticleFormContent;
