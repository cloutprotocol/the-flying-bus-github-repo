
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

interface UseArticleFormLogicProps {
  articleType: string;
}

export const useArticleFormLogic = ({ articleType }: UseArticleFormLogicProps) => {
  // Create clean, type-specific default values that match the Zod discriminated union
  const getDefaultValues = (type: string): ArticleFormSchemaType => {
    // Base defaults that all articles need (required fields with proper values)
    const baseDefaults = {
      title: '', // Required field
      content: '', // Required field for most types
      excerpt: '',
      imageUrl: '', // Required field
      categoryId: '', // Required field
      slug: '',
      status: 'draft' as const,
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
    };

    // Return type-specific defaults with discriminated union structure
    switch (type) {
      case 'video':
        return {
          ...baseDefaults,
          articleType: 'video' as const,
          videoUrl: '', // Required for video type
        };
      
      case 'debate':
        return {
          ...baseDefaults,
          articleType: 'debate' as const,
          content: '', // Optional for debates, but provide default
          debateSettings: {
            question: '', // Required for debate type
            yesPosition: '', // Required for debate type
            noPosition: '', // Required for debate type
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

  // Initialize form with Zod validation and proper typing
  const form = useForm<ArticleFormSchemaType>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: getDefaultValues(articleType),
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  console.log('Form initialized for article type:', articleType, 'with defaults:', form.getValues());

  return form;
};
