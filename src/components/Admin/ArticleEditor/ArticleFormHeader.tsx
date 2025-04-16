
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn } from 'react-hook-form';
import RichTextEditor from './RichTextEditor';

interface ArticleFormHeaderProps {
  form: UseFormReturn<any>;
  content: string;
  setContent: (content: string) => void;
}

const ArticleFormHeader: React.FC<ArticleFormHeaderProps> = ({ 
  form, 
  content, 
  setContent 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Article Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter article title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Excerpt</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Write a short summary of your article" 
                  {...field} 
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <FormLabel>Content</FormLabel>
          <RichTextEditor 
            value={content} 
            onChange={setContent} 
            placeholder="Start writing your article..."
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ArticleFormHeader;
