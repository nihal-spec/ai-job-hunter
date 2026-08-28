# AI Job Hunter

AI Job Hunter is an AI-assisted job discovery, matching, application-assistance, and tracking
platform. Product requirements and architectural constraints are documented in
[`PROJECT_SPEC.md`](./PROJECT_SPEC.md), with the approved implementation roadmap in
[`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md).

## Development

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

Start the local PostgreSQL instance with pgvector:

```bash
docker compose up -d postgres
pnpm db:migrate
```

Copy `.env.example` to `.env.local` before running database commands or the application.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Phase 1 contains only the project foundation. Database, authentication, resume processing, AI,
job-source adapters, and product workflows will be added incrementally according to the plan.
