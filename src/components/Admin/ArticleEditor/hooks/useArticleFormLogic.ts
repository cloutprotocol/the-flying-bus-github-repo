
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

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

  // Initialize form with clean, type-specific defaults
  const form = useForm<ArticleFormSchemaType>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: getDefaultValues(articleType),
    // Set validation mode to reduce excessive validation calls
    mode: 'onSubmit',
    reValidateMode: 'onChange'
  });

  console.log('Form initialized for article type:', articleType, 'with defaults:', form.getValues());

  return form;
};
