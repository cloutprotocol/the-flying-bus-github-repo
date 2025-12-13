# Repository Guidelines

## Project Structure & Modules
- `src/` — React + TypeScript app: `components/`, `pages/`, `services/`, `hooks/`, `utils/`, `test/` (e.g., `@/components/ui/button.tsx`).
- `convex/` — Convex backend: schema, queries, mutations, and auth (e.g., `convex/schema.ts`, `convex/auth.ts`).
- `public/` static assets; `dist/` build output.
- Note: `supabase/` is legacy and not used at runtime. Do not add new code here.

## Build, Test, Dev
- `npm run dev` — Start Vite dev server.
- `npm run build` — Production build to `dist/`.
- `npm run preview` — Serve the built app locally.
- `npm run lint` — ESLint for TS/TSX.
- `npm run test` — Vitest (jsdom). Add `--coverage` for reports.

## Coding Style & Naming
- TypeScript, React FCs, hooks prefixed `use*`.
- Import alias `@/*` (see `tsconfig.json`), e.g., `import { foo } from '@/utils/foo'`.
- Components: PascalCase dirs; UI atoms in `src/components/ui` use kebab‑case files. Services/utils use camelCase.
- Keep changes small; address ESLint and `react-hooks` warnings before committing.

## Testing
- Tools: Vitest + Testing Library (`jsdom`, setup in `src/test/setup.ts`).
- File names: `*.test.ts[x]`; integration: `*.integration.test.ts[x]`.
- Focus coverage on auth, invitations, article workflows, and role gating.

## Commits & PRs
- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:` (present tense).
- PRs include: clear description, linked issues, screenshots for UI, and notes for Convex schema/migrations when relevant.
- Lint and tests must pass before review.

## Security & Config
- Copy `.env.example` → `.env.local`. Never commit secrets.
- Required envs: `VITE_CONVEX_URL` (client). Convex server envs (e.g., `CONVEX_SITE_URL`, `JWKS`) are set via Convex dashboard/CLI.
- No Supabase envs are required; Convex handles auth, DB, and RPC.

## Agent Notes
- Prefer minimal, focused patches. Keep types strong and avoid `any`.
- Update docs/tests when behavior changes; follow existing patterns and import conventions.
