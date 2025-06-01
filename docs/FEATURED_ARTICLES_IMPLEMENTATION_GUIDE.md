# Featured Articles Implementation Guide

## Overview

This document provides a complete guide for implementing featured articles functionality in The Flying Bus platform. It covers the problem we solved, the solution architecture, and key implementation patterns for future reference.

## Problem Statement

**Issue**: Articles marked as "Should Highlight" (featured) in the frontend forms were not being properly saved to the database's `featured` field.

**Symptoms**:
- Frontend form correctly captured the "Should Highlight" toggle state
- Articles were being saved successfully but the `featured` field remained `false`
- No errors were thrown, making the issue difficult to detect
- Featured articles constraint (only one featured article at a time) was not being enforced

## Root Cause Analysis

The issue was traced to a **field mapping disconnect** between frontend and database layers:

1. **Frontend Field Name**: `shouldHighlight` (boolean)
2. **Database Field Name**: `featured` (boolean)
3. **Missing Database Logic**: Database functions lacked featured field handling and constraint enforcement

## Complete Solution Architecture

### 1. Frontend Data Mapping Layer

**File**: `src/utils/article/articleDataMapper.ts`

```typescript
import { ArticleFormData } from '@/types/ArticleEditorTypes';

/**
 * Maps form data to database field names for consistency
 */
export const mapFormDataToDatabase = (formData: ArticleFormData, userId: string) => {
  console.log('mapFormDataToDatabase: Input data:', {
    shouldHighlight: formData.shouldHighlight,
    title: formData.title?.substring(0, 30),
    articleType: formData.articleType
  });
  
  const mappedData = {
    id: formData.id,
    title: formData.title,
    content: formData.content || '',
    excerpt: formData.excerpt,
    // Map both field names for compatibility
    cover_image: formData.imageUrl,
    imageUrl: formData.imageUrl,
    // Map both field names for compatibility
    category_id: formData.categoryId,
    categoryId: formData.categoryId,
    author_id: userId,
    status: formData.status || 'draft',
    // Map both field names for compatibility
    article_type: formData.articleType,
    articleType: formData.articleType,
    slug: formData.slug,
    publishDate: formData.publishDate,
    // CRITICAL: Map shouldHighlight to featured field with explicit boolean conversion
    featured: Boolean(formData.shouldHighlight),
    shouldHighlight: Boolean(formData.shouldHighlight),
    allowVoting: formData.allowVoting,
    debateSettings: formData.debateSettings,
    storyboardEpisodes: formData.storyboardEpisodes,
    videoUrl: (formData as any).videoUrl
  };
  
  console.log('mapFormDataToDatabase: Mapped data:', {
    featured: mappedData.featured,
    shouldHighlight: mappedData.shouldHighlight,
    title: mappedData.title?.substring(0, 30)
  });
  
  return mappedData;
};
```

**Key Pattern**: Always use explicit `Boolean()` conversion for form checkbox values to ensure proper database storage.

### 2. Database Function Updates

**Files**: `src/utils/dbFunctions.sql`

#### Featured Field Extraction Pattern
```sql
-- Extract featured value from JSON with fallback
v_featured := COALESCE(
  (p_article_data->>'featured')::BOOLEAN, 
  (p_article_data->>'shouldHighlight')::BOOLEAN, 
  false
);
```

#### Single Featured Article Constraint
```sql
-- Handle featured article constraint - unfeature existing articles if this one is featured
IF v_featured THEN
  UPDATE articles SET featured = false WHERE featured = true;
END IF;
```

#### Database Schema Integration
```sql
-- Insert new article with featured field
INSERT INTO articles (
  title, content, excerpt, cover_image, category_id,
  author_id, status, article_type, slug,
  featured  -- CRITICAL: Include featured field
) VALUES (
  COALESCE(p_article_data->>'title', 'Untitled Draft'),
  COALESCE(p_article_data->>'content', ''),
  p_article_data->>'excerpt',
  COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl'),
  COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID),
  v_author_id,
  'draft',
  v_article_type,
  COALESCE(p_article_data->>'slug', 'draft-' || floor(extract(epoch from now()))::text),
  v_featured  -- Use extracted featured value
);

-- Update existing article with featured field
UPDATE articles
SET
  title = COALESCE(p_article_data->>'title', title),
  content = COALESCE(p_article_data->>'content', content),
  excerpt = COALESCE(p_article_data->>'excerpt', excerpt),
  cover_image = COALESCE(p_article_data->>'cover_image', p_article_data->>'imageUrl', cover_image),
  category_id = COALESCE((p_article_data->>'category_id')::UUID, (p_article_data->>'categoryId')::UUID, category_id),
  article_type = COALESCE(p_article_data->>'article_type', p_article_data->>'articleType', article_type),
  featured = v_featured,  -- CRITICAL: Update featured field
  updated_at = now()
WHERE id = v_article_id;
```

