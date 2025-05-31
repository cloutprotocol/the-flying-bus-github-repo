
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  disabled?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Start writing...',
  disabled = false
}) => {
  const [view, setView] = useState<'write' | 'preview'>('write');
  const [editorContent, setEditorContent] = useState(value || '');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Synchronize the editor content with the external value
  useEffect(() => {
    if (value !== editorContent && isInitialized) {
      logger.info(LogSource.EDITOR, 'Updating editor content from prop', {
        valueLength: value?.length || 0,
        editorContentLength: editorContent?.length || 0
      });
      setEditorContent(value || '');
    }
  }, [value, editorContent, isInitialized]);

  // Debounced content change handler to prevent rapid updates
  const debouncedOnChange = useCallback((content: string) => {
    const timeoutId = setTimeout(() => {
      try {
        // Sanitize the HTML content to prevent XSS attacks
        const sanitizedContent = DOMPurify.sanitize(content);
        
        logger.info(LogSource.EDITOR, 'Editor content updated', {
          contentLength: content?.length || 0,
          sanitizedLength: sanitizedContent?.length || 0
        });
        
        // Make sure to pass the sanitized content to the parent component
        onChange(sanitizedContent);
      } catch (error) {
        logger.error(LogSource.EDITOR, 'Error in debounced content change', error);
        // Fallback: still call onChange with original content
        onChange(content || '');
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [onChange]);

  // Handle content changes with error boundary
  const handleContentChange = useCallback((content: string) => {
    try {
      setEditorContent(content);
      debouncedOnChange(content);
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error updating editor content', error);
      // Ensure we don't break the form by still updating local state
      setEditorContent(content);
      // Try to call onChange with fallback
      try {
        onChange(content || '');
      } catch (onChangeError) {
        logger.error(LogSource.EDITOR, 'Error calling onChange', onChangeError);
      }
    }
  }, [debouncedOnChange, onChange]);

  // Define the Quill modules and formats with error handling
  const modules = useMemo(() => {
    try {
      return {
        toolbar: disabled ? false : [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ 'align': [] }],
          [{ 'list': 'bullet' }, { 'list': 'ordered' }],
          ['link', 'image', 'video'],
          ['blockquote', 'code-block'],
          ['clean']
        ],
      };
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error creating Quill modules', error);
      return { toolbar: false };
    }
  }, [disabled]);

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'align',
    'list', 'bullet',
    'link', 'image', 'video', 
    'blockquote', 'code-block'
  ];

  // Handle editor initialization
  const handleEditorReady = useCallback(() => {
    setIsInitialized(true);
    logger.info(LogSource.EDITOR, 'Editor initialized successfully');
  }, []);

  // Error boundary for ReactQuill
  const renderEditor = () => {
    try {
      return (
        <ReactQuill
          theme="snow"
          value={editorContent}
          onChange={handleContentChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          readOnly={disabled}
          className="h-full min-h-[300px] border-none"
          onFocus={() => {
            try {
              // Handle focus without throwing errors
              logger.debug(LogSource.EDITOR, 'Editor focused');
            } catch (error) {
              logger.warn(LogSource.EDITOR, 'Focus handler error', error);
            }
          }}
          onBlur={() => {
            try {
              // Handle blur without throwing errors
              logger.debug(LogSource.EDITOR, 'Editor blurred');
            } catch (error) {
              logger.warn(LogSource.EDITOR, 'Blur handler error', error);
            }
          }}
          ref={(ref) => {
            if (ref && !isInitialized) {
              handleEditorReady();
            }
          }}
        />
      );
    } catch (error) {
      logger.error(LogSource.EDITOR, 'Error rendering ReactQuill', error);
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded">
          <p className="text-red-600">Editor failed to load. Please refresh the page.</p>
          <textarea
            value={editorContent}
            onChange={(e) => {
              setEditorContent(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="w-full min-h-[200px] mt-2 p-2 border rounded"
          />
        </div>
      );
    }
  };
  
  return (
    <Card className="border rounded-md overflow-hidden p-0">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as 'write' | 'preview')} className="ml-auto">
          <TabsList>
            <TabsTrigger value="write" disabled={disabled}>Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="min-h-[300px]">
        {view === 'write' ? (
          renderEditor()
        ) : (
          <div 
            className="article-content p-4 min-h-[300px]"
            dangerouslySetInnerHTML={{ 
              __html: editorContent || '<p>No content to preview</p>' 
            }}
          />
        )}
      </div>
    </Card>
  );
};

export default RichTextEditor;
