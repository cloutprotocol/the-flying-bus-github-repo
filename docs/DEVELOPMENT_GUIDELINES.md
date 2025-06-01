
# Development Guidelines - The Flying Bus

## Table of Contents

1. [Code Standards](#code-standards)
2. [Component Development](#component-development)
3. [Hook Development](#hook-development)
4. [Service Layer Guidelines](#service-layer-guidelines)
5. [Testing Standards](#testing-standards)
6. [Performance Guidelines](#performance-guidelines)
7. [Security Guidelines](#security-guidelines)
8. [Git Workflow](#git-workflow)

## Code Standards

### TypeScript Configuration

**Strict Mode Required:**
```typescript
// tsconfig.json enforces strict mode
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Type Definitions:**
```typescript
// ✅ Good: Explicit types
interface ArticleFormData {
  title: string;
  content: string;
  categoryId: string;
  status: 'draft' | 'pending' | 'published';
}

// ❌ Avoid: Any types
const handleSubmit = (data: any) => { ... }

// ✅ Good: Proper typing
const handleSubmit = (data: ArticleFormData) => { ... }
```

### File Naming Conventions

```
Components:     PascalCase.tsx        (ArticleCard.tsx)
Hooks:          camelCase.ts          (useArticleData.ts)
Services:       camelCase.ts          (articleService.ts)
Utils:          camelCase.ts          (slugGenerator.ts)
Types:          PascalCase.ts         (ArticleTypes.ts)
Constants:      UPPER_SNAKE_CASE.ts   (API_ENDPOINTS.ts)
```

### Import Organization

```typescript
// 1. React and third-party libraries
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

// 2. Internal utilities and services
import { logger } from '@/utils/logger/logger';
import { articleService } from '@/services/articleService';

// 3. Types and interfaces
import type { Article, Category } from '@/types/ArticleTypes';

// 4. UI components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// 5. Local components and hooks
import { ArticleHeader } from './ArticleHeader';
import { useArticleForm } from '../hooks/useArticleForm';
```

## Component Development

### Component Size Guidelines

**Keep Components Focused:**
- Maximum 200 lines per component
- Single responsibility principle
- Extract complex logic into custom hooks
- Split large components into smaller, focused pieces

**Example Refactoring:**
```typescript
// ❌ Too large (300+ lines)
const ArticleEditor = () => {
  // Form logic (50 lines)
  // Validation logic (40 lines)  
  // Auto-save logic (30 lines)
  // Media upload logic (60 lines)
  // Submission logic (50 lines)
  // Render logic (100+ lines)
};

// ✅ Refactored into focused components
const ArticleEditor = () => {
  return (
    <ArticleEditorLayout>
      <ArticleFormHeader />
      <ArticleFormContent />
      <ArticleFormActions />
    </ArticleEditorLayout>
  );
};
```

### Props Interface Design

```typescript
// ✅ Good: Clear, typed props
interface ArticleCardProps {
  article: Article;
  onEdit?: (articleId: string) => void;
  onDelete?: (articleId: string) => void;
  showActions?: boolean;
  variant?: 'default' | 'featured' | 'compact';
}

// ✅ Good: Optional props with defaults
const ArticleCard: React.FC<ArticleCardProps> = ({
  article,
  onEdit,
  onDelete,
  showActions = true,
  variant = 'default'
}) => {
  // Component implementation
};
```

### Event Handler Patterns

```typescript
// ✅ Good: Typed event handlers
const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  // Handle submission
}, []);

const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = event.target;
  setFormData(prev => ({ ...prev, [name]: value }));
}, []);

// ✅ Good: Custom event handlers
const handleArticleEdit = useCallback((articleId: string) => {
  router.push(`/admin/articles/${articleId}`);
}, [router]);
```

### Error Boundaries

```typescript
// Wrap components that might fail
<ErrorBoundary
  fallback={<ArticleEditorErrorFallback />}
  onError={(error, errorInfo) => {
    logger.error(LogSource.EDITOR, 'Article editor crashed', { error, errorInfo });
  }}
>
  <ArticleEditor />
</ErrorBoundary>
```

## Hook Development

### Custom Hook Guidelines

**Single Responsibility:**
```typescript
// ✅ Good: Focused hook
const useArticleData = (articleId: string) => {
  return useQuery({
    queryKey: ['article', articleId],
    queryFn: () => getArticleById(articleId),
    enabled: !!articleId
  });
};

// ❌ Avoid: Kitchen sink hooks
const useEverything = () => {
  // Articles, comments, users, auth, etc.
};
```

**Return Consistent Interfaces:**
```typescript
// ✅ Good: Consistent return pattern
const useArticleForm = (articleId?: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  return {
    // Data
    form,
    content,
    
    // State
    isLoading,
    error,
    
    // Actions
    handleSubmit,
    handleSaveDraft,
    
    // Utils
    resetForm,
    validateForm
  };
};
```

### Hook Dependencies

```typescript
// ✅ Good: Proper dependency arrays
const useArticleAutoSave = (formData: FormData, articleId?: string) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraft(formData);
    }, 30000);
    
    return () => clearTimeout(timer);
  }, [formData, articleId]); // Include all dependencies
};

// ✅ Good: Stable references
const handleSave = useCallback(async (data: FormData) => {
  await saveArticle(data);
}, []); // No dependencies if stable

