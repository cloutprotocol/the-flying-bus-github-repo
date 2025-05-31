
export interface ArticleFormValidation {
  title: string;
  content: string;
  categoryId: string;
  slug: string;
}

export interface DebateSettings {
  question: string;
  yesPosition: string;
  noPosition: string;
  votingEnabled: boolean;
  voting_ends_at: string | null;
  [key: string]: any; // Add index signature for JSON compatibility
}

export interface StoryboardEpisode {
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: string;
  number: number;
  content: string;
}

export interface ArticleFormData {
  id?: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  categoryId: string;
  slug: string;
  articleType: 'standard' | 'video' | 'debate' | 'storyboard';
  videoUrl?: string;
  status?: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  publishDate?: string | null;
  shouldHighlight?: boolean;
  allowVoting?: boolean;
  debateSettings?: DebateSettings;
  storyboardEpisodes?: StoryboardEpisode[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  created_at: string;
}

export type DraftSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface ArticleRevision {
  id: string;
  article_id: string;
  editor_id: string;
  created_at: string;
  content: string;
  revision_note?: string;
  editorName?: string; // Add this for compatibility
}

export interface ArticleDraft {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  categoryId: string;
  slug: string;
  articleType: 'standard' | 'video' | 'debate' | 'storyboard';
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  author_id: string;
  created_at: string;
  updated_at: string;
  videoUrl?: string;
  debateSettings?: DebateSettings;
  readingLevel?: string;
}
