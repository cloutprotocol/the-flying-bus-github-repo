
import React, { useEffect, useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getCategoryIcon } from '@/utils/getCategoryIcon';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { getCategoryBySlug } from '@/utils/category/categoryIdMapper';

interface CategorySelectorProps {
  form: any;
  isNewArticle?: boolean;
  preselectedSlug?: string;
  preselectedName?: string;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  form, 
  isNewArticle = false,
  preselectedSlug, 
  preselectedName 
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [preselectedCategory, setPreselectedCategory] = useState<Category | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name');
        
        if (error) {
          logger.error(LogSource.EDITOR, 'Error fetching categories', error);
          return;
        }

        if (data) {
          setCategories(data);
          
          // For new articles, pre-select the category from the modal
          if (isNewArticle && preselectedSlug) {
            const category = await getCategoryBySlug(preselectedSlug);
            if (category) {
              form.setValue('categoryId', category.id);
              setPreselectedCategory(category);
              logger.info(LogSource.EDITOR, 'Category pre-selected for new article', {
                categoryId: category.id,
                categoryName: category.name,
                categorySlug: category.slug
              });
            } else {
              logger.warn(LogSource.EDITOR, 'Category not found for slug', { preselectedSlug });
            }
          }
        }
      } catch (err) {
        logger.error(LogSource.EDITOR, 'Exception fetching categories', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [preselectedSlug, preselectedName, form, isNewArticle]);

  // For new articles, just show the selected category
  if (isNewArticle && preselectedCategory) {
    return (
      <div className="space-y-3">
        <FormLabel>Category</FormLabel>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span>{getCategoryIcon(preselectedCategory.name)}</span>
              <strong>{preselectedCategory.name}</strong> has been selected for this article.
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // For existing articles, show the full selector
  return (
    <FormField
      control={form.control}
      name="categoryId"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Category</FormLabel>
          
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value}
              className="grid grid-cols-1 gap-2"
            >
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading categories...</div>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={category.id} id={category.id} />
                    <label
                      htmlFor={category.id}
                      className="flex items-center cursor-pointer text-sm"
                    >
                      <span className="mr-2">{getCategoryIcon(category.name)}</span>
                      {category.name}
                    </label>
                  </div>
                ))
              )}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CategorySelector;
