
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

interface UseArticleFormLogicProps {
  articleType: string;
}

export const useArticleFormLogic = ({ articleType }: UseArticleFormLogicProps) => {
  console.log('useArticleFormLogic: Initializing for article type:', articleType);

  // Create clean, simple default values for form initialization
  const getDefaultValues = (type: string): ArticleFormSchemaType => {
    console.log('getDefaultValues: Creating defaults for type:', type);
    
    // Base defaults - simple empty strings that users will fill
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

    // Return type-specific defaults with clean structure
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
          content: '', // Optional for debates but we'll start with empty
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
      
      default: // 'standard' type
        return {
          ...baseDefaults,
          articleType: 'standard' as const,
        };
    }
  };

  // Get default values for this article type
  const defaultValues = getDefaultValues(articleType);
  
  // Initialize form with Zod resolver - it will handle validation properly
  const form = useForm<ArticleFormSchemaType>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: defaultValues,
    mode: 'onSubmit', // Only validate on submit to avoid premature validation
    reValidateMode: 'onChange'
  });

  console.log('Form initialized successfully for article type:', articleType);

  return form;
};
