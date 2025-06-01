
# Developer Onboarding - The Flying Bus

## Quick Setup

```bash
git clone <repository-url>
cd <project-name>
npm install
npm run dev
```

**Environment**: Node.js 18+, npm. Project runs on `http://localhost:8080`

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: React Query (@tanstack/react-query) + Context API
- **Forms**: React Hook Form + Zod validation
- **Routing**: React Router DOM v6
- **Testing**: Vitest + React Testing Library
- **Backend Integration**: Supabase (when connected)

## Project Architecture

### Core Structure
```
src/
├── components/           # UI components organized by domain
│   ├── Admin/           # Admin portal components
│   ├── Articles/        # Article display/interaction
│   ├── Auth/           # Authentication components
│   ├── Layout/         # Layout components (headers, footers)
│   └── ui/             # shadcn/ui base components
├── pages/              # Route components
├── hooks/              # Custom React hooks
├── services/           # API/business logic services
├── utils/              # Utilities and helpers
├── contexts/           # React contexts
├── data/               # Mock/demo data
└── types/              # TypeScript type definitions
```

### Key Architectural Patterns

**Component Organization**: Domain-driven folders with co-located tests
**State Management**: React Query for server state, Context for global client state
**Form Handling**: React Hook Form + Zod schemas in `utils/validation/`
**Routing**: File-based organization in `routes/` with protected routes
**Error Handling**: Error boundaries + centralized error utilities

## Core Systems

### Article Management
- **Article Types**: Standard, Debate, Video, Storyboard
- **Form Handling**: Specialized forms in `components/Admin/ArticleEditor/forms/`
- **Validation**: Zod schemas in `utils/validation/articleFormSchema.ts`
- **Draft System**: Auto-save and manual save via `hooks/article/`

### Authentication & Authorization
- **Demo Mode**: `useDemoAuth.ts` for development
- **Protected Routes**: `ProtectedRoute` component wrapper
- **User Profiles**: Reader profiles with role-based access

### Layout System
- **Public Layout**: `MainLayout` for public pages
- **Admin Layout**: `AdminPortalLayout` for admin pages
- **Navigation**: Context-driven navigation state

### Logging & Debug
- **Logger**: Centralized logging system in `utils/logger/`
- **Debug Panels**: Development-only debug components
- **Performance**: Performance monitoring hooks

## Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm test                # Run tests
npm run test:watch      # Watch mode testing
npm run test:coverage   # Coverage report

# Custom Scripts
node scripts/build.js   # Enhanced build with metrics
node scripts/deploy.js  # Deployment script
```

## Key Services

### Article Services (`services/articles/`)
- **Query**: `articleQueryService.ts` - Fetching articles
- **Mutation**: `articleMutationService.ts` - Creating/updating articles
- **Draft**: `draft/unifiedDraftService.ts` - Draft management
- **Validation**: `validation/articleValidationService.ts` - Content validation

### Utility Services
- **Logger**: `utils/logger/logger.ts` - Centralized logging
- **Validation**: `utils/validation/` - Form and content validation
- **Security**: `utils/security/sanitize.ts` - Content sanitization
- **Navigation**: `utils/navigation/` - Routing utilities

## Data Flow Patterns

### Article Creation Flow
1. User selects article type → `ArticleTypeSelectionModal`
2. Form rendered → `components/Admin/ArticleEditor/forms/`
3. Validation → Zod schemas in `utils/validation/`
4. Auto-save → `hooks/article/autoSave/`
5. Submission → `services/articles/submission/`

### Authentication Flow
1. Login attempt → `useDemoAuth` or Supabase auth
2. User context → `AuthContext`
3. Route protection → `ProtectedRoute`
4. Role-based UI → Component-level checks

## Important Conventions

### Component Naming
- **PascalCase** for components
- **camelCase** for hooks (use prefix)
- **kebab-case** for utility files

### File Organization
- One component per file
- Co-locate tests with components
- Index files for clean imports
- Separate types in `/types` when shared

### State Management
- **Local state**: `useState` for component-specific state
- **Global state**: Context for app-wide state
- **Server state**: React Query for API data
- **Form state**: React Hook Form for forms

### Error Handling
- Error boundaries for component crashes
- Service-level error handling with logger
- User-friendly error messages via toast system

## Testing Approach

### Test Structure
```bash
# Run specific test suites
npm test -- components    # Component tests
npm test -- services      # Service tests
npm test -- utils         # Utility tests
```

### Test Patterns
- **Components**: Render + interaction testing
- **Hooks**: Custom hook testing with `renderHook`
- **Services**: Mock Supabase client, test logic
- **Utils**: Pure function testing

### Mocking Strategy
- Supabase client mocked in `test/setup.ts`
- Router mocked for navigation tests
- Logger mocked to prevent console spam

## Build & Deployment

### Build Process
```bash
npm run build    # Vite build → dist/
```

**Output**: Static files in `dist/` ready for hosting

### Deployment Options
- **Lovable Platform**: Click "Publish" button
- **Custom Domain**: Project Settings → Domains
- **External Hosting**: Use `dist/` folder contents

### Environment Configuration
- Development: Auto-loaded from Vite
- Production: Configure in hosting platform
- Supabase: Integration handles backend config

## Troubleshooting

### Common Issues
1. **Build Errors**: Check TypeScript errors, missing imports
2. **Route Issues**: Verify route definitions in `routes/`
3. **Form Validation**: Check Zod schemas match form fields
4. **Auth Issues**: Verify user context and protection setup

### Debug Tools
- React DevTools for component inspection
- Network tab for API debugging
- Logger output in console (dev mode)
- Debug panels for development insights

### Performance
- Lazy loading implemented for route components
- React Query caching for API responses
- Component memoization where beneficial

## Next Steps

1. **Explore the Admin Portal**: Navigate to `/admin` (requires auth)
2. **Review Article Types**: Check `constants/articleConstants.ts`
3. **Understand Validation**: Start with `utils/validation/`
4. **Test the Build**: Run `npm run build` to ensure everything works
5. **Check Tests**: Run `npm test` to see current test coverage

## Key Files to Review First

1. `src/App.tsx` - Application entry point
2. `src/components/Layout/MainLayout.tsx` - Main layout structure
3. `src/hooks/useAuth.tsx` - Authentication logic
4. `src/services/articleService.ts` - Article operations
5. `src/utils/validation/articleFormSchema.ts` - Form validation rules

---

**Last Updated**: Generated from codebase analysis
**Questions?** Check existing code patterns and test files for examples
