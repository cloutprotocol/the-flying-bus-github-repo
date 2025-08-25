# Tech Stack

## Core Technologies

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.1
- **Styling**: Tailwind CSS with shadcn/ui components
- **Backend**: Supabase (PostgreSQL database, auth, real-time)
  - **⚠️ CRITICAL**: Use ONLY preview branch `add-email` with project-ref `sutvexycbiiarpkugzpv`
  - **See**: `.kiro/steering/supabase-environment.md` for complete environment details
- **Web3**: Thirdweb SDK v5 with Ethers.js v5
- **Blockchain**: Polygon Mumbai Testnet
- **Routing**: React Router DOM v6
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form with Zod validation
- **Testing**: Vitest with Testing Library

## Key Libraries

- **UI Components**: Radix UI primitives with shadcn/ui
- **Animations**: Framer Motion
- **Rich Text**: React Quill
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Security**: DOMPurify for sanitization

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Environment Setup

- Node.js with npm required
- Environment variables in `.env` file
- Thirdweb client ID required for Web3 features
- Supabase project configuration in `supabase/config.toml`

## Path Aliases

- `@/*` maps to `./src/*` for clean imports

## TypeScript Configuration

- Relaxed settings: `noImplicitAny: false`, `strictNullChecks: false`
- Allows JavaScript files with `allowJs: true`
- Skip library checks for faster builds