### 3. Service Layer Integration

**File**: `src/services/articles/unifiedSubmissionService.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';
import { ArticleFormData } from '@/types/ArticleEditorTypes';
import { mapFormDataToDatabase, validateMappedData } from '@/utils/article/articleDataMapper';
import { ARTICLE_STATUS } from '@/constants/articleConstants';

export interface SubmissionResult {
  success: boolean;
  error?: string;
  articleId?: string;
}

/**
 * Unified Article Submission Service
 * Uses proven database functions to avoid ambiguous column errors
 */
export class UnifiedSubmissionService {
  /**
   * Submit article for review using the proven submit_article_with_validation function
   */
  static async submitForReview(formData: ArticleFormData, userId: string): Promise<SubmissionResult> {
    try {
      console.log('UnifiedSubmissionService.submitForReview called with shouldHighlight:', formData.shouldHighlight);

      logger.info(LogSource.ARTICLE, 'Starting unified article submission', {
        articleType: formData.articleType,
        hasId: !!formData.id,
        title: formData.title?.substring(0, 30),
        shouldHighlight: formData.shouldHighlight
      });

      // Validate required fields before processing
      if (!formData.title?.trim()) {
        return { success: false, error: 'Title is required' };
      }
      
      if (!formData.categoryId) {
        return { success: false, error: 'Category is required' };
      }

      // Handle featured article constraint with detailed logging
      if (formData.shouldHighlight) {
        console.log('Article marked as featured, unfeaturing existing featured articles...');
        
        // First, unfeatured any existing featured articles
        const { error: unfeaturedError } = await supabase
          .from('articles')
          .update({ featured: false })
          .eq('featured', true);
        
        if (unfeaturedError) {
          console.error('Error unfeaturing existing articles:', unfeaturedError);
          return { success: false, error: 'Failed to update existing featured article' };
        }
        
        console.log('Successfully unfeatured existing articles');
      }

      // Map and validate form data with updated field mapping
      const mappedData = mapFormDataToDatabase(formData, userId);
      
      // CRITICAL: Ensure featured field is explicitly set
      mappedData.featured = Boolean(formData.shouldHighlight);
      
      console.log('Final mapped data before submission:', {
        featured: mappedData.featured,
        shouldHighlight: mappedData.shouldHighlight,
        title: mappedData.title?.substring(0, 30)
      });
      
      const validation = validateMappedData(mappedData);

      if (!validation.isValid) {
        console.error('Validation failed:', validation.errors);
        logger.error(LogSource.ARTICLE, 'Validation failed', { errors: validation.errors });
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Use the proven submit_article_with_validation function
      const { data, error } = await supabase.rpc('submit_article_with_validation', {
        p_user_id: userId,
        p_article_data: mappedData,
        p_save_draft: true
      });

      console.log('Database response:', { data, error });

      if (error) {
        console.error('Database submission failed:', error);
        logger.error(LogSource.ARTICLE, 'Database submission failed', { 
          error: error.message,
          code: error.code 
        });
        
        // Handle specific database constraint violations
        if (error.code === '23514') {
          return {
            success: false,
            error: 'Invalid article status or type. Please check your submission.'
          };
        }
        
        if (error.code === '23503') {
          return {
            success: false,
            error: 'Invalid category selected. Please choose a valid category.'
          };
        }
        
        return {
          success: false,
          error: error.message || 'Failed to submit article'
        };
      }

      // Handle the response from submit_article_with_validation function
      const result = Array.isArray(data) ? data[0] : data;
      
      console.log('Processed result:', result);
      
      if (!result?.success) {
        console.error('Submission validation failed:', result?.error_message);
        logger.error(LogSource.ARTICLE, 'Submission validation failed', { 
          errorMessage: result?.error_message 
        });
        return {
          success: false,
          error: result?.error_message || 'Submission failed'
        };
      }

      console.log('Article submitted successfully:', result.article_id);
      logger.info(LogSource.ARTICLE, 'Article submitted successfully', { 
        articleId: result.article_id 
      });

      return {
        success: true,
        articleId: result.article_id
      };

    } catch (error) {
      console.error('Unexpected submission error:', error);
      logger.error(LogSource.ARTICLE, 'Unexpected submission error', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
```

## Implementation Patterns

### 1. Boolean Field Mapping Pattern

**Problem**: Form checkboxes can have undefined, null, or boolean values
**Solution**: Always use explicit Boolean conversion

```typescript
// ❌ Wrong - can be undefined/null
featured: formData.shouldHighlight

// ✅ Correct - guaranteed boolean
featured: Boolean(formData.shouldHighlight)
```

### 2. Database Field Compatibility Pattern

**Problem**: Frontend and database field names may differ
**Solution**: Map both field names for compatibility

