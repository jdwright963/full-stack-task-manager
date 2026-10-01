# Full-Stack Task Manager (T3)

A type-safe task manager app built with the T3 stack. It covers credentials auth, email verification, protected routes, and automated tests in CI—not just a CRUD demo.

## Stack

| Layer | Tools |
| --- | --- |
| App | Next.js 15 (App Router), React 19, TypeScript (strict) |
| API | tRPC, Zod, TanStack Query |
| Data | PostgreSQL, Prisma |
| Auth | Auth.js (NextAuth v5), bcrypt, JWT sessions |
| Email | Nodemailer (SMTP); Mailtrap in tests |
| UI | Tailwind CSS |
| Quality | Playwright, pytest, ESLint, Prettier, GitHub Actions |

## What it does

- Register with email and password; passwords are hashed before storage
- Verify email via a one-time token before login is allowed
- Redirects unauthenticated users from the `/tasks` page to the `/login` page
- Require a session for every task API call, and read, create, complete, and delete only that user's tasks
- Create, complete, and delete tasks with Zod-validated input
- Refresh the list immediately after mutations (no stale UI)
- Validate environment variables at build time so missing secrets fail fast

## Architecture

```
Browser  →  Next.js App Router  →  tRPC  →  Prisma  →  PostgreSQL
                 ↓
           Auth.js (credentials + JWT)
                 ↓
           SMTP (verification email)
```

Feature routers live under `src/server/api/routers/`. Pages in `src/app/` are Server Components where it matters (session checks, redirects); interactive pieces (`CreateTask`, `TaskList`) are Client Components.

## Testing and CI

| Suite | What it covers |
| --- | --- |
| Playwright (`e2e/`) | Register → verify email (Mailtrap) → login → tasks → logout, plus failures, duplicates, invalid tokens, and unauthenticated access |
| pytest (`tests_api/`) | Unauthenticated HTTP calls against the tRPC API (`task.getAll`) returns 401 |
| GitHub Actions | Playwright and backend tests on push/PR, with isolated Postgres schemas |

Tests reset and seed the database so runs are deterministic.

## Run locally

Prerequisites: Node 18+, npm, Docker (or another Postgres instance). Python is optional (API tests only).

```bash
cp .env.example .env          # fill DATABASE_URL, AUTH_SECRET, SMTP_*
npm ci
./start-database.sh           # WSL / Linux / macOS
npx prisma migrate dev
npm run dev                   # http://localhost:3000
```

Tests:

```bash
cp .env.example.test .env.test
npx playwright test

pip install -r requirements.txt
pytest tests_api/             # with the app running
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbo) |
| `npm run build` | Production build |
| `npm run check` | Lint + typecheck |
| `npm run db:studio` | Prisma Studio |

Deploy on Vercel. Set the same environment variables there. Before deploying, apply Prisma migrations to the production database with `npx prisma migrate deploy`. The Vercel build runs `next build` only.
