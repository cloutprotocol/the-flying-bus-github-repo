
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import RevisionsList from '../RevisionsList';
import { ArticleRevision } from '@/types/ArticleEditorTypes';

interface RevisionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: ArticleRevision[];
  isLoading: boolean;
  articleId: string;
  onRestoreRevision: (content: string) => void;
}

const RevisionsDialog: React.FC<RevisionsDialogProps> = ({
  open,
  onOpenChange,
  revisions,
  isLoading,
  articleId,
  onRestoreRevision
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Article Revisions</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this article
          </DialogDescription>
        </DialogHeader>
        
        <RevisionsList 
          revisions={revisions} 
          isLoading={isLoading} 
          articleId={articleId} 
          onRestoreRevision={(content) => {
            onRestoreRevision(content);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default RevisionsDialog;