```typescript
const mappedData = {
  featured: Boolean(formData.shouldHighlight),        // Database field
  shouldHighlight: Boolean(formData.shouldHighlight), // Frontend field
  // Ensures compatibility with both naming conventions
};
```

### 3. Single Record Constraint Pattern

**Problem**: Business rule requires only one featured article
**Solution**: Atomic constraint enforcement in database functions

```sql
-- ALWAYS handle constraint before setting new featured article
IF v_featured THEN
  UPDATE articles SET featured = false WHERE featured = true;
END IF;
-- Then proceed with insert/update
```

### 4. Dual-Layer Validation Pattern

**Problem**: Ensure constraint enforcement at both service and database levels
**Solution**: Implement validation in both TypeScript service and SQL function

```typescript
// Service Layer (TypeScript)
if (formData.shouldHighlight) {
  await unfeaturedExistingArticles();
}

// Database Layer (SQL)
IF v_featured THEN
  UPDATE articles SET featured = false WHERE featured = true;
END IF;
```

## Database Schema Requirements

### Articles Table
```sql
CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... other fields
  featured boolean NOT NULL DEFAULT false,
  -- ... other fields
);
```

### Required Database Functions

1. **save_article_draft** - Must handle featured field for draft saving
2. **submit_article_optimized** - Must handle featured field for submission
3. **submit_article_with_validation** - Must handle featured field with validation

All functions must include:
- Featured field extraction from JSON
- Single featured article constraint enforcement
- Proper field mapping in INSERT/UPDATE statements

## Testing and Verification

### 1. Feature Testing Checklist

- [ ] Create article with "Should Highlight" enabled
- [ ] Verify article saves with `featured = true` in database
- [ ] Create second featured article
- [ ] Verify first article becomes `featured = false`
- [ ] Verify second article becomes `featured = true`
- [ ] Test draft saving with featured flag
- [ ] Test article submission with featured flag

### 2. Database Verification Queries

```sql
-- Check featured articles count (should always be 0 or 1)
SELECT COUNT(*) FROM articles WHERE featured = true;

-- View all featured articles
SELECT id, title, featured, status, created_at 
FROM articles 
WHERE featured = true 
ORDER BY created_at DESC;

-- Check field mapping in recent submissions
SELECT id, title, featured, status, updated_at
FROM articles 
ORDER BY updated_at DESC 
LIMIT 10;
```

### 3. Frontend Console Verification

Look for these console logs during submission:
```
Article marked as featured, unfeaturing existing featured articles...
Successfully unfeatured existing articles
Final mapped data before submission: { featured: true, shouldHighlight: true, ... }
```

## Common Pitfalls and Solutions

### 1. Pitfall: Undefined Boolean Values
```typescript
// ❌ This can be undefined
featured: formData.shouldHighlight

// ✅ Always use Boolean conversion
featured: Boolean(formData.shouldHighlight)
```

### 2. Pitfall: Missing Database Field Updates
```sql
-- ❌ Missing featured field in INSERT
INSERT INTO articles (title, content) VALUES (?, ?)

-- ✅ Include featured field
INSERT INTO articles (title, content, featured) VALUES (?, ?, ?)
```

### 3. Pitfall: Race Conditions in Constraint Enforcement
```sql
-- ❌ Race condition possible
UPDATE articles SET featured = false WHERE featured = true;
-- (another request could create featured article here)
INSERT INTO articles (..., featured) VALUES (..., true);

-- ✅ Handle in atomic transaction
BEGIN;
  IF v_featured THEN
    UPDATE articles SET featured = false WHERE featured = true;
  END IF;
  INSERT INTO articles (..., featured) VALUES (..., v_featured);
COMMIT;
```

## File Reference

### Core Implementation Files
- `src/utils/article/articleDataMapper.ts` - Field mapping logic
- `src/services/articles/unifiedSubmissionService.ts` - Service layer integration
- `src/utils/dbFunctions.sql` - Database function implementations
- `src/components/Admin/ArticleEditor/hooks/` - Form submission hooks

### Form Components
- `src/components/Admin/ArticleEditor/forms/StandardArticleForm.tsx`
- `src/components/Admin/ArticleEditor/forms/DebateArticleForm.tsx`
- `src/components/Admin/ArticleEditor/forms/VideoArticleForm.tsx`
- `src/components/Admin/ArticleEditor/forms/StoryboardArticleForm.tsx`

## Future Development Guidelines

1. **Always test boolean field mappings** when adding new form fields
2. **Implement dual-layer validation** for business constraints
3. **Use explicit Boolean conversion** for all checkbox values
4. **Include both field names** during migration periods
5. **Test constraint enforcement** with concurrent operations
6. **Document field mapping** in code comments

## Version History

- **v1.0** (2025-06-01): Initial implementation with featured articles support
- **v1.1** (2025-06-01): Added comprehensive constraint enforcement and field mapping

---

*This guide should be updated whenever featured article functionality is modified or extended.*
