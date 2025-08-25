# Project Structure

## Root Level

- **Configuration Files**: `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `package.json`
- **Environment**: `.env` for environment variables
- **Documentation**: `README.md`, `PROJECT_ROADMAP.md`, `DEVELOPER_ONBOARDING.md`

## Source Code (`src/`)

### Core Application
- `App.tsx` - Main application component with routing
- `main.tsx` - Application entry point with providers
- `vite-env.d.ts` - Vite type definitions

### Components (`src/components/`)
- **Feature-based organization** by domain (Articles, Auth, Comments, etc.)
- **UI Components** (`src/components/ui/`) - Reusable shadcn/ui components
- **Common Components** (`src/components/Common/`) - Shared utilities

### Key Component Categories
- `Articles/` - Article display, cards, content rendering
- `Auth/` - Authentication forms and user management
- `Admin/` - Administrative interface components
- `Comments/` - Comment system components
- `Navigation/` - Navigation and filtering components
- `Profile/` - User profile components

### Application Logic
- `contexts/` - React contexts for global state
- `hooks/` - Custom React hooks organized by feature
- `services/` - API services and business logic
- `utils/` - Utility functions and helpers
- `types/` - TypeScript type definitions

### Data & Configuration
- `data/` - Static data and mock content
- `constants/` - Application constants
- `integrations/` - Third-party service integrations (Supabase)

### Styling
- `styles/` - CSS files and style configurations
- Uses Tailwind CSS with custom theme extensions

## External Integrations

### Supabase (`supabase/`)
- `config.toml` - Supabase project configuration
- `migrations/` - Database migration files

### Web3 (`wallet/`)
- Thirdweb integration files
- Wallet connection and reward system logic

## Naming Conventions

- **Components**: PascalCase (e.g., `ArticleCard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useArticleData.ts`)
- **Services**: camelCase with `Service` suffix (e.g., `articleService.ts`)
- **Types**: PascalCase with descriptive names
- **Utilities**: camelCase descriptive names

## File Organization Principles

- **Feature-first**: Components grouped by domain/feature
- **Colocation**: Related files kept together
- **Separation of concerns**: Logic, UI, and data clearly separated
- **Consistent naming**: Predictable file and folder naming patterns