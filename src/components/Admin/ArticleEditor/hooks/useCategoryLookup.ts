
import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

// Map route slugs to database slugs for category lookup
const SLUG_MAPPING: Record<string, string> = {
  'in-the-neighborhood': 'neighborhood',
  'spice': 'spice-it-up',
  'school': 'school-news'
};

interface UseCategoryLookupProps {
  form: UseFormReturn<ArticleFormSchemaType>;
  isNewArticle: boolean;
  categorySlug?: string;
  categoryName?: string;
}

export const useCategoryLookup = ({
  form,
  isNewArticle,
  categorySlug,
  categoryName
}: UseCategoryLookupProps) => {
  const { toast } = useToast();
  const { setValue } = form;

  useEffect(() => {
    if (isNewArticle && (categorySlug || categoryName) && !form.getValues('categoryId')) {
      const lookupCategory = async () => {
        try {
          console.log('useCategoryLookup: Looking up category:', { categorySlug, categoryName });
          
          let query = supabase.from('categories').select('id, name, slug');
          
          if (categorySlug) {
            // First try direct slug match
            const directQuery = query.eq('slug', categorySlug);
            const { data: directData, error: directError } = await directQuery.maybeSingle();
            
            if (directData && !directError) {
              console.log('useCategoryLookup: Found category with direct slug:', directData);
              setValue('categoryId', directData.id);
              return;
            }
            
            // Try mapped slug if direct match fails
            const mappedSlug = SLUG_MAPPING[categorySlug];
            if (mappedSlug) {
              console.log('useCategoryLookup: Trying mapped slug:', { originalSlug: categorySlug, mappedSlug });
              const mappedQuery = supabase.from('categories').select('id, name, slug').eq('slug', mappedSlug);
              const { data: mappedData, error: mappedError } = await mappedQuery.maybeSingle();
              
              if (mappedData && !mappedError) {
                console.log('useCategoryLookup: Found category with mapped slug:', mappedData);
                setValue('categoryId', mappedData.id);
                return;
              }
            }
          } else if (categoryName) {
            query = query.eq('name', categoryName);
            const { data, error } = await query.maybeSingle();
            
            if (data && !error) {
              console.log('useCategoryLookup: Found category by name:', data);
              setValue('categoryId', data.id);
              return;
            }
          }
          
          console.warn('useCategoryLookup: Category not found');
          toast({
            title: "Category not found",
            description: `Could not find category "${categorySlug || categoryName}". Please select a category manually.`,
            variant: "destructive"
          });
        } catch (error) {
          console.error('useCategoryLookup: Category lookup error:', error);
        }
      };
      
      lookupCategory();
    }
  }, [categorySlug, categoryName, isNewArticle, form, setValue, toast]);
};
