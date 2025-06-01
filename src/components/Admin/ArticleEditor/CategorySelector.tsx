
import React, { useEffect, useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getCategoryIcon } from '@/utils/getCategoryIcon';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface CategorySelectorProps {
  form: any;
  isNewArticle?: boolean;
  resolvedCategoryData?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({ 
  form, 
  isNewArticle = false,
  resolvedCategoryData
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(!isNewArticle);

  console.log('CategorySelector: Rendering with props:', {
    isNewArticle,
    resolvedCategoryData,
    currentCategoryValue: form.watch('categoryId')
  });

  useEffect(() => {
    // For new articles with resolved category data, don't fetch categories
    if (isNewArticle && resolvedCategoryData) {
      console.log('CategorySelector: Using resolved category data, skipping fetch');
      setLoading(false);
      return;
    }

    const fetchCategories = async () => {
      try {
        console.log('CategorySelector: Fetching categories for existing article');
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name');
        
        if (error) {
          console.error('CategorySelector: Error fetching categories:', error);
          logger.error(LogSource.EDITOR, 'Error fetching categories', error);
          return;
        }

        if (data) {
          console.log('CategorySelector: Categories fetched successfully:', data);
          setCategories(data);
          logger.info(LogSource.EDITOR, 'Categories fetched for existing article');
        }
      } catch (err) {
        console.error('CategorySelector: Exception fetching categories:', err);
        logger.error(LogSource.EDITOR, 'Exception fetching categories', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [isNewArticle, resolvedCategoryData]);

  // Track category value changes
  const currentCategoryId = form.watch('categoryId');
  
  useEffect(() => {
    console.log('CategorySelector: Category value changed:', {
      categoryId: currentCategoryId,
      resolvedCategoryId: resolvedCategoryData?.id,
      matches: currentCategoryId === resolvedCategoryData?.id
    });
  }, [currentCategoryId, resolvedCategoryData?.id]);

  // For new articles with resolved category data, show read-only display
  if (isNewArticle && resolvedCategoryData) {
    console.log('CategorySelector: Rendering read-only category display for:', resolvedCategoryData.name);
    return (
      <div className="space-y-3">
        <Label>Category</Label>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center gap-2">
              <span>{getCategoryIcon(resolvedCategoryData.name)}</span>
              <strong>{resolvedCategoryData.name}</strong> has been selected for this article.
            </div>
          </AlertDescription>
        </Alert>
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground">
            Debug: Category ID = {resolvedCategoryData.id}
          </div>
        )}
      </div>
    );
  }

  // For existing articles, show the full selector
  console.log('CategorySelector: Rendering full category selector with', categories.length, 'categories');
  
  return (
    <FormField
      control={form.control}
      name="categoryId"
      render={({ field }) => (
        <FormItem className="space-y-3">
          <FormLabel>Category</FormLabel>
          
          <FormControl>
            <RadioGroup
              onValueChange={(value) => {
                console.log('CategorySelector: Radio group value changed to:', value);
                field.onChange(value);
              }}
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
          
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground">
              Debug: Selected = {field.value}, Available = {categories.length}
            </div>
          )}
        </FormItem>
      )}
    />
  );
};

export default CategorySelector;
