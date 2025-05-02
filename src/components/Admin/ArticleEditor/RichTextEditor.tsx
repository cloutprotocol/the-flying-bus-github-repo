
import React, { useEffect, useState, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Video, 
  Quote, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3 
} from 'lucide-react';
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
    // Sanitize the HTML content to prevent XSS attacks
    const sanitizedContent = DOMPurify.sanitize(content);
    setEditorContent(sanitizedContent);
    onChange(sanitizedContent);
  };

  // Define the Quill modules and formats
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        ['bold', 'italic', 'underline'],
        [{ 'align': [] }],
        [{ 'list': 'bullet' }, { 'list': 'ordered' }],
        [{ 'header': [1, 2, 3, false] }],
        ['link', 'image', 'video', 'blockquote', 'code-block'],
      ],
    },
  }), []);

  const formats = [
    'bold', 'italic', 'underline',
    'align',
    'list', 'bullet',
    'header',
    'link', 'image', 'video', 'blockquote', 'code-block'
  ];

  // Format helper to display what tools are available
  const formatIcons = () => {
    return (
      <div className="flex items-center text-muted-foreground text-xs space-x-1 px-2 py-1">
        <Bold className="h-3 w-3" />
        <Italic className="h-3 w-3" />
        <Underline className="h-3 w-3" />
        <AlignLeft className="h-3 w-3" />
        <AlignCenter className="h-3 w-3" />
        <AlignRight className="h-3 w-3" />
        <List className="h-3 w-3" />
        <ListOrdered className="h-3 w-3" />
        <Link className="h-3 w-3" />
        <Image className="h-3 w-3" />
        <Video className="h-3 w-3" />
        <Quote className="h-3 w-3" />
        <Code className="h-3 w-3" />
        <Heading1 className="h-3 w-3" />
        <Heading2 className="h-3 w-3" />
        <Heading3 className="h-3 w-3" />
      </div>
    );
  };
  
  return (
    <Card className="border rounded-md overflow-hidden p-0">
      <div className="bg-muted/40 border-b px-3 py-2 flex items-center justify-between">
        {formatIcons()}
        
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
            className="prose prose-sm max-w-none p-4 min-h-[300px]"
            dangerouslySetInnerHTML={{ __html: editorContent || '<p>No content to preview</p>' }}
          />
        )}
      </div>
    </Card>
  );
};

export default RichTextEditor;
