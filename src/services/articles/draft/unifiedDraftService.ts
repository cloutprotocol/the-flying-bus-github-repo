
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { generateClientSideSlug } from '@/utils/article/slugGenerator';
import { ArticleDraft } from '@/types/ArticleEditorTypes';
import { saveDraftOptimized } from './optimizedDraftService';
import { measureApiCall } from '@/services/monitoringService';
import { submitForReview } from '../submission/articleSubmitService';

/**
 * Unified service for article management using optimized database operations
 * This replaces the older draft service implementation with optimized SQL functions
 */

/**
 * Save an article draft with optimized database operations 
 * (Re-export from optimized service for compatibility)
 */
export const saveDraft = saveDraftOptimized;

/**
 * Get a specific draft by ID with optimized performance
 */
export const getDraftById = async (
  articleId: string
): Promise<{ draft: ArticleDraft | null; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching draft by ID (optimized)', { articleId });
    const endMeasure = measureApiCall('get-draft-optimized');
    
    const { data, error } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        content,
        excerpt, 
        cover_image, 
        categories(id, name, slug, color),
        category_id,
        status,
        updated_at,
        created_at,
        article_type,
        video_articles(video_url),
        debate_articles(question, yes_position, no_position, voting_enabled, voting_ends_at)
      `)
      .eq('id', articleId)
      .single();
    
    endMeasure();
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error fetching draft', { error, articleId });
      return { draft: null, error };
    }
    
    if (!data) {
      logger.warn(LogSource.DATABASE, 'Draft not found', { articleId });
      return { draft: null, error: new Error('Draft not found') };
    }
    
    // Transform the data into the expected format
    const draft: ArticleDraft = {
      id: data.id,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || '',
      imageUrl: data.cover_image || '',
      categoryId: data.category_id || '',
      articleType: data.article_type as any,
      status: data.status as any,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      videoUrl: data.video_articles && data.video_articles[0] ? data.video_articles[0].video_url : undefined,
      debateSettings: data.debate_articles && data.debate_articles[0] ? {
        question: data.debate_articles[0].question,
        yesPosition: data.debate_articles[0].yes_position,
        noPosition: data.debate_articles[0].no_position,
        votingEnabled: data.debate_articles[0].voting_enabled,
        votingEndsAt: data.debate_articles[0].voting_ends_at
      } : undefined
    };
    
    logger.info(LogSource.DATABASE, 'Draft fetched successfully', { articleId });
    return { draft, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception fetching draft', { error: e, articleId });
    return { draft: null, error: e };
  }
};

/**
 * Get user's draft articles with optimized performance
 */
export const getUserDrafts = async (
  page = 1,
  limit = 10
): Promise<{ drafts: any[]; count: number; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching user drafts (optimized)', { page, limit });
    const endMeasure = measureApiCall('get-user-drafts-optimized');
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return { drafts: [], count: 0, error: new ApiError('User authentication required', ApiErrorType.AUTH) };
    }
    
    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await supabase
      .from('articles')
      .select(`
        id, 
        title, 
        excerpt, 
        cover_image, 
        categories(id, name, slug, color),
        updated_at,
        created_at,
        article_type
      `, { count: 'exact' })
      .eq('author_id', userId)
      .eq('status', 'draft')
      .order('updated_at', { ascending: false })
      .range(from, to);
    
    endMeasure();
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error fetching user drafts', { error, userId });
      return { drafts: [], count: 0, error };
    }
    
    logger.info(LogSource.DATABASE, 'User drafts fetched successfully', { 
      count, 
      userId, 
      page 
    });
    
    return { drafts: data || [], count: count || 0, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception fetching user drafts', e);
    return { drafts: [], count: 0, error: e };
  }
};

/**
 * Create a new revision for an article with optimized operations
 */
export const createArticleRevision = async (
  articleId: string, 
  content: string,
  revisionNote?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Creating article revision (optimized)', { articleId });
    const endMeasure = measureApiCall('create-revision-optimized');
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return { success: false, error: new ApiError('User authentication required', ApiErrorType.AUTH) };
    }
    
    const { error } = await supabase
      .from('article_revisions')
      .insert({
        article_id: articleId,
        editor_id: userId,
        content,
        revision_note: revisionNote
      });
    
    endMeasure();
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error creating article revision', { error, articleId });
      return { success: false, error };
    }
    
    logger.info(LogSource.DATABASE, 'Article revision created successfully', { articleId });
    return { success: true, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception creating article revision', { error: e, articleId });
    return { success: false, error: e };
  }
};

/**
 * Get revisions for an article with optimized performance
 */
export const getArticleRevisions = async (
  articleId: string
): Promise<{ revisions: any[]; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching article revisions (optimized)', { articleId });
    const endMeasure = measureApiCall('get-revisions-optimized');
    
    const { data, error } = await supabase
      .from('article_revisions')
      .select(`
        id,
        article_id,
        editor_id,
        content,
        revision_note,
        created_at,
        profiles(display_name)
      `)
      .eq('article_id', articleId)
      .order('created_at', { ascending: false });
    
    endMeasure();
    
    if (error) {
      logger.error(LogSource.DATABASE, 'Error fetching article revisions', { error, articleId });
      return { revisions: [], error };
    }
    
    const revisions = data.map(rev => ({
      id: rev.id,
      articleId: rev.article_id,
      editorId: rev.editor_id,
      editorName: rev.profiles?.display_name || 'Unknown Editor',
      content: rev.content,
      revisionNote: rev.revision_note || '',
      createdAt: rev.created_at
    }));
    
    logger.info(LogSource.DATABASE, 'Article revisions fetched successfully', { 
      articleId,
      revisionCount: revisions.length
    });
    
    return { revisions, error: null };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception fetching article revisions', { error: e, articleId });
    return { revisions: [], error: e };
  }
};

/**
 * Submits an article for review using the optimized database function
 */
export const submitArticleForReview = submitForReview;
