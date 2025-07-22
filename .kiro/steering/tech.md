# Tech Stack

## Core Technologies

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **Styling**: Tailwind CSS with shadcn/ui components
- **Routing**: React Router DOM v6
- **State Management**: React Context + custom hooks
- **Forms**: React Hook Form with Zod validation
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Thirdweb social login

## Web3 Integration

- **Wallet**: Thirdweb SDK v5 with embedded wallet support
- **Blockchain**: Polygon Mumbai Testnet
- **Token Standard**: ERC-20 for reward system
- **Web3 Library**: Ethers.js v5

## UI/UX Libraries

- **Component Library**: shadcn/ui (Radix UI primitives)
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Rich Text**: React Quill
- **Charts**: Recharts
- **Notifications**: Sonner (toast notifications)

## Development Tools

- **Linting**: ESLint with TypeScript support
- **Testing**: Vitest + Testing Library
- **Package Manager**: npm (with bun.lockb present)
- **TypeScript**: Strict mode disabled for flexibility

## Common Commands

```bash
# Development
npm run dev              # Start dev server on port 8080
npm run build           # Production build
npm run build:dev       # Development build
npm run preview         # Preview production build
npm run lint            # Run ESLint

# Testing
npm test                # Run tests with Vitest
```

## Environment Setup

- Environment variables in `.env` file
- Thirdweb credentials pre-configured
- Supabase client configuration in `src/integrations/supabase/`

## Path Aliases

- `@/*` maps to `src/*` for clean imports
- Components, utils, hooks, and lib directories aliased