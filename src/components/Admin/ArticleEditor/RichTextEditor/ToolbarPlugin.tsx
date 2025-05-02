
import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  $getSelection, 
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  COMMAND_PRIORITY_NORMAL,
  UNDO_COMMAND,
  REDO_COMMAND,
  LexicalNode,
  ElementNode
} from 'lexical';
import { $wrapNodes } from '@lexical/selection';
import { $findMatchingParent } from '@lexical/utils';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
  ListNode
} from '@lexical/list';
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingTagType
} from '@lexical/rich-text';
import {
  $createCodeNode,
  $isCodeNode
} from '@lexical/code';
import {
  $createQuoteNode,
  $isQuoteNode
} from '@lexical/rich-text';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3, 
  Undo, 
  Redo 
} from 'lucide-react';

const ToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  
  const formatHeading = (headingSize: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createHeadingNode(headingSize));
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createParagraphNode());
      }
    });
  };

  const formatBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const formatNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $wrapNodes(selection, () => $createQuoteNode());
      }
    });
  };

  const formatCode = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (selection.isCollapsed()) {
          $wrapNodes(selection, () => $createCodeNode());
        } else {
          const anchorNode = selection.anchor.getNode();
          const focusNode = selection.focus.getNode();
          
          // Instead of trying to check for specific node types with $isCodeNode,
          // we'll check for a parent with a more generic approach
          const parentCodeNode = $findMatchingParent(
            anchorNode, 
            (node) => node.getType() === 'code'
          ) as ElementNode | null;
          
          if (parentCodeNode) {
            // Already in a code block, unwrap
            const paragraph = $createParagraphNode();
            parentCodeNode.insertAfter(paragraph);
            paragraph.select();
            parentCodeNode.remove();
          } else {
            // Wrap in a code block
            $wrapNodes(selection, () => $createCodeNode());
          }
        }
      }
    });
  };

  return (
    <div className="bg-muted/40 border-b px-3 py-1.5">
      <div className="flex flex-wrap gap-1 items-center">
        <Toggle 
          size="sm" 
          pressed={false} 
          onPressedChange={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
          }}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          onPressedChange={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
          }}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle 
          size="sm" 
          onPressedChange={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
          }}
        >
          <Underline className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Toggle size="sm" onPressedChange={() => formatParagraph()}>
          <AlignLeft className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Toggle size="sm" onPressedChange={() => formatBulletList()}>
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => formatNumberedList()}>
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Toggle size="sm" onPressedChange={() => formatHeading('h1')}>
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => formatHeading('h2')}>
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => formatHeading('h3')}>
          <Heading3 className="h-4 w-4" />
        </Toggle>
        
        <Separator orientation="vertical" className="mx-1 h-6" />
        
        <Toggle size="sm" onPressedChange={() => formatQuote()}>
          <Quote className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => formatCode()}>
          <Code className="h-4 w-4" />
        </Toggle>
        
        <div className="ml-auto flex items-center gap-1">
          <Toggle 
            size="sm" 
            onPressedChange={() => {
              editor.dispatchCommand(UNDO_COMMAND, undefined);
            }}
          >
            <Undo className="h-4 w-4" />
          </Toggle>
          <Toggle 
            size="sm" 
            onPressedChange={() => {
              editor.dispatchCommand(REDO_COMMAND, undefined);
            }}
          >
            <Redo className="h-4 w-4" />
          </Toggle>
        </div>
      </div>
    </div>
  );
};

export default ToolbarPlugin;
