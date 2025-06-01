
# The Flying Bus: News for Kids, By Kids

A modern, safe, and engaging news platform where young journalists can create, share, and discuss content in a moderated environment.

## 🌟 Project Overview

The Flying Bus is a React-based web application that provides a newspaper-style platform specifically designed for children. It features article creation, moderation systems, debate functionality, and multimedia content support.

### Key Features

- **Multi-type Article System**: Standard articles, debates, videos, and storyboard series
- **Professional Moderation**: Admin approval queue and content moderation tools
- **Interactive Debates**: Yes/no voting with argument submission
- **Rich Media Support**: Image uploads, video embedding, and storyboard episodes
- **User Management**: Role-based access (readers, journalists, moderators, admins)
- **Safety First**: Content flagging, reporting, and comprehensive moderation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for backend services)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd flying-bus

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`

### Environment Setup

This project uses Supabase for backend services. The configuration is handled through:

1. **Supabase Integration**: Connect via the green Supabase button in Lovable
2. **Project Configuration**: Found in `supabase/config.toml`
3. **Environment Variables**: Managed through Supabase secrets (see Environment Variables section)

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Admin/           # Admin portal components
│   ├── Articles/        # Article display and interaction
│   ├── Auth/            # Authentication components
│   ├── Comments/        # Comment system
│   ├── Layout/          # Layout and navigation
│   └── ui/              # Base UI components (shadcn/ui)
├── pages/               # Page components
│   ├── Admin/           # Admin portal pages
│   └── [public pages]   # Public-facing pages
├── hooks/               # Custom React hooks
│   ├── article/         # Article-related hooks
│   └── [other hooks]    # Utility and feature hooks
├── services/            # API and business logic
│   ├── articles/        # Article management services
│   ├── auth/            # Authentication services
│   └── [other services] # Feature-specific services
├── utils/               # Utility functions
│   ├── logger/          # Professional logging system
│   ├── validation/      # Form and data validation
│   └── [other utils]    # Helper functions
├── types/               # TypeScript type definitions
├── data/                # Static data and mock data
└── integrations/        # External service integrations
    └── supabase/        # Supabase client and types
```

## 🛠 Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
npm run test:ui         # Run tests with UI
npm run test:services   # Run only service tests

# Code Quality
npm run typecheck       # Run TypeScript type checking
npm run lint            # Run ESLint

# CI/CD
npm run build:ci        # Build with CI optimizations
npm run deploy:dev      # Deploy to development
npm run deploy:staging  # Deploy to staging
npm run deploy:prod     # Deploy to production
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State Management**: React Query (@tanstack/react-query), Context API
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest, React Testing Library
- **Routing**: React Router DOM

### Key Dependencies

- **UI Framework**: React with TypeScript
- **Component Library**: Radix UI primitives via shadcn/ui
- **Styling**: Tailwind CSS with custom design system
- **Data Fetching**: React Query for server state management
- **Form Handling**: React Hook Form with Zod schemas
- **Rich Text**: React Quill for article content editing
- **Icons**: Lucide React
- **Charts**: Recharts for analytics

## 🎨 Design System

### Color Palette

```css
/* Primary Colors */
--dark-blue: #315057    /* Replaces traditional black */
--red-accent: #F93827   /* Call-to-action and alerts */
--yellow-accent: #FFCA58 /* Highlights and warnings */
--green-accent: #16C47F  /* Success states */
--blue-accent: #4FB9D0   /* Information and links */
```

### Typography

- **Primary Font**: Open Sauce Two (clear, kid-friendly readability)
- **Heading Hierarchy**: h1-h6 with consistent spacing
- **Body Text**: Optimized for young readers

### Component Architecture

- **Atomic Design**: Components organized by complexity
- **Reusable Patterns**: Consistent form layouts, card designs
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## 🔒 Authentication & Security

### User Roles

1. **Readers**: Can view articles, comment, and vote on debates
2. **Journalists**: Can create and edit articles, plus reader permissions
3. **Moderators**: Can review content, manage comments, plus journalist permissions
4. **Admins**: Full system access, user management, analytics

### Security Features

- **Row Level Security (RLS)**: Database-level access controls
- **Content Moderation**: Automated and manual content review
- **Input Sanitization**: XSS protection and content validation
- **Rate Limiting**: API protection and abuse prevention
- **Safe Media Handling**: Image optimization and validation

## 🗄 Database Schema

### Core Tables

- **articles**: Main content storage with status workflow
- **categories**: Content organization (Headliners, Debates, etc.)
- **comments**: Threaded comment system
- **votes**: Debate voting records
- **flagged_content**: Content moderation queue
- **user_profiles**: Extended user information

### Key Relationships

- Articles belong to categories and users
- Comments are threaded and belong to articles
- Votes link users to debate articles
- Flagged content references any content type

## 📊 Logging & Monitoring

### Professional Logging System

Located in `src/utils/logger/`, the system provides:

- **Structured Logging**: Categorized by source (AUTH, ARTICLE, API, etc.)
- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Multiple Outputs**: Console, toast notifications, local storage
- **Production Ready**: Configurable for different environments

### Usage Example

