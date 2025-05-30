
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ArticleDraft } from '@/types/ArticleEditorTypes';
import { transformArticleData } from '@/hooks/article/transformArticleData';
import { ApiError, ApiErrorType } from '@/utils/errors/types';
import { z } from 'zod';

/**
 * Schema for required article fields
 */
const requiredArticleFieldsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  slug: z.string().min(1, "Slug is required"),
  category_id: z.string().uuid("Category ID must be a valid UUID"),
  status: z.string().min(1, "Status is required"),
  article_type: z.string().min(1, "Article type is required")
});

/**
 * Generate a slug from a title
 * Now with added uniqueness via timestamp
 */
const createSlug = (title: string): string => {
  // Add a timestamp suffix to ensure uniqueness
  const timestamp = new Date().getTime().toString().slice(-6);
  
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .trim() + '-' + timestamp;
};

/**
 * Save an article draft
 */
export const saveDraft = async (
  articleId: string, 
  draftData: any
): Promise<{ success: boolean; error: any; articleId: string }> => {
  try {
    logger.info(LogSource.DATABASE, 'Saving article draft', { 
      articleId,
      contentLength: draftData.content?.length || 0,
      title: draftData.title
    });
    
    // Get current user session - CRITICAL for author_id
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      logger.error(LogSource.DATABASE, 'No authenticated user found when saving draft');
      return { 
        success: false, 
        error: new ApiError('User authentication required', ApiErrorType.AUTH),
        articleId: ''
      };
    }
    
    // Generate slug if not provided
    const slug = draftData.slug || createSlug(draftData.title || 'untitled-draft');
    
    // If articleId is empty, directly create a new article
    if (!articleId || articleId.trim() === '') {
      logger.info(LogSource.DATABASE, 'Creating new article draft', { 
        title: draftData.title || 'Untitled',
        userId,
        hasContent: !!draftData.content,
        contentLength: draftData.content?.length || 0
      });

      // Build article data with all required fields
      const articleDataToInsert = {
        title: draftData.title || 'Untitled Draft',
        content: draftData.content || '',
        excerpt: draftData.excerpt || '',
        cover_image: draftData.imageUrl || '',
        category_id: draftData.categoryId || null,
        status: 'draft',
        article_type: draftData.articleType || 'standard',
        slug: slug,
        author_id: userId // Critical: Set the author_id
      };

      // Validate required fields
      try {
        requiredArticleFieldsSchema.parse({
          ...articleDataToInsert,
          slug: slug,
          category_id: draftData.categoryId || '',
        });
      } catch (validationError) {
        logger.error(LogSource.DATABASE, 'Draft validation error', { 
          validationError,
          draftData: { title: draftData.title, categoryId: draftData.categoryId }
        });
        return { 
          success: false, 
          error: new ApiError('Missing required fields', ApiErrorType.VALIDATION, undefined, validationError),
          articleId: '' 
        };
      }
      
      const { data, error } = await supabase
        .from('articles')
        .insert(articleDataToInsert)
        .select()
        .single();
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error creating new draft', { 
          error, 
          title: draftData.title,
          slug: slug,
          errorCode: error.code,
          errorMessage: error.message
        });
        return { success: false, error, articleId: '' };
      }
      
      logger.info(LogSource.DATABASE, 'New draft created successfully', { 
        articleId: data.id,
        title: data.title,
        slug: data.slug 
      });
      
      // If this is a video article, save video details
      if (draftData.articleType === 'video' && draftData.videoUrl) {
        await saveVideoDetails(data.id, draftData.videoUrl);
      }
      
      // If this is a debate article, save debate details
      if (draftData.articleType === 'debate' && draftData.debateSettings) {
        await saveDebateDetails(data.id, draftData.debateSettings);
      }
      
      return { success: true, error: null, articleId: data.id };
    }
    
    // If we have an articleId, check if it exists first
    const { data: existingArticle, error: fetchError } = await supabase
      .from('articles')
      .select('id, author_id')
      .eq('id', articleId)
      .single();
    
    if (fetchError) {
      // If the article doesn't exist, create a new draft
      if (fetchError.code === 'PGRST116') {
        // Build article data with all required fields
        const articleDataToInsert = {
          title: draftData.title || 'Untitled Draft',
          content: draftData.content || '',
          excerpt: draftData.excerpt || '',
          cover_image: draftData.imageUrl || '',
          category_id: draftData.categoryId || null,
          status: 'draft',
          article_type: draftData.articleType || 'standard',
          slug: slug,
          author_id: userId // Critical: Set the author_id
        };

        // Validate required fields
        try {
          requiredArticleFieldsSchema.parse({
            ...articleDataToInsert,
            slug: slug,
            category_id: draftData.categoryId || '',
          });
        } catch (validationError) {
          logger.error(LogSource.DATABASE, 'Draft validation error', { validationError });
          return { 
            success: false, 
            error: new ApiError('Missing required fields', ApiErrorType.VALIDATION, undefined, validationError),
            articleId: '' 
          };
        }
        
        const { data, error } = await supabase
          .from('articles')
          .insert(articleDataToInsert)
          .select()
          .single();
        
        if (error) {
          logger.error(LogSource.DATABASE, 'Error creating new draft', { 
            error, 
            title: draftData.title,
            slug: slug
          });
          return { success: false, error, articleId: '' };
        }
        
        logger.info(LogSource.DATABASE, 'New draft created successfully', { 
          articleId: data.id,
          title: data.title 
        });
        
        // If this is a video article, save video details
        if (draftData.articleType === 'video' && draftData.videoUrl) {
          await saveVideoDetails(data.id, draftData.videoUrl);
        }
        
        // If this is a debate article, save debate details
        if (draftData.articleType === 'debate' && draftData.debateSettings) {
          await saveDebateDetails(data.id, draftData.debateSettings);
        }
        
        return { success: true, error: null, articleId: data.id };
      }
      
      logger.error(LogSource.DATABASE, 'Error fetching article for draft save', { 
        error: fetchError, 
        articleId 
      });
      return { success: false, error: fetchError, articleId };
    }
    
    // Check if the user is the author of the article
    if (existingArticle.author_id !== userId) {
      logger.warn(LogSource.DATABASE, 'User attempting to update article they did not create', {
        userId,
        articleId,
        authorId: existingArticle.author_id
      });
      // Continue anyway, but log the discrepancy
    }
    
    // Update existing article as draft
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        title: draftData.title,
        content: draftData.content,
        excerpt: draftData.excerpt,
        cover_image: draftData.imageUrl,
        category_id: draftData.categoryId,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);
    
    if (updateError) {
      logger.error(LogSource.DATABASE, 'Error updating draft', { 
        error: updateError, 
        articleId,
        errorCode: updateError.code,
        errorMessage: updateError.message
      });
      return { success: false, error: updateError, articleId };
    }
    
    // Update related tables if needed
    if (draftData.articleType === 'video' && draftData.videoUrl) {
      await saveVideoDetails(articleId, draftData.videoUrl);
    }
    
    if (draftData.articleType === 'debate' && draftData.debateSettings) {
      await saveDebateDetails(articleId, draftData.debateSettings);
    }
    
    logger.info(LogSource.DATABASE, 'Draft saved successfully', { 
      articleId,
      title: draftData.title,
      contentUpdated: !!draftData.content
    });
    return { success: true, error: null, articleId };
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception saving draft', { error: e, articleId });
    return { success: false, error: e, articleId };
  }
};

