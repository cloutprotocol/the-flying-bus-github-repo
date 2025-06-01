
import React, { useState, useEffect } from 'react';
import { FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MetadataFieldsProps {
  form: any; // Generic form type to work with all form types
  articleType?: string; // New prop to determine which fields to show
}

const MetadataFields: React.FC<MetadataFieldsProps> = ({ form, articleType = 'standard' }) => {
  const [hasFeaturedArticle, setHasFeaturedArticle] = useState(false);
  const [featuredArticleTitle, setFeaturedArticleTitle] = useState('');
  const [showFeaturedWarning, setShowFeaturedWarning] = useState(false);

  // Check if there's already a featured article
  useEffect(() => {
    const checkFeaturedArticle = async () => {
      try {
        const { data, error } = await supabase
          .from('articles')
          .select('id, title')
          .eq('featured', true)
          .limit(1);

        if (error) {
          console.error('Error checking featured article:', error);
          return;
        }

        if (data && data.length > 0) {
          setHasFeaturedArticle(true);
          setFeaturedArticleTitle(data[0].title);
        }
      } catch (err) {
        console.error('Exception checking featured article:', err);
      }
    };

    checkFeaturedArticle();
  }, []);

  // Watch for changes to shouldHighlight field
  const shouldHighlight = form.watch('shouldHighlight');
  
  useEffect(() => {
    setShowFeaturedWarning(shouldHighlight && hasFeaturedArticle);
  }, [shouldHighlight, hasFeaturedArticle]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-medium">Article Settings</h3>
      
      <div className="flex items-center justify-between">
        <FormField
          control={form.control}
          name="shouldHighlight"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Feature this article</FormLabel>
            </FormItem>
          )}
        />

        {/* Only show "Allow voting" for debate articles */}
        {articleType === 'debate' && (
          <FormField
            control={form.control}
            name="allowVoting"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>Allow voting</FormLabel>
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Warning about replacing featured article */}
      {showFeaturedWarning && (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Setting this as the featured article will remove "{featuredArticleTitle}" 
            from being featured. Only one article can be featured at a time.
          </AlertDescription>
        </Alert>
      )}
      
      <p className="text-sm text-muted-foreground">
        Article URL will be automatically generated from the title
      </p>
    </div>
  );
};

export default MetadataFields;
