
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArticleFormData } from '@/types/ArticleEditorTypes';

interface CategoryLookupProps {
  categorySlug?: string;
  categoryName?: string;
  isNewArticle: boolean;
  formData: ArticleFormData;
  setFormData: React.Dispatch<React.SetStateAction<ArticleFormData>>;
}

const CategoryLookup: React.FC<CategoryLookupProps> = ({
  categorySlug,
  categoryName,
  isNewArticle,
  formData,
  setFormData
}) => {
  const { toast } = useToast();

  useEffect(() => {
    if (isNewArticle && (categorySlug || categoryName) && !formData.categoryId) {
      const lookupCategory = async () => {
        try {
          console.log('CategoryLookup: Looking up category:', { categorySlug, categoryName });
          
          let query = supabase.from('categories').select('id, name, slug');
          
          if (categorySlug) {
            query = query.eq('slug', categorySlug);
          } else if (categoryName) {
            query = query.eq('name', categoryName);
          }
          
          const { data, error } = await query.maybeSingle();
          
          if (data && !error) {
            console.log('CategoryLookup: Found category:', data);
            setFormData(prev => ({ ...prev, categoryId: data.id }));
          } else {
            console.warn('CategoryLookup: Category not found');
            toast({
              title: "Category not found",
              description: `Could not find category "${categorySlug || categoryName}". Please select a category manually.`,
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('CategoryLookup: Category lookup error:', error);
        }
      };
      
      lookupCategory();
    }
  }, [categorySlug, categoryName, isNewArticle, formData.categoryId, toast, setFormData]);

  return null; // This is a logic-only component
};

export default CategoryLookup;
