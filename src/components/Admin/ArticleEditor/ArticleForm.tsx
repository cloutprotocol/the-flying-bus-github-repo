import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import RichTextEditor from './RichTextEditor';
import CategorySelector from './CategorySelector';
import MediaSelector from './MediaSelector';
import MetadataFields from './MetadataFields';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import StoryboardFields from './StoryboardFields';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Send } from 'lucide-react';
import { useZodForm } from '@/hooks/useZodForm';
import { createArticleSchema } from '@/utils/validation/articleValidation';
import { createArticle } from '@/services/articleService';
import logger, { LogSource } from '@/utils/logger';

interface ArticleFormProps {
  articleId?: string;
  articleType: string;
  isNewArticle: boolean;
}

const ArticleForm: React.FC<ArticleFormProps> = ({ 
  articleId, 
  articleType = 'standard',
  isNewArticle = true 
}) => {
  const [content, setContent] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const form = useZodForm({
    schema: createArticleSchema,
    defaultValues: {
      title: '',
      excerpt: '',
      category: '',
      content: '',
      imageUrl: '',
      readingLevel: 'Intermediate', // Default reading level
      status: 'draft',
      articleType: articleType as any,
    },
    logContext: 'article_form'
  });

  const onSubmit = async (data: any, isDraft: boolean = false) => {
    data.content = content;
    
    if (isDraft) {
      data.status = 'draft';
    } else {
      data.status = isNewArticle ? 'pending' : form.getValues('status');
    }
    
    try {
      logger.info(LogSource.CLIENT, 'Submitting article form', {
        isDraft,
        articleType
      });
      
      const result = await createArticle(data);
      
      if (result.error) {
        toast({
          title: "Error",
          description: "There was a problem saving your article.",
          variant: "destructive"
        });
        logger.error(LogSource.CLIENT, "Article submission failed", result.error);
        return;
      }
      
      toast({
        title: isDraft ? "Draft saved" : "Article submitted for review",
        description: isDraft 
          ? "Your article has been saved as a draft."
          : "Your article has been submitted for review.",
      });
      
      navigate('/admin/articles');
    } catch (error) {
      logger.error(LogSource.CLIENT, "Exception in article submission", error);
      toast({
        title: "Error",
        description: "There was a problem saving your article.",
        variant: "destructive"
      });
    }
  };

  const showStoryboardFields = articleType === 'storyboard';
  const showVideoFields = articleType === 'spiceItUp';
  const showDebateFields = articleType === 'debate';

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit((data) => onSubmit(data, false))}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
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
            
            {showStoryboardFields && (
              <StoryboardFields 
                form={form}
                isNewSeries={isNewArticle}
              />
            )}
            
            {showVideoFields && (
              <Card>
                <CardHeader>
                  <CardTitle>Video Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="videoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Video URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter YouTube or Vimeo URL" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
            
            {showDebateFields && (
              <Card>
                <CardHeader>
                  <CardTitle>Debate Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="yes">
                    <TabsList className="mb-4">
                      <TabsTrigger value="yes">Yes Argument</TabsTrigger>
                      <TabsTrigger value="no">No Argument</TabsTrigger>
                    </TabsList>
                    <TabsContent value="yes">
                      <RichTextEditor 
                        value={content} 
                        onChange={setContent} 
                        placeholder="Write arguments supporting the 'Yes' position..."
                      />
                    </TabsContent>
                    <TabsContent value="no">
                      <RichTextEditor 
                        value={content} 
                        onChange={setContent} 
                        placeholder="Write arguments supporting the 'No' position..."
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Article Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CategorySelector form={form} />
                
                <FormField
                  control={form.control}
                  name="readingLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reading Level</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reading level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <MediaSelector form={form} />
            
            <MetadataFields form={form} articleType={articleType} />
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const formData = form.getValues();
              onSubmit(formData, true);
            }}
          >
            <Save className="mr-2 h-4 w-4" /> Save Draft
          </Button>
          <Button type="submit">
            <Send className="mr-2 h-4 w-4" /> Submit for Review
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ArticleForm;
