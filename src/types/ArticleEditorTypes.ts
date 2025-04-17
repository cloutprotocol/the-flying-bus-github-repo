
export interface ArticleFormData {
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  categoryId: string;
  articleType: 'standard' | 'video' | 'debate' | 'storyboard';
  videoUrl?: string;
  readingLevel?: string;
  debateSettings?: {
    question: string;
    yesPosition: string;
    noPosition: string;
    votingEnabled: boolean;
    votingEndsAt?: string;
  };
}

export interface ArticleDraft extends ArticleFormData {
  id: string;
  status: 'draft' | 'pending' | 'published' | 'archived' | 'rejected';
  createdAt: string;
  updatedAt: string;
  readingLevel?: string;
}

export interface ArticleRevision {
  id: string;
  articleId: string;
  editorId: string;
  editorName: string;
  content: string;
  revisionNote?: string;
  createdAt: string;
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
