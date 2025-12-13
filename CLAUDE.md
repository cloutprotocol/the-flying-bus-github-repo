# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Interactive news platform for kids featuring Web3 integration, content management system, and role-based access control. Built with React, TypeScript, Vite, Supabase, and Thirdweb.

## Development Commands

### Build & Development
- `npm run dev` - Start development server on port 8080
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Testing
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run all tests once
- `npm run test:invitation-workflow` - Run invitation workflow integration tests
- `npm run test:email-system` - Test email system
- `npm run test:registration-flows` - Test registration flows
- `npm run test:frontend-integration` - Frontend integration tests

### Deployment & Setup
- `npm run deploy:production` - Deploy to production (runs ./scripts/deploy-production.sh)
- `npm run health-check` - Check system health
- `npm run validate:production` - Validate production configuration
- `npm run setup-storage` - Setup Supabase storage buckets (use :local or :remote variants)
- `npm run create-admin-user:local` - Create admin user locally
- `npm run create-admin-user:remote` - Create admin user on remote

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, React Router
- **UI**: shadcn/ui (Radix UI primitives), Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Web3**: Thirdweb SDK, Ethers.js (Polygon Mumbai Testnet)
- **Testing**: Vitest, Testing Library
- **State**: React Context (AuthContext, ArticleEditorContext, NavigationContext)

### Project Structure
- `src/components/` - React components organized by feature (Admin/, About/, ui/)
- `src/services/` - Business logic and API services
  - `auth/` - Authentication services
  - `articles/` - Article management (draft, review, submission, validation)
- `src/contexts/` - React Context providers
- `src/routes/` - Route definitions (appRoutes, adminRoutes, authRoutes, publicRoutes)
- `src/types/` - TypeScript type definitions
- `supabase/` - Database migrations and Edge Functions
- `scripts/` - Utility scripts for deployment, testing, and setup

### Key Architecture Patterns

#### Route Organization
Routes are modularized across multiple files and combined in `src/routes/appRoutes.tsx`:
- `publicRoutes.tsx` - Unauthenticated routes
- `authRoutes.tsx` - Authentication-specific routes
- `adminRoutes.tsx` - Admin/author/moderator routes
- Root App.tsx wraps routes with AuthProvider, ValidationProvider, ErrorBoundary

#### Authentication System
Enhanced authentication with auto-login, invitation-based registration, and RLS policy management:
- **Auto-login after registration** - Users logged in immediately after sign-up
- **No email confirmation required** - Immediate platform access
- **Invitation-based author registration** - Secure onboarding with proper RLS handling
- **RLS Policy Manager** (`src/services/rlsPolicyManager.ts`) - Handles service role operations for profile creation during registration
- See docs: AUTH_FLOW_IMPROVEMENTS.md, RLS_POLICY_MANAGEMENT.md, AUTH_TROUBLESHOOTING_GUIDE.md

#### Article Management
Article service is organized into specialized modules under `src/services/articles/`:
- `articleQueryService.ts` - Fetching articles
- `articleMutationService.ts` - Creating/updating articles
- `articleSubmissionService.ts` - Article submission workflow
- `articleReviewService.ts` - Review and approval workflow
- `draft/unifiedDraftService.ts` - Draft management
- `validation/articleValidationService.ts` - Article validation logic
- Main facade: `src/services/articleService.ts` exports all article services

#### Admin Components
Extensive admin system under `src/components/Admin/`:
- **ArticleEditor/** - Complex article creation forms with multiple article types (Standard, Debate, Video, Storyboard)
- **MediaManager/** - Media upload and management
- **Moderation/** - Comment moderation
- **Analytics/** - Performance metrics
- **Monitoring/** - Email and system monitoring

### Supabase Integration

#### Database
- Tables: profiles, articles, user_roles, invitation_tokens, email_events, etc.
- Row-Level Security (RLS) policies for all tables
- Database migrations in `supabase/migrations/`

#### Edge Functions
- `send-email/` - Email service with React templates
- `invitation-tokens/` - Invitation token management
- `admin-operations/` - Admin-specific operations

#### Storage
Storage buckets configured for media uploads. Use setup script:
```bash
npm run setup-storage:local  # for local development
npm run setup-storage:remote -- --project-ref=YOUR_REF  # for production
```

### Web3 Integration
Token reward system with Thirdweb embedded wallet:
- Wallet state managed through custom hooks
- Social login (Email, Google, Apple)
- Token rewards for engagement (article reads, quiz completion, etc.)
- Polygon Mumbai Testnet

## Important Implementation Notes

### Path Aliases
Uses `@/` alias for `./src/` directory (configured in vite.config.ts and tsconfig.json)

### Testing Setup
- Test setup file: `src/test/setup.ts`
- Environment: jsdom
- Coverage reports in text, JSON, and HTML formats
- Extensive integration tests for auth flows, invitation workflows, and registration

### RLS Policy Management
When working with user registration or profile creation:
1. Check `src/services/rlsPolicyManager.ts` for service role operations
2. Use service role for profile creation during registration to bypass RLS
3. Always validate permissions before operations
4. Log all RLS bypasses for security monitoring
5. Reference RLS_POLICY_MANAGEMENT.md for detailed guidance

### Article Type Forms
Four distinct article types with dedicated forms in `src/components/Admin/ArticleEditor/forms/`:
- StandardArticleForm - Traditional news articles
- DebateArticleForm - Pro/con debate format
- VideoArticleForm - Video content with metadata
- StoryboardArticleForm - Sequential story panels

Each form has submission hooks in `src/components/Admin/ArticleEditor/hooks/`

### Email System
Production email system using Resend:
- Edge Function: `supabase/functions/send-email/`
- React-based email templates in `_templates/`
- Comprehensive logging and monitoring
- Configuration docs: EMAIL_SYSTEM_PRODUCTION_DEPLOYMENT.md, RESEND_DOMAIN_SETUP.md

## Common Development Tasks

### Creating Admin Users
```bash
# Local development
npm run create-admin-user:local

# Production
npm run create-admin-user:remote
```

### Running Specific Test Suites
```bash
# Invitation workflow
npm run test:invitation-workflow:all

# Email system with coverage
npm run test:email-system:coverage

# Registration flows
npm run test:registration-flows:coverage
```

### Deployment
```bash
# Validate configuration first
npm run validate:production

# Deploy to production
npm run deploy:production

# Run health check
npm run health-check
```

## Documentation

Key documentation in `docs/`:
- **RLS_POLICY_MANAGEMENT.md** - RLS policy developer guide
- **AUTH_FLOW_IMPROVEMENTS.md** - Authentication system overview
- **AUTH_TROUBLESHOOTING_GUIDE.md** - Auth troubleshooting
- **EMAIL_SYSTEM_PRODUCTION_DEPLOYMENT.md** - Email system setup
- **ARTICLE_CREATION_GUIDE.md** - Article creation workflow
- **PRODUCTION_DEPLOYMENT_CHECKLIST.md** - Production deployment steps

## Environment Variables

Required environment variables (see .env file):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- Thirdweb credentials for Web3 integration
- Resend API key for email functionality