/**
 * Get a specific draft by ID
 */
export const getDraftById = async (
  articleId: string
): Promise<{ draft: ArticleDraft | null; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching draft by ID', { articleId });
    
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
      created_at: data.created_at,
      updated_at: data.updated_at,
      videoUrl: data.video_articles && data.video_articles[0] ? data.video_articles[0].video_url : undefined,
      debateSettings: data.debate_articles && data.debate_articles[0] ? {
        question: data.debate_articles[0].question,
        yesPosition: data.debate_articles[0].yes_position,
        noPosition: data.debate_articles[0].no_position,
        votingEnabled: data.debate_articles[0].voting_enabled,
        voting_ends_at: data.debate_articles[0].voting_ends_at
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
 * Get user's draft articles
 */
export const getUserDrafts = async (
  page = 1,
  limit = 10
): Promise<{ drafts: any[]; count: number; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching user drafts', { page, limit });
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return { drafts: [], count: 0, error: new Error('User not authenticated') };
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
 * Create a new revision for an article
 */
export const createArticleRevision = async (
  articleId: string, 
  content: string,
  revisionNote?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Creating article revision', { articleId });
    
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    if (!userId) {
      return { success: false, error: new Error('User not authenticated') };
    }
    
    const { error } = await supabase
      .from('article_revisions')
      .insert({
        article_id: articleId,
        editor_id: userId,
        content,
        revision_note: revisionNote
      });
    
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
 * Get revisions for an article
 */
export const getArticleRevisions = async (
  articleId: string
): Promise<{ revisions: any[]; error: any }> => {
  try {
    logger.info(LogSource.DATABASE, 'Fetching article revisions', { articleId });
    
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
 * Helper function to save video details for a video article
 */
const saveVideoDetails = async (articleId: string, videoUrl: string): Promise<void> => {
  try {
    // Check if record exists
    const { data, error: fetchError } = await supabase
      .from('video_articles')
      .select('article_id')
      .eq('article_id', articleId)
      .maybeSingle();
    
    if (fetchError) {
      logger.error(LogSource.DATABASE, 'Error checking video details', { error: fetchError, articleId });
      return;
    }
    
    if (data) {
      // Update existing record
      const { error } = await supabase
        .from('video_articles')
        .update({ video_url: videoUrl })
        .eq('article_id', articleId);
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error updating video details', { error, articleId });
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('video_articles')
        .insert({ article_id: articleId, video_url: videoUrl });
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error inserting video details', { error, articleId });
      }
    }
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception saving video details', { error: e, articleId });
  }
};

/**
 * Helper function to save debate details for a debate article
 */
const saveDebateDetails = async (articleId: string, debateSettings: any): Promise<void> => {
  try {
    // Check if record exists
    const { data, error: fetchError } = await supabase
      .from('debate_articles')
      .select('article_id')
      .eq('article_id', articleId)
      .maybeSingle();
    
    if (fetchError) {
      logger.error(LogSource.DATABASE, 'Error checking debate details', { error: fetchError, articleId });
      return;
    }
    
    if (data) {
      // Update existing record
      const { error } = await supabase
        .from('debate_articles')
        .update({
          question: debateSettings.question,
          yes_position: debateSettings.yesPosition,
          no_position: debateSettings.noPosition,
          voting_enabled: debateSettings.votingEnabled
        })
        .eq('article_id', articleId);
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error updating debate details', { error, articleId });
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('debate_articles')
        .insert({
          article_id: articleId,
          question: debateSettings.question,
          yes_position: debateSettings.yesPosition,
          no_position: debateSettings.noPosition,
          voting_enabled: debateSettings.votingEnabled
        });
      
      if (error) {
        logger.error(LogSource.DATABASE, 'Error inserting debate details', { error, articleId });
      }
    }
  } catch (e) {
    logger.error(LogSource.DATABASE, 'Exception saving debate details', { error: e, articleId });
  }
};

const transformToDebateSettings = (debateData: any) => {
  if (!debateData) return undefined;
  
  return {
    question: debateData.question || '',
    yesPosition: debateData.yesPosition || '',
    noPosition: debateData.noPosition || '',
    votingEnabled: debateData.votingEnabled || false,
    voting_ends_at: debateData.voting_ends_at || debateData.votingEndsAt || null
  };
};

const transformToDraft = (data: any): ArticleDraft => {
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    excerpt: data.excerpt || '',
    imageUrl: data.cover_image || '',
    categoryId: data.category_id || '',
    slug: data.slug || '',
    articleType: data.article_type as any,
    status: data.status as any,
    author_id: data.author_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    videoUrl: data.video_articles && data.video_articles[0] ? data.video_articles[0].video_url : undefined,
    debateSettings: data.debate_articles && data.debate_articles[0] ? transformToDebateSettings({
      question: data.debate_articles[0].question,
      yesPosition: data.debate_articles[0].yes_position,
      noPosition: data.debate_articles[0].no_position,
      votingEnabled: data.debate_articles[0].voting_enabled,
      voting_ends_at: data.debate_articles[0].voting_ends_at
    }) : undefined,
    readingLevel: data.reading_level || 'elementary'
  };
};
