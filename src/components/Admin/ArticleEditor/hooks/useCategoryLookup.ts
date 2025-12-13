
import { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
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
  const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL!);

  useEffect(() => {
    if (isNewArticle && (categorySlug || categoryName) && !form.getValues('categoryId')) {
      const lookupCategory = async () => {
        try {
          console.log('useCategoryLookup: Looking up category:', { categorySlug, categoryName });
          
          if (categorySlug) {
            // First try direct slug match
            const directData = await convex.query(api.categories.getBySlug, { slug: categorySlug });
            if (directData) {
              console.log('useCategoryLookup: Found category with direct slug:', directData);
              setValue('categoryId', (directData._id as Id<'categories'>) as any);
              return;
            }
            
            // Try mapped slug if direct match fails
            const mappedSlug = SLUG_MAPPING[categorySlug];
            if (mappedSlug) {
              console.log('useCategoryLookup: Trying mapped slug:', { originalSlug: categorySlug, mappedSlug });
              const mappedData = await convex.query(api.categories.getBySlug, { slug: mappedSlug });
              if (mappedData) {
                console.log('useCategoryLookup: Found category with mapped slug:', mappedData);
                setValue('categoryId', (mappedData._id as Id<'categories'>) as any);
                return;
              }
            }
          } else if (categoryName) {
            // Fallback: fetch all and match by name
            const all = await convex.query(api.categories.getAll, {} as any);
            const match = (all || []).find((c: any) => c.name === categoryName);
            if (match) {
              console.log('useCategoryLookup: Found category by name:', match);
              setValue('categoryId', (match._id as Id<'categories'>) as any);
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
