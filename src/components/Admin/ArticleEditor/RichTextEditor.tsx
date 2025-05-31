
import React, { useState, useMemo, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import DOMPurify from 'dompurify';

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
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Debounced onChange handler to prevent excessive calls
  const debouncedOnChange = useCallback((content: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      try {
        const sanitizedContent = DOMPurify.sanitize(content);
        onChange(sanitizedContent);
      } catch (error) {
        console.error('Error sanitizing content:', error);
        onChange(content);
      }
    }, 300);
  }, [onChange]);

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Simple Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: disabled ? false : [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'align': [] }],
      [{ 'list': 'bullet' }, { 'list': 'ordered' }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
  }), [disabled]);

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'align',
    'list', 'bullet',
    'link', 'image', 'video', 
    'blockquote', 'code-block'
  ];

  // Simple content change handler
  const handleContentChange = useCallback((content: string) => {
    debouncedOnChange(content);
  }, [debouncedOnChange]);
  
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
          <ReactQuill
            theme="snow"
            value={value}
            onChange={handleContentChange}
            placeholder={placeholder}
            modules={modules}
            formats={formats}
            readOnly={disabled}
            className="h-full min-h-[300px] border-none"
          />
        ) : (
          <div 
            className="article-content p-4 min-h-[300px]"
            dangerouslySetInnerHTML={{ 
              __html: value || '<p>No content to preview</p>' 
            }}
          />
        )}
      </div>
    </Card>
  );
};

export default RichTextEditor;
