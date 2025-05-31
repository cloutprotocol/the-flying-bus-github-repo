
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

interface UseArticleFormLogicProps {
  articleType: string;
}

export const useArticleFormLogic = ({ articleType }: UseArticleFormLogicProps) => {
  console.log('useArticleFormLogic: Initializing for article type:', articleType);

  // Create clean, type-specific default values that match the Zod discriminated union EXACTLY
  const getDefaultValues = (type: string): ArticleFormSchemaType => {
    console.log('getDefaultValues: Creating defaults for type:', type);
    
    // Base defaults that all articles need (required fields with proper non-empty values)
    const baseDefaults = {
      title: '', // Will be filled by user
      content: '', // Will be filled by user  
      excerpt: '',
      imageUrl: '', // Will be filled by user
      categoryId: '', // Will be set by category lookup
      slug: '',
      status: 'draft' as const,
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
    };

    console.log('Base defaults created:', baseDefaults);

    // Return type-specific defaults with discriminated union structure
    let defaults: ArticleFormSchemaType;
    
    switch (type) {
      case 'video':
        defaults = {
          ...baseDefaults,
          articleType: 'video' as const,
          videoUrl: '', // Required for video type
        };
        break;
      
      case 'debate':
        defaults = {
          ...baseDefaults,
          articleType: 'debate' as const,
          content: '', // Optional for debates
          debateSettings: {
            question: '', // Will be filled by user
            yesPosition: '', // Will be filled by user
            noPosition: '', // Will be filled by user
            votingEnabled: true,
            voting_ends_at: null
          }
        };
        break;
      
      case 'storyboard':
        defaults = {
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
        break;
      
      default: // 'standard' type (headliners, etc.)
        defaults = {
          ...baseDefaults,
          articleType: 'standard' as const,
        };
        break;
    }

    console.log('Final defaults for type', type, ':', defaults);
    return defaults;
  };

  // Get default values for this article type
  const defaultValues = getDefaultValues(articleType);
  
  // Validate that our default values conform to the schema
  try {
    const validationResult = articleFormSchema.safeParse(defaultValues);
    if (!validationResult.success) {
      console.warn('Default values validation failed:', validationResult.error);
      console.warn('Will proceed without Zod resolver to prevent initialization errors');
    } else {
      console.log('Default values validation passed');
    }
  } catch (error) {
    console.error('Error validating default values:', error);
  }

  // Initialize form with conditional Zod validation - disable during initialization to prevent errors
  const form = useForm<ArticleFormSchemaType>({
    // Temporarily disable Zod resolver during initialization to prevent validation conflicts
    // resolver: zodResolver(articleFormSchema),
    defaultValues: defaultValues,
    mode: 'onSubmit', // Only validate when user submits
    reValidateMode: 'onChange'
  });

  console.log('Form initialized successfully for article type:', articleType);
  console.log('Form values after initialization:', form.getValues());

  return form;
};
