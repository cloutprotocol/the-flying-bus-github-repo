
import React, { useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { $generateHtmlFromNodes } from '@lexical/html';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import ToolbarPlugin from './RichTextEditor/ToolbarPlugin';
import "./RichTextEditor/editor.css";

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
  const [htmlContent, setHtmlContent] = useState('');

  // Lexical Editor Configuration
  const initialConfig = {
    namespace: 'article-editor',
    theme: {
      root: 'editor-container',
      paragraph: 'editor-paragraph',
      heading: {
        h1: 'editor-heading-h1',
        h2: 'editor-heading-h2',
        h3: 'editor-heading-h3',
      },
      list: {
        ul: 'editor-list-ul',
        ol: 'editor-list-ol',
        listitem: 'editor-listitem',
      },
      quote: 'editor-quote',
      link: 'editor-link',
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        underline: 'editor-text-underline',
        code: 'editor-text-code',
      },
    },
    // Register custom nodes with type assertion to fix compatibility issues
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      CodeNode,
      CodeHighlightNode,
      TableNode,
      TableCellNode,
      TableRowNode,
      AutoLinkNode,
      LinkNode
    ] as any, // Type assertion to fix TypeScript error
    onError: (error: Error) => {
      console.error("Lexical Editor error:", error);
    },
    editable: true,
  };

  // Handle editor content changes
  const handleEditorChange = (editorState: any) => {
    // Save editor state as JSON string
    editorState.read(() => {
      const htmlString = $generateHtmlFromNodes(editorState);
      setHtmlContent(htmlString);
      onChange(htmlString);
    });
  };

  // Parse initial HTML if provided
  useEffect(() => {
    if (view === 'preview') {
      setHtmlContent(value);
    }
  }, [view, value]);

  return (
    <Card className="border rounded-md overflow-hidden p-0">
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container">
          <ToolbarPlugin />
          
          <Tabs value={view} onValueChange={(v) => setView(v as 'write' | 'preview')} className="p-1">
            <TabsList className="ml-auto mr-2">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="editor-inner">
            {view === 'write' ? (
              <>
                <RichTextPlugin
                  contentEditable={<ContentEditable className="editor-input" />}
                  placeholder={<div className="editor-placeholder">{placeholder}</div>}
                  ErrorBoundary={LexicalErrorBoundary}
                />
                <HistoryPlugin />
                <AutoFocusPlugin />
                <ListPlugin />
                <LinkPlugin />
                <OnChangePlugin onChange={handleEditorChange} />
              </>
            ) : (
              <div 
                className="article-content prose prose-sm max-w-none p-4"
                dangerouslySetInnerHTML={{ __html: htmlContent || '<p>No content to preview</p>' }}
              />
            )}
          </div>
        </div>
      </LexicalComposer>
    </Card>
  );
};

export default RichTextEditor;
