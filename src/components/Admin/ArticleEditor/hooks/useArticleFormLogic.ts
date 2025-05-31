
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

interface UseArticleFormLogicProps {
  articleType: string;
}

export const useArticleFormLogic = ({ articleType }: UseArticleFormLogicProps) => {
  // Create type-specific default values based on article type
  const getDefaultValues = (type: string): ArticleFormSchemaType => {
    const baseDefaults = {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: type as any,
      status: 'draft' as const,
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
    };

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
          content: '', // Content is optional for debates but we'll provide default
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
      
      default: // 'standard' and any other types
        return {
          ...baseDefaults,
          articleType: 'standard' as const,
        };
    }
  };

  // Initialize form with React Hook Form including type-specific default values
  const form = useForm<ArticleFormSchemaType>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: getDefaultValues(articleType)
  });

  return form;
};
