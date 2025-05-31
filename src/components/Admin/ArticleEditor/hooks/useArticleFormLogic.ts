
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { articleFormSchema, ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

interface UseArticleFormLogicProps {
  articleType: string;
}

export const useArticleFormLogic = ({ articleType }: UseArticleFormLogicProps) => {
  // Initialize form with React Hook Form including all required default values
  const form = useForm<ArticleFormSchemaType>({
    resolver: zodResolver(articleFormSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      imageUrl: '',
      categoryId: '',
      slug: '',
      articleType: articleType as any,
      status: 'draft',
      publishDate: null,
      shouldHighlight: false,
      allowVoting: false,
      debateSettings: {
        question: '',
        yesPosition: '',
        noPosition: '',
        votingEnabled: true,
        voting_ends_at: null
      },
      storyboardEpisodes: []
    }
  });

  return form;
};
