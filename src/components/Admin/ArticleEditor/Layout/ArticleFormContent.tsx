
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
          <MediaSelector
            value={formData.imageUrl}
            onChange={(url) => onChange('imageUrl', url)}
            disabled={isSubmitting}
          />
        </div>

        <CategorySelector
          categoryId={formData.categoryId}
          onCategoryChange={(value) => onChange('categoryId', value)}
          disabled={isSubmitting}
        />
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
          <VideoFormSection
            value={formData.videoUrl}
            onChange={(url) => onChange('videoUrl', url)}
            disabled={isSubmitting}
          />
          
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
          <DebateFormSection
            question={formData.debateSettings?.question || ''}
            yesPosition={formData.debateSettings?.yesPosition || ''}
            noPosition={formData.debateSettings?.noPosition || ''}
            votingEnabled={formData.debateSettings?.votingEnabled ?? true}
            votingEndsAt={formData.debateSettings?.voting_ends_at || ''}
            onQuestionChange={(question) => onChange('debateSettings', { ...formData.debateSettings, question })}
            onYesPositionChange={(yesPosition) => onChange('debateSettings', { ...formData.debateSettings, yesPosition })}
            onNoPositionChange={(noPosition) => onChange('debateSettings', { ...formData.debateSettings, noPosition })}
            onVotingEnabledChange={(votingEnabled) => onChange('debateSettings', { ...formData.debateSettings, votingEnabled })}
            onVotingEndsAtChange={(voting_ends_at) => onChange('debateSettings', { ...formData.debateSettings, voting_ends_at })}
            disabled={isSubmitting}
          />
          
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
      <MetadataFields
        value={formData.slug}
        onChange={(slug) => onChange('slug', slug)}
        disabled={isSubmitting}
      />
    </div>
  );
};

export default ArticleFormContent;
