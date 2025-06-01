
# Developer Onboarding - The Flying Bus

## Quick Setup

```bash
# Clone and install
git clone <repository-url>
cd flying-bus
npm install

# Start development
npm run dev
# App runs on http://localhost:8080

# Run tests
npm test
npm run test:watch
```

## Project Structure

```
src/
├── components/           # UI components
│   ├── Admin/           # Admin portal features
│   ├── Articles/        # Article display & interaction
│   ├── Auth/            # Authentication components
│   └── ui/              # Base UI components (shadcn/ui)
├── pages/               # Route components
├── hooks/               # Custom hooks
├── services/            # API & business logic
├── utils/               # Utilities & helpers
├── types/               # TypeScript definitions
└── integrations/        # External services (Supabase)
```

### Key Patterns

- **Components**: PascalCase.tsx, max 200 lines
- **Hooks**: camelCase.ts, single responsibility
- **Services**: Organized by feature, return `ServiceResult<T>`
- **Types**: Shared in `/types`, feature-specific co-located

## Development Workflow

### Commands
```bash
npm run dev              # Development server
npm run build           # Production build
npm test                # Run tests
npm run test:coverage   # Test coverage
npm run typecheck       # TypeScript check
```

### Code Conventions
- **Imports**: External → Utils → Types → UI → Local
- **State**: Local (useState) → Server (React Query) → Global (Context)
- **Forms**: React Hook Form + Zod validation
- **Styling**: Tailwind CSS classes

### Backend Integration
- **Database**: Supabase PostgreSQL with RLS
- **Auth**: Supabase Auth (email/password)
- **Storage**: Supabase Storage for media files
- **Real-time**: Supabase subscriptions

## Testing Quick Reference

### Test Structure
```typescript
describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  it('should render correctly', () => {
    render(<ComponentName {...props} />);
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
```

### Mocking
- **Supabase**: Auto-mocked in `src/test/setup.ts`
- **Router**: Auto-mocked with basic navigation
- **Toast**: Auto-mocked notifications

### Test Commands
```bash
npm test                    # All tests
npm run test:watch         # Watch mode
npm run test:services      # Service tests only
npm run test:ui            # Visual test runner
```

## Project Specifics

### Article System
- **Types**: standard, debate, video, storyboard
- **Status Flow**: draft → pending → published
- **Moderation**: Admin approval required

### User Roles
- **readers**: View articles, comment, vote
- **journalists**: Create articles + reader permissions
- **moderators**: Review content + journalist permissions
- **admins**: Full access

### Key Files to Know
- `src/services/articles/` - Article CRUD operations
- `src/hooks/useAuth.tsx` - Authentication state
- `src/utils/logger/` - Professional logging system
- `src/types/ArticleEditorTypes.ts` - Core article types

### Debug Tools
- Logger system: `logger.info(LogSource.ARTICLE, 'message', data)`
- React Query DevTools: Available in development
- Professional error boundaries throughout app

### Common Gotchas
- Always use logger instead of console.log
- Database queries use RLS - test with different user roles
- Article forms have auto-save every 30 seconds
- Media uploads require proper CORS setup in Supabase
