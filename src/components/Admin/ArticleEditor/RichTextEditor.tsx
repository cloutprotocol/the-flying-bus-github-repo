
import React, { useState } from 'react';
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
  Heading3, 
  Undo, 
  Redo 
} from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// This is a simplified rich text editor UI without actual rich text functionality.
// In a real implementation, you would integrate with a proper rich text library
// like TipTap, Slate, or QuillJS.
const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = 'Start writing...' 
}) => {
  const [view, setView] = useState<'write' | 'preview'>('write');
  
  // In a real implementation, these would actually format the text
  const handleFormatClick = (format: string) => {
    console.log(`Applied format: ${format}`);
  };
  
  return (
    <Card className="border rounded-md overflow-hidden p-0">
      <div className="bg-muted/40 border-b px-3 py-1.5">
        <div className="flex flex-wrap gap-1 items-center">
          <Toggle size="sm" onClick={() => handleFormatClick('bold')}>
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('italic')}>
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('underline')}>
            <Underline className="h-4 w-4" />
          </Toggle>
          
          <Separator orientation="vertical" className="mx-1 h-6" />
          
          <Toggle size="sm" onClick={() => handleFormatClick('alignLeft')}>
            <AlignLeft className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('alignCenter')}>
            <AlignCenter className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('alignRight')}>
            <AlignRight className="h-4 w-4" />
          </Toggle>
          
          <Separator orientation="vertical" className="mx-1 h-6" />
          
          <Toggle size="sm" onClick={() => handleFormatClick('bulletList')}>
            <List className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('numberedList')}>
            <ListOrdered className="h-4 w-4" />
          </Toggle>
          
          <Separator orientation="vertical" className="mx-1 h-6" />
          
          <Toggle size="sm" onClick={() => handleFormatClick('h1')}>
            <Heading1 className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('h2')}>
            <Heading2 className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('h3')}>
            <Heading3 className="h-4 w-4" />
          </Toggle>
          
          <Separator orientation="vertical" className="mx-1 h-6" />
          
          <Toggle size="sm" onClick={() => handleFormatClick('link')}>
            <Link className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('image')}>
            <Image className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('video')}>
            <Video className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('quote')}>
            <Quote className="h-4 w-4" />
          </Toggle>
          <Toggle size="sm" onClick={() => handleFormatClick('code')}>
            <Code className="h-4 w-4" />
          </Toggle>
          
          <div className="ml-auto flex items-center gap-1">
            <Toggle size="sm" onClick={() => handleFormatClick('undo')}>
              <Undo className="h-4 w-4" />
            </Toggle>
            <Toggle size="sm" onClick={() => handleFormatClick('redo')}>
              <Redo className="h-4 w-4" />
            </Toggle>
          </div>
        </div>
      </div>
      
      <Tabs value={view} onValueChange={(v) => setView(v as 'write' | 'preview')} className="p-1">
        <TabsList className="ml-auto mr-2">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="min-h-[300px] p-4">
        {view === 'write' ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[300px] focus:outline-none resize-none bg-transparent"
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            {value || <p className="text-muted-foreground">No content to preview</p>}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RichTextEditor;
