
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Eye } from 'lucide-react';
import { ArticleRevision } from '@/types/ArticleEditorTypes';
import { Skeleton } from '@/components/ui/skeleton';

interface RevisionsListProps {
  revisions: ArticleRevision[];
  isLoading: boolean;
  articleId: string;
  onRestoreRevision: (content: string) => void;
}

const RevisionsList: React.FC<RevisionsListProps> = ({ 
  revisions, 
  isLoading, 
  articleId, 
  onRestoreRevision 
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-9 w-9 rounded-md" />
                  <Skeleton className="h-9 w-9 rounded-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (revisions.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">No revisions found for this article.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {revisions.map(revision => (
        <Card key={revision.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-medium">
                  {new Date(revision.createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <span>By {revision.editorName}</span>
                  {revision.revisionNote && (
                    <span className="italic">"{revision.revisionNote}"</span>
                  )}
                </div>
              </div>
              <div className="flex space-x-2 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Preview logic could be implemented here
                    // For now, just restore
                    onRestoreRevision(revision.content);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" /> Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => onRestoreRevision(revision.content)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Restore
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RevisionsList;
