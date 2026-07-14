# Signal Archive Repository Map

Last verified: 2026-07-13

## Workspace boundary

- `D:\xe1Signal` is the active Signal Archive application.
- `D:\xe1Signal\my-hacking-app` is a separate, stock Next.js starter with its own dependencies and `AGENTS.md`. It is not imported by the root application and remains untouched pending an explicit cleanup decision.
- No Git repository was detected at either application root, so change history and a Git diff are unavailable.

## Runtime architecture

- Framework: Next.js 15 App Router with React 19 and TypeScript.
- Styling: Tailwind CSS with a graphite/violet design system in `tailwind.config.ts` and shared styles in `src/app/globals.css`.
- Persistence: PostgreSQL through Prisma 5 (`prisma/schema.prisma`).
- Authentication: Auth.js/NextAuth credentials flow with Prisma adapter and JWT sessions (`src/lib/auth.ts`, `src/lib/auth.config.ts`).
- Validation and forms: Zod and React Hook Form.
- Testing dependencies: Vitest and Playwright are declared, but no project tests or test configuration were found.

## Application surfaces

- Public and discovery UI: `src/app/page.tsx`, `src/app/discover`, `src/app/search`, profiles, signals, and frequencies.
- Account UI: `src/app/auth`, `src/app/settings`, and related components.
- Internal UI: `src/app/internal`; its current authorization model does not yet implement the requested owner-only, environment-gated contract.
- API routes: `src/app/api/auth`, `src/app/api/signals`, `src/app/api/frequencies`, and `src/app/api/admin`.
- Shared UI and feature components: `src/components`.
- Server utilities: `src/lib`.

## Data model

`prisma/schema.prisma` is the current persistence contract. It contains users and settings, signals and files, frequencies and collaborators, reactions, comments, saves, follows, blocks, messages, notifications, reports, research trails, link previews, audit logs, and search indexes.

Several routes and pages were written against a different model revision. Examples include `User.password` versus `passwordHash`, frequency `members`/`slug`/`color` fields, relation-backed tags versus `String[]`, and unsupported enum values. These are build blockers and must be reconciled deliberately rather than hidden with type casts.

## Configuration

- `package.json`: application scripts and dependencies.
- `next.config.mjs`: Next.js configuration and response headers.
- `tailwind.config.ts`, `postcss.config.mjs`: styling toolchain.
- `tsconfig.json`: TypeScript compilation.
- `.env.example`: public configuration template; it does not yet include the full requested origin and test-environment contract.
- `.env.local`: present but intentionally not read during repository inspection.

## Validation baseline

- `npm run type-check`: fails with schema/code drift across authentication, signals, frequencies, settings, and several UI components.
- `npm run lint`: cannot run non-interactively because no ESLint configuration exists and `next lint` prompts for setup.
- `npm test -- --run`: fails because no test files exist.
- `npx prisma validate`: could not complete because Prisma attempted a blocked engine/checksum network request; this is an environment/tooling result, not proof that the schema is invalid.

## High-risk boundaries

- Password-reset development logging currently risks exposing a raw reset token and email.
- Internal routes are not yet protected by the requested owner-only plus explicit test-environment gating.
- Remote image configuration accepts arbitrary HTTPS hosts.
- Link preview fetching, upload validation, ghost mode, and production-safe environment controls require dedicated security review before being considered complete.

## Implementation order

Follow the phase order in `PROJECT_STATUS.md`. Stabilize one end-to-end contract at a time, starting with authentication and the generated Prisma contract, and validate each slice before expanding the feature surface.
