# Project Structure

## Source Organization (`src/`)

### Components (`src/components/`)
- **Feature-based organization** by domain (Articles, Auth, Admin, etc.)
- **UI components** in `src/components/ui/` (shadcn/ui components)
- **Common components** in `src/components/Common/` for shared functionality
- Each feature folder contains related components and sub-features

### Key Feature Areas
- `Articles/` - Article display, cards, content rendering
- `Auth/` - Authentication forms, user menu, protected routes  
- `Admin/` - Admin portal with dashboard, moderation, user management
- `Comments/` - Comment system with moderation and replies
- `Category/` - Category pages, filters, pagination
- `Profile/` - User profiles and settings
- `Navigation/` - Breadcrumbs, filters, category navigation

### Data Layer
- `contexts/` - React contexts for global state (Auth, Debug, Navigation)
- `hooks/` - Custom hooks organized by feature area
- `services/` - API services and business logic
- `data/` - Static data and mock data for development
- `integrations/` - External service integrations (Supabase)

### Utilities and Types
- `utils/` - Helper functions organized by domain
- `types/` - TypeScript type definitions
- `lib/` - Shared utilities (currently just utils.ts)
- `constants/` - Application constants

### Styling
- `styles/` - CSS files for specific features and global styles
- Tailwind classes preferred over custom CSS
- Component-specific styles when needed

## Naming Conventions

- **Components**: PascalCase (e.g., `ArticleCard.tsx`)
- **Hooks**: camelCase starting with 'use' (e.g., `useArticleForm.ts`)
- **Services**: camelCase ending with 'Service' (e.g., `articleService.ts`)
- **Types**: PascalCase for interfaces/types
- **Files**: Match component/function name

## Import Patterns

- Use path aliases: `@/components`, `@/hooks`, `@/utils`
- Group imports: external libraries, internal modules, relative imports
- Prefer named exports over default exports for utilities

## File Organization Rules

- One main component per file
- Co-locate related components in feature folders
- Separate concerns: components, hooks, services, types
- Keep test files adjacent to source files (`*.test.tsx`)

## Special Directories

- `public/` - Static assets (images, icons, robots.txt)
- `docs/` - Implementation guides and documentation
- `scripts/` - Build and deployment scripts
- `wallet/` - Web3 wallet integration code
- `supabase/` - Database migrations and configuration