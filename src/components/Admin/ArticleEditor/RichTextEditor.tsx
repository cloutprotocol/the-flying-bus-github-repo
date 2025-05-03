
import React, { useEffect, useState, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import DOMPurify from 'dompurify';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Start writing...' 
}) => {
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [editorContent, setEditorContent] = useState(value);
  
  // Synchronize the editor content with the external value
  useEffect(() => {
    if (value !== editorContent) {
      setEditorContent(value);
    }
  }, [value]);

  // Handle content changes and trigger the onChange callback
  const handleContentChange = (content: string) => {
    try {
      // Sanitize the HTML content to prevent XSS attacks
      const sanitizedContent = DOMPurify.sanitize(content);
      setEditorContent(sanitizedContent);
      
      logger.info(LogSource.EDITOR, 'Editor content updated', {
        contentLength: content?.length || 0,
        sanitizedLength: sanitizedContent?.length || 0
      });
      
      // Make sure to pass the sanitized content to the parent component
      onChange(sanitizedContent);
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error updating editor content', error);
    }
  };

  // Define the Quill modules and formats
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'align': [] }],
      [{ 'list': 'bullet' }, { 'list': 'ordered' }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'align',
    'list', 'bullet',
    'link', 'image', 'video', 
    'blockquote', 'code-block'
  ];
  
  return (
    <Card className="border rounded-md overflow-hidden p-0">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as 'write' | 'preview')} className="ml-auto">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="min-h-[300px]">
        {view === 'write' ? (
          <ReactQuill
            theme="snow"
            value={editorContent}
            onChange={handleContentChange}
            placeholder={placeholder}
            modules={modules}
            formats={formats}
            className="h-full min-h-[300px] border-none"
          />
        ) : (
          <div 
            className="article-content p-4 min-h-[300px]"
            dangerouslySetInnerHTML={{ __html: editorContent || '<p>No content to preview</p>' }}
          />
        )}
      </div>
    </Card>
  );
};

export default RichTextEditor;
