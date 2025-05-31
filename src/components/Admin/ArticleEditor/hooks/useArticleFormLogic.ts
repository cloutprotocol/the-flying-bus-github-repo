
import { useForm } from 'react-hook-form';
// Remove zodResolver temporarily to isolate the issue
// import { zodResolver } from '@hookform/resolvers/zod';
// import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

// Create a simplified type for now
interface ArticleFormSchemaType {
  title: string;
  content: string;
  excerpt?: string;
  imageUrl: string;
  categoryId: string;
  slug?: string;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  publishDate?: string | null;
  shouldHighlight: boolean;
  allowVoting: boolean;
  articleType: 'standard' | 'video' | 'debate' | 'storyboard';
  videoUrl?: string;
  debateSettings?: {
    question: string;
    yesPosition: string;
    noPosition: string;
    votingEnabled: boolean;
    voting_ends_at?: string | null;
  };
  storyboardEpisodes?: Array<{
    title: string;
    description: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: string;
    number: number;
    content: string;
  }>;
}

interface UseArticleFormLogicProps {
  articleType: string;
}

export const useArticleFormLogic = ({ articleType }: UseArticleFormLogicProps) => {
  // Create clean, type-specific default values
  const getDefaultValues = (type: string): ArticleFormSchemaType => {
    // Base defaults that all articles need
    const baseDefaults = {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      status: 'draft' as const,
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
    };

    // Return type-specific defaults with only the fields that type needs
    switch (type) {
      case 'video':
        return {
          ...baseDefaults,
          articleType: 'video' as const,
          videoUrl: '',
        };
      
      case 'debate':
        return {
          ...baseDefaults,
          articleType: 'debate' as const,
          content: '', // Content is optional for debates but provide default
          debateSettings: {
            question: '',
            yesPosition: '',
            noPosition: '',
            votingEnabled: true,
            voting_ends_at: null
          }
        };
      
      case 'storyboard':
        return {
          ...baseDefaults,
          articleType: 'storyboard' as const,
          storyboardEpisodes: [{
            title: 'Episode 1',
            description: '',
            videoUrl: '',
            thumbnailUrl: '',
            duration: '',
            number: 1,
            content: ''
          }]
        };
      
      default: // 'standard' type (headliners, etc.)
        return {
          ...baseDefaults,
          articleType: 'standard' as const,
        };
    }
  };

  // Initialize form with minimal validation for now
  const form = useForm<ArticleFormSchemaType>({
    // Remove zodResolver temporarily
    // resolver: zodResolver(articleFormSchema),
    defaultValues: getDefaultValues(articleType),
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  console.log('Form initialized for article type:', articleType, 'with defaults:', form.getValues());

  return form;
};

// Export the type for other components
export type { ArticleFormSchemaType };
