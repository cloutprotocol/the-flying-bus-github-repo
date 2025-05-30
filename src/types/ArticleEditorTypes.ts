
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
}