const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]); // Only recalculate when data changes
```

## Service Layer Guidelines

### Service Organization

```typescript
// services/articles/articleQueryService.ts
export const articleQueryService = {
  getById: async (id: string): Promise<ServiceResult<Article>> => {
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      logger.error(LogSource.API, 'Failed to fetch article', { id, error });
      return { success: false, error: error.message };
    }
  }
};
```

### Error Handling Standards

```typescript
// Standard service result interface
interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Consistent error handling
const handleServiceError = (error: unknown, context: string): string => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  logger.error(LogSource.API, `Service error: ${context}`, { error });
  return message;
};
```

### API Integration Patterns

```typescript
// ✅ Good: Typed API calls
const createArticle = async (articleData: CreateArticleData): Promise<ServiceResult<Article>> => {
  try {
    // Validate input
    const validatedData = createArticleSchema.parse(articleData);
    
    // Make API call
    const { data, error } = await supabase
      .from('articles')
      .insert(validatedData)
      .select()
      .single();
      
    if (error) throw error;
    
    // Log success
    logger.info(LogSource.ARTICLE, 'Article created successfully', { 
      articleId: data.id 
    });
    
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: handleServiceError(error, 'createArticle') 
    };
  }
};
```

## Testing Standards

### Unit Test Structure

```typescript
// ArticleCard.test.tsx
describe('ArticleCard', () => {
  const mockArticle: Article = {
    id: '1',
    title: 'Test Article',
    content: 'Test content',
    status: 'published'
  };

  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    cleanup();
  });

  it('should render article title and content', () => {
    render(<ArticleCard article={mockArticle} />);
    
    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<ArticleCard article={mockArticle} onEdit={onEdit} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    await userEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockArticle.id);
  });
});
```

### Service Testing

```typescript
// articleService.test.ts
describe('ArticleService', () => {
  beforeEach(() => {
    // Mock Supabase client
    vi.clearAllMocks();
  });

  it('should create article successfully', async () => {
    const mockArticle = { id: '1', title: 'Test' };
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockArticle, error: null })
        })
      })
    });

    const result = await articleService.create({ title: 'Test' });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockArticle);
  });
});
```

### Integration Testing

```typescript
// ArticleEditor.integration.test.tsx
describe('ArticleEditor Integration', () => {
  it('should save draft and submit article', async () => {
    render(<ArticleEditor />);
    
    // Fill out form
    await userEvent.type(screen.getByLabelText(/title/i), 'New Article');
    await userEvent.type(screen.getByLabelText(/content/i), 'Article content');
    
    // Save draft
    const saveDraftButton = screen.getByRole('button', { name: /save draft/i });
    await userEvent.click(saveDraftButton);
    
    await waitFor(() => {
      expect(screen.getByText(/draft saved/i)).toBeInTheDocument();
    });
    
    // Submit for review
    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/submitted for review/i)).toBeInTheDocument();
    });
  });
});
```

## Performance Guidelines

### React Performance

**Memoization Guidelines:**
```typescript
// ✅ Use memo for expensive components
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveDataProcessing(data);
  }, [data]);
  
  return <div>{processedData}</div>;
});

// ✅ Use callback for stable references
const ParentComponent = () => {
  const handleClick = useCallback((id: string) => {
    // Handle click
  }, []);
  
  return <ChildComponent onClick={handleClick} />;
};
```

**List Rendering:**
```typescript
// ✅ Good: Stable keys and memoized items
const ArticleList = ({ articles }) => {
  return (
    <div>
      {articles.map(article => (
        <MemoizedArticleCard 
          key={article.id} 
          article={article} 
        />
      ))}
    </div>
  );
};

const MemoizedArticleCard = memo(ArticleCard);
```

### Bundle Optimization

**Code Splitting:**
```typescript
// Route-based splitting
const ArticleEditor = lazy(() => import('@/pages/Admin/ArticleEditor'));

// Component-based splitting
const MediaManager = lazy(() => 
  import('@/components/Admin/MediaManager/MediaManager')
);

// Usage with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <ArticleEditor />
</Suspense>
```

## Security Guidelines

### Input Validation

```typescript
// ✅ Always validate inputs
const articleSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(10),
  categoryId: z.string().uuid()
});

const createArticle = async (data: unknown) => {
  const validatedData = articleSchema.parse(data);
  // Proceed with validated data
};
```

### XSS Prevention

```typescript
// ✅ Sanitize HTML content
import DOMPurify from 'dompurify';

const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class']
  });
};

// Usage in components
const ArticleContent = ({ content }) => {
  const sanitizedContent = sanitizeHTML(content);
  return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />;
};
```

### Authentication Checks

```typescript
// ✅ Always verify permissions
const useAdminRoute = () => {
  const { user, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && (!user || !hasAdminRole(user))) {
      router.push('/login');
    }
  }, [user, isLoading, router]);
  
  return { user, isAuthorized: hasAdminRole(user) };
};
```

## Git Workflow

### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(articles): add auto-save functionality for article drafts

fix(auth): resolve login redirect loop issue

docs(api): update article service documentation

refactor(components): split ArticleEditor into smaller components
```

### Branch Naming

```
feature/article-auto-save
bugfix/login-redirect-loop
hotfix/security-vulnerability
chore/update-dependencies
docs/api-documentation
```

### Pull Request Guidelines

**PR Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes
```

---

Following these guidelines ensures consistent, maintainable, and high-quality code across the entire project.
