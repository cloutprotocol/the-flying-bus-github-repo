
import React, { useEffect, useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getCategoryIcon } from '@/utils/getCategoryIcon';
import { UseFormReturn } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { ArticleFormSchemaType } from '@/utils/validation/articleFormSchema';

interface CategorySelectorProps {
  form: UseFormReturn<ArticleFormSchemaType>;
  preselectedSlug?: string;
  preselectedName?: string;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

// Map route slugs to database slugs
const SLUG_MAPPING: Record<string, string> = {
  'in-the-neighborhood': 'neighborhood',
  'spice': 'spice-it-up',
  'school': 'school-news'
};

// Reverse mapping from database slugs to route slugs
const REVERSE_SLUG_MAPPING: Record<string, string> = {
  'neighborhood': 'in-the-neighborhood',
  'spice-it-up': 'spice',
  'school-news': 'school'
};

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  form, 
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
          
          logger.debug(LogSource.EDITOR, 'Categories fetched for selector', {
            count: data.length,
            preselectedSlug,
            preselectedName
          });
          
          // Try to find and set preselected category
          if (preselectedSlug || preselectedName) {
            let matchedCategory = null;
            
            // First try direct slug match
            if (preselectedSlug) {
              matchedCategory = data.find(cat => cat.slug === preselectedSlug);
            }
            
            // Try mapped slug if direct match fails
            if (!matchedCategory && preselectedSlug) {
              const mappedSlug = SLUG_MAPPING[preselectedSlug];
              if (mappedSlug) {
                matchedCategory = data.find(cat => cat.slug === mappedSlug);
                logger.info(LogSource.EDITOR, 'Using slug mapping', {
                  originalSlug: preselectedSlug,
                  mappedSlug: mappedSlug
                });
              }
            }
            
            // Fallback to name match
            if (!matchedCategory && preselectedName) {
              matchedCategory = data.find(cat => cat.name === preselectedName);
            }
            
            if (matchedCategory) {
              form.setValue('categoryId', matchedCategory.id);
              setPreselectedCategory(matchedCategory);
              
              logger.info(LogSource.EDITOR, 'Category preselected in selector', {
                categoryId: matchedCategory.id,
                categoryName: matchedCategory.name,
                categorySlug: matchedCategory.slug
              });
            } else {
              logger.warn(LogSource.EDITOR, 'No matching category found in selector', {
                preselectedSlug,
                preselectedName,
                availableCategories: data.map(cat => ({ name: cat.name, slug: cat.slug }))
              });
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
  }, [preselectedSlug, preselectedName, form]);

  return (
    <FormField
      control={form.control}
      name="categoryId"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Category</FormLabel>
          
          {preselectedCategory && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Category <strong>{preselectedCategory.name}</strong> has been pre-selected from your choice.
              </AlertDescription>
            </Alert>
          )}
          
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
                      {preselectedCategory?.id === category.id && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Pre-selected
                        </span>
                      )}
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
