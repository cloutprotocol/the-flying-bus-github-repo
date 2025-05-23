
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { saveDraftOptimized } from '@/services/articles/draft/optimizedDraftService';
import { submitForReview } from '@/services/articles/submission/articleSubmitService';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import AdminPortalLayout from '@/components/Layout/AdminPortalLayout';

const AdminTestPage = () => {
  const [title, setTitle] = useState('Test Article');
  const [content, setContent] = useState('This is a test article content for performance testing.');
  const [categoryId, setCategoryId] = useState(''); // You'll need to select a valid category ID
  const [draftId, setDraftId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [performance, setPerformance] = useState<{
    saveDraftTime?: number;
    submitTime?: number;
  }>({});
  const { toast } = useToast();

  // Handle saving draft
  const handleSaveDraft = async () => {
    setIsSaving(true);
    const startTime = performance.now();
    
    try {
      const articleData = {
        id: draftId,
        title,
        content,
        categoryId,
        articleType: 'standard'
      };
      
      logger.info(LogSource.DATABASE, 'Testing optimized draft save', { 
        hasId: !!draftId,
        title
      });
      
      const result = await saveDraftOptimized(articleData);
      
      const endTime = performance.now();
      setPerformance(prev => ({ 
        ...prev, 
        saveDraftTime: Math.round(endTime - startTime) 
      }));
      
      if (result.success) {
        setDraftId(result.articleId);
        toast({
          title: "Draft saved successfully",
          description: `Time: ${Math.round(endTime - startTime)}ms | DB duration: ${result.error?.duration_ms || 'unknown'}ms`,
        });
      } else {
        toast({
          title: "Error saving draft",
          description: result.error?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle submitting article
  const handleSubmitArticle = async () => {
    if (!draftId) {
      toast({
        title: "Save draft first",
        description: "You need to save a draft before submitting",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    const startTime = performance.now();
    
    try {
      const articleData = {
        id: draftId,
        title,
        content,
        categoryId,
        articleType: 'standard'
      };
      
      logger.info(LogSource.DATABASE, 'Testing optimized article submission', { 
        draftId,
        title
      });
      
      const result = await submitForReview(articleData);
      
      const endTime = performance.now();
      setPerformance(prev => ({ 
        ...prev, 
        submitTime: Math.round(endTime - startTime) 
      }));
      
      if (result.success) {
        toast({
          title: "Article submitted successfully",
          description: `Time: ${Math.round(endTime - startTime)}ms`,
        });
      } else {
        toast({
          title: "Error submitting article",
          description: result.error?.message || "Unknown error",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .limit(1);
        
        if (error) {
          console.error("Error fetching categories:", error);
          return;
        }
        
        if (data && data.length > 0) {
          setCategoryId(data[0].id);
        }
      } catch (error) {
        console.error("Error:", error);
      }
    };
    
    fetchCategories();
  }, []);

  return (
    <AdminPortalLayout>
      <div className="container max-w-4xl py-6">
        <h1 className="text-3xl font-bold mb-6">Performance Test Page</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Optimized Draft & Submit Testing</CardTitle>
              <CardDescription>
                Test the performance of the optimized draft saving and article submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Article title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Article content"
                    rows={5}
                  />
                </div>
                
                <div className="pt-4">
                  <h3 className="text-lg font-medium">Performance Metrics:</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-muted p-3 rounded-md">
                      <div className="text-sm font-medium text-muted-foreground">Draft Save Time</div>
                      <div className="text-2xl font-bold mt-1">
                        {performance.saveDraftTime ? `${performance.saveDraftTime}ms` : '-'}
                      </div>
                    </div>
                    <div className="bg-muted p-3 rounded-md">
                      <div className="text-sm font-medium text-muted-foreground">Submit Time</div>
                      <div className="text-2xl font-bold mt-1">
                        {performance.submitTime ? `${performance.submitTime}ms` : '-'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {draftId && (
                  <div className="text-sm text-muted-foreground">
                    Draft ID: <span className="font-mono">{draftId}</span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || isSubmitting}
              >
                {isSaving ? "Saving..." : "Save Draft"}
              </Button>
              <Button 
                onClick={handleSubmitArticle}
                disabled={!draftId || isSaving || isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit for Review"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AdminPortalLayout>
  );
};

export default AdminTestPage;