```typescript
import { logger } from '@/utils/logger/logger';
import { LogSource } from '@/utils/logger/types';

logger.info(LogSource.ARTICLE, 'Article created successfully', {
  articleId: 'abc-123',
  title: 'Sample Article'
});
```

### Migration from console.log

The project includes a migration helper at `src/utils/logger/migrationHelper.ts` to identify and convert remaining `console.log` statements to the professional logging system.

## 🧪 Testing Strategy

### Test Organization

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: Multi-component interaction testing
- **Service Tests**: API and business logic testing
- **Test Location**: Co-located with source files (`*.test.tsx`)

### Testing Tools

- **Test Runner**: Vitest (fast, Vite-compatible)
- **Component Testing**: React Testing Library
- **Assertions**: Built-in Vitest matchers + @testing-library/jest-dom
- **Mocking**: Automatic mocking for Supabase and external services

### Running Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Visual test runner
npm run test:ui
```

## 🚀 Deployment

### Environments

- **Development**: `npm run deploy:dev`
- **Staging**: `npm run deploy:staging`
- **Production**: `npm run deploy:prod`

### Build Process

1. **Type Checking**: Ensures TypeScript compliance
2. **Testing**: Runs full test suite
3. **Building**: Optimized production build
4. **Deployment**: Environment-specific deployment

### Performance Optimization

- **Code Splitting**: Lazy loading for admin routes
- **Image Optimization**: Automatic compression and format conversion
- **Caching**: Browser and API response caching
- **Bundle Analysis**: Size monitoring and optimization

## 🔧 Environment Variables

All environment variables are managed through Supabase secrets. No `.env` files are used.

### Required Secrets (via Supabase)

```bash
# Required for external integrations
OPENAI_API_KEY=          # For AI-powered features (if implemented)
STRIPE_SECRET_KEY=       # For payment processing (if implemented)
SENDGRID_API_KEY=        # For email notifications (if implemented)
```

### Supabase Configuration

```bash
# Auto-configured via Supabase integration
SUPABASE_PROJECT_ID=     # wxmtfsexxhkjwgrejmji
SUPABASE_ANON_KEY=       # Auto-configured
SUPABASE_URL=            # Auto-configured
```

## 📝 Development Guidelines

### Code Style

- **TypeScript**: Strict mode enabled, proper typing required
- **Components**: Functional components with hooks
- **File Naming**: PascalCase for components, camelCase for utilities
- **Import Organization**: Absolute imports with `@/` prefix

### Best Practices

1. **Component Size**: Keep components under 200 lines
2. **Hook Extraction**: Extract complex logic into custom hooks
3. **Error Handling**: Use error boundaries and proper error states
4. **Performance**: Use React.memo and useMemo for expensive operations
5. **Accessibility**: Include ARIA attributes and keyboard navigation

### Git Workflow

- **Feature Branches**: Create branches for new features
- **Commit Messages**: Use conventional commits format
- **Pull Requests**: Required for main branch changes
- **Code Review**: All changes require review

## 🎯 Article Types

### Standard Articles
- Basic news articles with rich text content
- Image support and category assignment
- Author attribution and publication workflow

### Debate Articles
- Yes/No voting functionality
- Argument submission for both sides
- Real-time vote tallying and results display

### Video Articles
- YouTube video embedding
- Optional supplementary text content
- Video player with custom controls

### Storyboard Series
- Episode-based content structure
- Series and episode management
- Sequential navigation between episodes

## 🛡 Content Moderation

### Moderation Workflow

1. **Content Submission**: Articles start in 'pending' status
2. **Automated Checks**: Basic validation and safety checks
3. **Manual Review**: Moderator approval process
4. **Publication**: Approved content goes live
5. **Post-Publication**: Ongoing monitoring and flagging system

### Moderation Tools

- **Approval Queue**: Central review dashboard
- **Content Flagging**: User-reported content system
- **Comment Moderation**: Threaded comment review
- **User Management**: Role assignment and account management

## 🔮 Future Development

### Planned Features

- **Mobile App**: React Native companion app
- **Offline Support**: Progressive Web App capabilities
- **Real-time Notifications**: WebSocket-based updates
- **Advanced Analytics**: Detailed engagement metrics
- **AI Integration**: Content assistance and moderation

### Technical Debt

- **Component Refactoring**: Some large components need splitting
- **Test Coverage**: Increase coverage to 90%+ across all modules
- **Performance**: Implement virtual scrolling for large lists
- **Accessibility**: Full WCAG 2.1 AA compliance

## 📞 Support & Resources

### Documentation Links

- [Frontend Guidelines](docs/FRONTEND_GUIDELINES.md)
- [Article Form Implementation](docs/ARTICLE_FORM_IMPLEMENTATION_REFERENCE.md)
- [Featured Articles Guide](docs/FEATURED_ARTICLES_IMPLEMENTATION_GUIDE.md)
- [Security & Testing](SECURITY_AND_TESTING.md)
- [Project Roadmap](PROJECT_ROADMAP.md)

### External Resources

- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

**Last Updated**: January 2025
**Version**: 2.0.0
**Maintainer**: The Flying Bus Development Team
