# AI Job Hunter Implementation Plan

## Status

Phase 0 analysis is complete. This document records the approved implementation plan derived from `PROJECT_SPEC.md`.

No application code or dependencies currently exist. Implementation begins with Phase 1 only after approval.

## 1. Repository Assessment

The repository currently contains:

| File | Purpose |
|---|---|
| `PROJECT_SPEC.md` | The source of truth for the application |
| `opencode.json` | OpenCode tooling configuration |

There is currently no framework, package manifest, lockfile, source tree, test configuration, database, ORM, authentication, storage, AI integration, job-source adapter, UI component library, environment configuration, CI/CD configuration, or Git metadata.

`opencode.json` configures an OpenAI-compatible provider for the coding tool. It is not application runtime configuration and must remain separate from the application AI provider settings.

The project is greenfield. No existing implementation needs to be preserved beyond the specification and OpenCode configuration.

## 2. Recommended Architecture

Use a modular monolith deployed as one Next.js application:

```text
Browser
  -> Next.js App Router
  -> Route Handlers / Server Actions
  -> Authentication and authorization
  -> Application services
  -> Domain repositories and external adapters
  -> PostgreSQL, object storage, AI providers, job sources
```

### Frontend

- Next.js App Router with React Server Components by default.
- Client components only for interactive forms, upload progress, filters, save/apply controls, optimistic updates, and processing indicators.
- React Hook Form for complex forms.
- Zod for form and server-boundary validation.
- Tailwind CSS and shadcn/ui as the base UI system.
- Business logic stays in server services, not React components.
- Use explicit view models rather than exposing database records directly.
- Use semantic HTML, keyboard navigation, visible focus states, labels, and responsive layouts.

### Backend/API

Use Next.js Route Handlers as the primary API boundary. Use Server Actions only for tightly scoped first-party form mutations.

Every request follows:

```text
authenticate
  -> authorize resource ownership
  -> validate input
  -> call application service
  -> map result to response DTO
  -> return sanitized error or result
```

Use cursor pagination, UUID validation, bounded query parameters, and `404` responses for inaccessible user-owned resources to avoid ownership disclosure.

### Service Layer

Initial services:

- Resume service
- Candidate profile service
- Preference service
- Job ingestion service
- Job service
- Matching service
- Saved-job service
- Application service
- Application-material service
- Analytics service
- Feedback service
- Processing-job service

Services contain business rules and transaction boundaries. They must not import React or depend on HTTP request objects.

### Database Layer

Use domain-specific repositories over Drizzle queries. Repositories must centralize ownership filters, accept transactions where required, and return typed records. Avoid a generic repository abstraction.

### AI Layer

Keep AI orchestration separate from provider implementations:

```text
Application service
  -> AI orchestration
  -> prompt contracts and output validation
  -> AIProvider interface
  -> provider adapter
```

The provider interface must support `generateText`, `generateStructuredObject`, and `generateEmbedding`. Provider SDKs, model names, response formats, and provider errors stay inside adapters.

### Job-Source Adapters

Use a registry of source adapters. Core job services operate only on normalized job inputs and never import source-specific types.

Initial legitimate sources should favor public Greenhouse and Lever APIs or other explicitly permitted APIs/feeds. Do not implement unauthorized scraping, CAPTCHA bypassing, anti-bot evasion, access-control bypassing, or restricted-platform auto-submission.

### Resume Pipeline

```text
Upload
  -> file validation
  -> private object storage
  -> resume record
  -> text extraction
  -> cleaning and section detection
  -> structured extraction
  -> schema and evidence validation
  -> candidate profile draft
  -> user review and activation
```

Resume states: `UPLOADED`, `EXTRACTING`, `PARSING`, `READY`, `FAILED`, `DELETING`.

### Matching Pipeline

```text
Candidate profile + preferences + normalized job
  -> hard exclusions
  -> deterministic feature comparison
  -> embeddings and vector similarity
  -> optional structured semantic evaluation
  -> weighted score
  -> evidence-based explanation
  -> persisted algorithm/model version
```

Initial configurable weights:

| Component | Weight |
|---|---:|
| Skills | 35% |
| Experience | 20% |
| Responsibilities | 20% |
| Preferences | 10% |
| Location | 5% |
| Education | 5% |
| Other | 5% |

Scores are internal recommendation scores, never hiring probabilities.

### Application Tracking Pipeline

```text
Discovered job
  -> saved job or application draft
  -> selected resume
  -> generated/reviewed materials
  -> user marks applied
  -> status history
  -> analytics
```

Status changes must create immutable history records. The MVP assists users and tracks applications; it does not submit applications to external platforms.

## 3. Technology Decisions

### Next.js and TypeScript

**Recommendation:** Current stable Next.js App Router release, React, and strict TypeScript, pinned in the lockfile.

**Why:** Matches the specification, combines UI and server boundaries, and deploys simply to Vercel or an equivalent platform.

**Alternatives:** Vite with Fastify/NestJS, Remix, or an immediate Next.js plus Python backend split.

**Tradeoff:** Serverless functions are not ideal for long-running processing, so expensive work must be bounded initially and moved to workers later if needed.

### Package Manager

**Recommendation:** pnpm.

**Why:** Deterministic lockfile, efficient dependency storage, and good future workspace support.

### PostgreSQL and pgvector

**Recommendation:** Managed PostgreSQL with pgvector.

**Why:** Relational constraints fit users, resumes, jobs, and applications; JSONB preserves evolving source payloads; pgvector avoids a separate vector database at MVP scale.

**Alternatives:** PostgreSQL without vectors initially, a hosted vector database, or SQLite for local development.

**Tradeoffs:** Managed pgvector availability varies. Embedding dimensions and models are migration-bound. Use PostgreSQL in development and tests to avoid SQLite behavior differences.

### ORM

**Recommendation:** Drizzle ORM and `drizzle-kit`.

**Why:** Strong TypeScript inference, visible SQL, PostgreSQL feature control, and a good fit for pgvector, JSONB, constraints, partial indexes, and native SQL.

**Alternative:** Prisma.

**Tradeoff:** Prisma has an excellent client and schema workflow, but PostgreSQL-specific vector operations and indexes may require more raw SQL and native workarounds. Choose one ORM and use it consistently.

### Authentication

**Recommendation:** Better Auth with Drizzle integration and database-backed sessions.

**Why:** Avoids custom authentication and fits a self-owned PostgreSQL user model.

**Alternative:** Auth.js.

**Tradeoff:** Both introduce framework coupling. Production credentials authentication also requires email verification and password reset support.

### File Storage

**Recommendation:** Private S3-compatible object storage, preferably Cloudflare R2 for a low-cost MVP.

**Why:** Private objects, signed URLs, serverless compatibility, and easy future migration.

**Alternatives:** Vercel Blob, AWS S3, Supabase Storage, or local disk for development only.

Store object keys, not public URLs, in PostgreSQL. All storage access goes through a storage adapter.

### AI Providers

**Recommendation:** A small internal `AIProvider` interface with one initial production adapter. Gemini is a cost-focused candidate; OpenAI is a strong alternative for broad structured-output and embedding support. Final provider selection occurs before the AI phase.

**Why:** Prevents vendor-specific types from spreading and enables test doubles, provider changes, and controlled fallback behavior.

**Tradeoff:** Automatic fallback can change quality and embedding compatibility. Text fallback may be configured explicitly; embedding models must remain stable for a vector index.

### Resume Parsing

**Recommendation:** Node-only extraction for the MVP using maintained PDF and DOCX libraries plus file-signature detection. Define an extractor interface so Python can be introduced later.

**Why:** Keeps the MVP in one deployable runtime and avoids a second service.

**Alternative:** Python with PyMuPDF and `python-docx`.

**Tradeoff:** Python may improve extraction quality and OCR options, but adds another runtime, deployment, and security boundary. Scanned PDFs remain a later OCR concern.

### Background Jobs

**Recommendation:** Start synchronously for bounded work. Add a PostgreSQL-backed `processing_jobs` table and scheduled worker endpoint when latency or reliability requires it. Do not add Redis initially.

**Alternatives:** Inngest, Trigger.dev, QStash, Redis/BullMQ, or a dedicated worker service.

**Tradeoff:** Database jobs require leases, retries, and idempotency. Managed workflow tools simplify operations but add cost/vendor dependency.

### Validation

**Recommendation:** Zod at every TypeScript boundary plus PostgreSQL constraints.

Validate environment variables, form input, route parameters, query strings, JSON, multipart metadata, external source payloads, AI output, and stored JSON before reuse.

### Rate Limiting

**Recommendation:** Layered limits: IP limits for anonymous auth, per-user quotas for uploads and AI operations, source-specific outbound throttling, and global provider budgets.

Use PostgreSQL for MVP quotas. In-memory limiting is not correct across serverless instances; Redis is deferred until scale requires it.

## 4. Proposed Folder Structure

```text
ai-job-hunter/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   ├── (auth)/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── resumes/
│   │   │   ├── profile/
│   │   │   ├── preferences/
│   │   │   ├── jobs/
│   │   │   ├── saved/
│   │   │   ├── applications/
│   │   │   └── settings/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── auth/
│   │   ├── resumes/
│   │   ├── profiles/
│   │   ├── jobs/
│   │   ├── applications/
│   │   └── dashboard/
│   ├── server/
│   │   ├── auth/
│   │   ├── db/
│   │   │   ├── schema/
│   │   │   ├── migrations/
│   │   │   └── repositories/
│   │   ├── services/
│   │   ├── ai/
│   │   │   ├── providers/
│   │   │   ├── prompts/
│   │   │   └── contracts/
│   │   ├── resume/extractors/
│   │   ├── jobs/
│   │   │   ├── sources/
│   │   │   ├── normalization/
│   │   │   └── deduplication/
│   │   ├── matching/
│   │   ├── storage/
│   │   ├── rate-limit/
│   │   ├── observability/
│   │   └── security/
│   ├── shared/
│   │   ├── validation/
│   │   ├── contracts/
│   │   ├── constants/
│   │   └── utils/
│   └── env.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   ├── fixtures/
│   └── evaluation/
├── scripts/
├── public/
├── drizzle.config.ts
├── next.config.ts
├── components.json
├── eslint.config.mjs
├── playwright.config.ts
├── vitest.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── package.json
├── pnpm-lock.yaml
├── README.md
├── PROJECT_SPEC.md
├── IMPLEMENTATION_PLAN.md
└── opencode.json
```

## 5. Database Design

All timestamps use `timestamptz`. User-owned records use UUID primary keys and ownership-filtered queries. Money uses `numeric(14,2)` plus ISO currency and period. JSONB stores raw external records and versioned structured snapshots. Vector dimensions are fixed by the selected embedding model.

### Authentication

#### `users`

Identity and user metadata.

- `id uuid` primary key
- `email text` and `email_normalized text`, with unique normalized email
- `email_verified boolean`
- `name text` nullable
- `image_url text` nullable
- `created_at`, `updated_at timestamptz`

#### `sessions`

Database-backed sessions.

- `id` primary key
- `user_id uuid` foreign key to `users`, cascade delete
- unique `token_hash`
- `expires_at timestamptz`
- optional IP and user-agent metadata
- timestamps

Indexes: user/expiry and expiry cleanup.

#### `accounts`

Better Auth credential/OAuth account records.

- `id` primary key
- `user_id` foreign key
- `provider_id`, `account_id`
- nullable password/access/refresh token fields as required by the auth adapter
- unique `(provider_id, account_id)`
- timestamps

#### `verifications`

Email verification and password-reset records.

- `id` primary key
- `identifier`
- `value_hash`
- `expires_at`
- `created_at`

### Resume and Candidate Data

#### `resumes`

Resume versions, private storage metadata, extraction state, and source text.

- `id uuid` primary key
- `user_id uuid` foreign key to `users`, cascade delete
- display/original filename fields
- `storage_key text` unique
- media type, byte size, SHA-256
- `version integer`
- `status resume_status`
- nullable `raw_text`, `parsed_data jsonb`, parser version
- nullable embedding and embedding model
- nullable safe failure code
- timestamps

Indexes: `(user_id, created_at desc)`, `(user_id, status)`, and unique `(user_id, version)`. Never return raw text in list responses.

#### `candidate_profiles`

Structured candidate profiles, with one active profile per user.

- `id uuid` primary key
- `user_id uuid` foreign key
- nullable source resume foreign key, set null
- name, email, phone, location, country, summary
- `years_experience numeric(4,1)`
- `is_active boolean`
- schema version
- nullable embedding and embedding model
- timestamps

Partial unique index: one active profile per user. Check nonnegative experience.

#### `candidate_skills`

Skills with provenance.

- `id`, `profile_id` foreign key cascade
- display and normalized name
- category
- source (`RESUME`, `USER`, `AI_INFERENCE`)
- evidence, confidence, verified flag
- timestamps

Unique `(profile_id, normalized_name, category)`. Confidence is constrained from `0` to `1`.

#### `candidate_experiences`

Structured work history with organization, title, location, dates, current flag, description, highlights, source, verification, sort order, and timestamps.

Index by profile and sort order. End date cannot precede start date.

#### `candidate_education`

Institution, qualification, field, dates, grade, description, source, verification, sort order, and timestamps.

Index by profile and sort order.

#### `candidate_projects`

Project name, description, role, URL, dates, highlights, technologies, source, verification, sort order, and timestamps.

Index by profile and sort order.

#### `candidate_certifications`

Certification name, issuer, issue/expiry dates, credential data, source, verification, sort order, and timestamps.

Index by profile and sort order.

#### `candidate_languages`

Language, proficiency, source, verification, and timestamps.

Unique `(profile_id, language)`.

#### `candidate_links`

Link type, label, URL, source, verification, and timestamps.

Unique `(profile_id, url)`.

### Preferences

#### `job_preferences`

Named search profiles.

- `id`, `user_id`
- name and active flag
- workplace modes, locations JSONB
- salary range, currency, period
- maximum experience
- employment types
- excluded keywords
- preferred companies
- scoring weights JSONB
- timestamps

Unique `(user_id, name)` and one active profile per user. Validate weights sum to `1.0` in the service.

#### `preference_roles`

Target role, normalized role, priority, and timestamps. Unique per preference and normalized role.

#### `preference_skills`

Preferred skill, normalized skill, weight, and timestamps. Unique per preference and normalized skill.

### Jobs and Ingestion

#### `job_sources`

Configured source definitions: adapter type, display name, unique slug, configuration JSONB, enabled flag, last success/failure timestamps, and timestamps.

#### `job_ingestion_runs`

Source, status, start/completion times, fetched/created/updated/duplicate/failed counts, cursor, error code, and creation time.

Indexes by source/time and status/time.

#### `jobs`

Canonical normalized jobs.

- Company and normalized company
- Title and normalized title
- Description
- Responsibilities, requirements, and skills JSONB
- Location and normalized location
- Country
- Workplace and employment type
- Experience range
- Salary range, currency, period
- Canonical application URL
- Published/expiry timestamps
- Active status
- Normalization version and content hash
- Nullable embedding and embedding model
- timestamps

Indexes: URL hash, status/publication time, normalized company/title/location, content hash, filter fields, full-text GIN index, and a later HNSW vector index.

#### `job_source_records`

Preserves each source representation and allows multiple source records for one canonical job.

- `id`, `job_id`, `source_id`
- `source_job_id`
- source/application/canonical URLs
- raw JSONB and raw hash
- first/last seen timestamps
- source updated timestamp
- active flag

Unique `(source_id, source_job_id)`. Index job and source/last-seen.

### Matching, Saved Jobs, and Feedback

#### `job_matches`

Persisted recommendation results.

- User, job, profile, and preference foreign keys
- Overall and component scores
- Vector similarity
- Strengths, partial matches, gaps, explanation JSONB
- Recommendation text
- Weights, algorithm version, AI provider/model
- timestamps

Scores are constrained from `0` to `100`. Index user/score and user/time. Uniqueness includes user, job, profile, preference, and algorithm version.

#### `saved_jobs`

User/job bookmark with timestamps. Unique `(user_id, job_id)`.

#### `user_feedback`

User, job, optional match, feedback type, reason, bounded comment, and timestamp. Index user/time and job/type.

### Applications

#### `applications`

Current application state.

- User/job/resume foreign keys
- status
- source URL
- applied and next-action timestamps
- notes
- timestamps

Unique `(user_id, job_id)`. Index user/status/time and next action.

#### `application_status_events`

Immutable application history: application, from/to status, actor, note, occurrence time.

Index application/time and status/time.

#### `application_materials`

Versioned cover letters and resume recommendations: application, type, version, content, structured content, source facts, generation status, provider/model, prompt version, review time, and timestamps.

Unique `(application_id, type, version)`.

#### `screening_answers`

Application, question, suggested and final answers, source facts, AI-generated flag, review time, and timestamps.

### Processing and Audit

#### `processing_jobs`

Database-backed asynchronous tasks with type, status, owner, entity reference, payload, attempts, availability, lock/lease fields, safe error code, completion time, and timestamps.

Indexes by status/availability and entity. Use leases, `FOR UPDATE SKIP LOCKED`, retry limits, and idempotency keys.

#### `usage_counters`

Per-user operation quotas by scope and period. Unique user/scope/period.

#### `audit_events`

Sensitive action trail containing user, action, resource, outcome, request ID, hashed IP if used, safe metadata, and timestamp. Never store full resumes, tokens, prompts, or sensitive answers.

## 6. API Design

All requests require boundary validation. Use JSON for normal endpoints and multipart form data for uploads. IDs are validated UUIDs, lists use cursor pagination, and internal details are replaced by safe error messages.

### Authentication

Better Auth owns `/api/auth/*` routes for email signup, sign-in, sign-out, session lookup, verification, and password reset. Use secure cookies, generic errors, and rate limits.

### Resume Endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/resumes` | Upload PDF/DOCX and initiate processing | Required |
| `GET` | `/api/resumes` | List safe resume metadata | Required |
| `GET` | `/api/resumes/:id` | Get resume processing/result metadata | Required + owner |
| `GET` | `/api/resumes/:id/status` | Poll safe processing state | Required + owner |
| `DELETE` | `/api/resumes/:id` | Delete file and extracted data | Required + owner |
| `POST` | `/api/resumes/:id/reprocess` | Retry eligible processing | Required + owner |

Upload validation includes actual file signature, size, format, count quota, filename length, and non-empty content. Errors include `400`, `413`, `415`, `422`, `429`, and `503` as appropriate.

### Profile Endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/profiles` | List profiles | Required |
| `GET` | `/api/profiles/:id` | Get complete editable profile | Required + owner |
| `PATCH` | `/api/profiles/:id` | Edit profile and child facts | Required + owner |
| `POST` | `/api/profiles/:id/activate` | Activate profile | Required + owner |

Edits become verified user facts. Validate fields, dates, URLs, normalized uniqueness, provenance, and completeness for activation.

### Preference Endpoints

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/preferences` | List search profiles | Required |
| `POST` | `/api/preferences` | Create search profile | Required |
| `GET` | `/api/preferences/:id` | Get profile | Required + owner |
| `PUT` | `/api/preferences/:id` | Replace profile | Required + owner |
| `DELETE` | `/api/preferences/:id` | Delete profile | Required + owner |
| `POST` | `/api/preferences/:id/activate` | Activate profile | Required + owner |

Validate role/skill arrays, locations, employment types, currency, salary, experience, exclusions, duplicates, and scoring weights.

### Jobs and Matches

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/jobs` | Search normalized jobs and match summaries | Required |
| `GET` | `/api/jobs/:id` | View job details and source links | Required |
| `POST` | `/api/jobs/:id/match` | Calculate or refresh match | Required |
| `GET` | `/api/matches` | List user matches | Required |
| `GET` | `/api/matches/:id` | View score breakdown and explanation | Required + owner |
| `POST` | `/api/jobs/:id/save` | Save a job | Required |
| `DELETE` | `/api/jobs/:id/save` | Unsave a job | Required |
| `GET` | `/api/saved-jobs` | List saved jobs | Required |
| `POST` | `/api/jobs/:id/feedback` | Record explicit feedback | Required |

Job search validates all filters, sorting allowlists, pagination, and ranges. Matching validates user-owned profile/preferences and can return `202` when queued. Scores are always labeled internal recommendation scores.

### Applications and Materials

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/applications` | List or group applications | Required |
| `POST` | `/api/applications` | Create application | Required |
| `GET` | `/api/applications/:id` | Application workspace | Required + owner |
| `PATCH` | `/api/applications/:id` | Edit application fields | Required + owner |
| `POST` | `/api/applications/:id/status` | Perform status transition | Required + owner |
| `DELETE` | `/api/applications/:id` | Delete application | Required + owner |
| `POST` | `/api/applications/:id/cover-letters` | Generate cover-letter draft | Required + owner |
| `POST` | `/api/applications/:id/tailored-resume-recommendations` | Generate truthful recommendations | Required + owner |
| `GET` | `/api/applications/:id/materials` | List material versions | Required + owner |
| `PATCH` | `/api/applications/:id/materials/:materialId` | Save material edits/review | Required + owner |
| `POST` | `/api/applications/:id/screening-answers` | Suggest editable answers | Required + owner |

Validate job/resume ownership, status transitions, content lengths, source facts, user quotas, and generation state. Generation endpoints must never submit applications.

### Dashboard and Internal Operations

| Method | Route | Purpose | Auth |
|---|---|---|---|
| `GET` | `/api/dashboard/summary` | Dashboard funnel metrics | Required |
| `GET` | `/api/processing-jobs/:id` | Poll owned processing job | Required + owner |
| `POST` | `/api/internal/ingestion/run` | Run scheduled ingestion | Cron/service auth |
| `POST` | `/api/internal/jobs/process` | Claim/process queued work | Cron/service auth |

Internal endpoints must not accept normal browser sessions as their only authentication mechanism.

## 7. AI Architecture

### Resume Extraction

1. Validate file signature and document structure.
2. Extract text without executing macros or embedded active content.
3. Normalize whitespace and preserve evidence locations.
4. Detect sections deterministically.
5. Request strict structured extraction.
6. Validate with Zod and verify evidence snippets against extracted text.
7. Store a draft profile with source, evidence, confidence, and verification state.

Distinguish explicitly stated candidate skills, AI-inferred skills, and job-required skills. Inference never silently becomes a verified fact.

### Job Normalization

Map source fields deterministically first. AI may help extract requirements, responsibilities, skills, experience, and workplace mode from unstructured descriptions, but source-supplied title, company, URL, salary, and dates remain authoritative where present.

Retain raw source payloads separately from normalized data.

### Embeddings and Vector Search

Generate embeddings for candidate profiles, resumes, and canonical jobs. Do not include unnecessary PII. Store model and input-construction versions. Never mix vector models in one index.

Use pgvector cosine similarity as one ranking component alongside PostgreSQL filters and full-text search. Vector similarity is never the only score.

### Hybrid Matching

Apply hard exclusions, deterministic skill/experience/location/preference comparisons, embeddings, and optional structured semantic evaluation. Missing optional information is unknown, not an automatic mismatch. Salary without a comparable currency/period is unknown rather than a failure.

Persist component scores, evidence, weights, provider/model versions, and algorithm version.

### Match Explanations

Build an evidence object containing matched skills, partial skills, missing requirements, experience comparison, location comparison, and preference conflicts. Render explanations from that object. Any AI wording is constrained to the evidence object.

### Application Materials

Cover letters, resume recommendations, and screening-answer suggestions use verified candidate facts only. Every generated record stores fact references, prompt/model versions, and a user-review state. Output is editable and labeled AI-generated.

### Hallucination Controls

- Store provenance, evidence, confidence, and verification for candidate facts.
- Send only the necessary verified facts to generation calls.
- Require structured output and validate it.
- Check names, dates, numbers, employers, skills, and qualifications against an allowed fact set.
- Treat resume/job text as untrusted data and defend against prompt injection.
- Reject or flag unsupported claims.
- Require human review before application material is treated as approved.

## 8. Job-Source Architecture

Use a generic adapter interface with `getSourceName`, `fetchJobs`, `normalizeJob`, and `getApplicationUrl`. Each adapter owns source-specific requests, pagination, response validation, throttling, retries, and errors.

The registry enables/disables adapters by configuration. Greenhouse is the recommended first legitimate adapter; Lever follows after normalization is proven. Do not build a universal restricted-platform scraper.

Deduplicate in this order:

1. Exact source and source job ID.
2. Canonical application URL.
3. Normalized company/title/location within a publication window.
4. Content hash.
5. Similarity-assisted candidates with conservative merge decisions.

Uncertain records remain separate. Store source compliance metadata such as access method, permitted-use basis, rate limits, attribution, retention, and review date.

## 9. Security Architecture

### Authentication and Authorization

- Use library-managed password hashing and session tokens.
- Use secure, HttpOnly, SameSite cookies and Secure in production.
- Rate-limit authentication flows.
- Implement verification and password reset before production.
- Include `user_id` in every ownership query.
- Return `404` for inaccessible user-owned resources.
- Use separate service authentication for cron/worker endpoints.

### Upload and Storage Security

- Validate byte signatures, not only browser MIME types or extensions.
- Enforce byte, count, and frequency limits.
- Generate opaque storage keys.
- Keep the bucket private and use short-lived signed URLs.
- Never execute macros, scripts, or embedded executables.
- Do not render uploads inline from the application origin.
- Use extraction timeouts and memory/decompression protections.
- Add malware scanning before production if threat exposure requires it.

### API and Database Security

- Validate body, path, query, headers, and external responses.
- Allowlist sorting/filtering fields.
- Use parameterized ORM queries.
- Use TLS and least-privilege database roles.
- Use transactions for activation, ingestion, status changes, and profile replacement.
- Add request IDs, safe errors, timeouts, and idempotency for retryable mutations.

### AI, PII, and Browser Security

- Keep keys server-side and never use `NEXT_PUBLIC_` for secrets.
- Minimize data sent to AI providers and document provider retention.
- Do not log resumes, passwords, keys, tokens, or sensitive answers.
- Render job and AI content as plain text by default.
- Sanitize any future rich text.
- Add CSP and secure headers.
- Use SameSite cookies and origin checks for state-changing requests.
- Audit sensitive actions without sensitive payloads.

## 10. Development Phases

### Phase 1: Project Foundation

**Objective:** Create a minimal strict Next.js application without product features.

**Modules:** package manifest, lockfile, `src/app`, shared utilities, configs, `.env.example`, `.gitignore`, README.

**Dependencies:** Next.js, React, TypeScript, Tailwind, ESLint, Prettier, Zod, Vitest, Testing Library.

**Tasks:** Initialize App Router with `src/`; enable strict TypeScript; configure styling, linting, formatting, environment validation, test runner, and server/client boundaries; add a neutral shell and smoke test.

**Tests:** lint, typecheck, unit test runner, production build.

**Acceptance:** The shell renders and all four verification commands pass. No database, auth, AI, job-source, resume, or placeholder product implementation is added.

### Phase 2: Database

**Objective:** Add PostgreSQL, pgvector, Drizzle, migrations, and core schema.

**Tasks:** Choose local/managed workflow; enable pgvector; add domain schema; constraints/indexes; typed client; migration scripts; database test helpers.

**Tests:** Empty-database migration, constraints, vector query, repository connection.

**Acceptance:** Fresh migration succeeds and vector support works.

### Phase 3: Authentication

**Objective:** Add signup, login, logout, sessions, and protected routes.

**Tasks:** Configure Better Auth; add forms; session retrieval; `requireUser`; protected route group; safe errors; rate-limit boundary; verification/reset plan.

**Tests:** Signup, login, logout, bad credentials, expired sessions, protected routes, duplicate account, ownership.

**Acceptance:** Protected routes and secure sessions work without custom password hashing.

### Phase 4: Resume Upload and Parsing

**Objective:** Securely store PDF/DOCX and extract clean text.

**Tasks:** Storage adapter; quotas; signatures; SHA-256; metadata; extraction states; cleaning; safe failures; deletion.

**Tests:** Valid files, spoofed MIME, wrong extension, oversize, corrupt/empty files, ownership, storage failure, deletion.

**Acceptance:** Valid files process; invalid files fail safely; files remain private.

### Phase 5: Candidate Profile

**Objective:** Generate, validate, edit, and activate structured profiles.

**Tasks:** Extraction contract; provider interface/adapter; structured drafts; evidence validation; normalized child records; editor; activation; versions.

**Tests:** Valid/malformed output, unsupported claims, inference handling, duplicate skills, dates, ownership, edit/activate.

**Acceptance:** Drafts are editable, provenance is retained, and unsupported output is rejected.

### Phase 6: Job Preferences

**Objective:** Add named, active search profiles and constraints.

**Tasks:** Roles, locations, modes, salary, experience, employment types, skills, exclusions, companies, scoring weights.

**Tests:** Validation, normalization, weight totals, ownership, active uniqueness.

**Acceptance:** Users can create, edit, delete, and activate valid preferences.

### Phase 7: Job-Source Adapters

**Objective:** Establish source-independent ingestion with one permitted source.

**Tasks:** Generic types, registry, Greenhouse adapter, payload validation, pagination, timeout/retry/throttling, source enablement, run records.

**Tests:** Contract fixtures, malformed payloads, pagination, timeout, rate limit, disabled source.

**Acceptance:** Core ingestion has no source-specific dependency.

### Phase 8: Normalization and Deduplication

**Objective:** Persist canonical jobs and safely merge duplicates.

**Tasks:** Normalized contract; raw/source records; canonicalization; ordered deduplication; inactive records; idempotency; full-text index.

**Tests:** Repeated ingestion, updates, duplicate URLs, same title/different requisition, collisions, transaction failure.

**Acceptance:** Repeated ingestion creates no duplicates and raw data remains available.

### Phase 9: AI Matching

**Objective:** Produce versioned, explainable hybrid scores.

**Tasks:** Stable embedding inputs; embeddings; deterministic scorers; vector similarity; optional semantic evaluator; weighted aggregation; evidence; stale detection.

**Tests:** Score fixtures, missing data, required/preferred skills, inferred skills, exclusions, unknown salary, vector mismatch, bounds, weight changes.

**Acceptance:** Matching works without free-form AI and every component is independently testable.

### Phase 10: Job Discovery UI

**Objective:** Deliver searchable jobs, cards, details, and explanations.

**Tasks:** Server-rendered list, filters, pagination, responsive cards, detail page, source links, empty/error/processing states.

**Tests:** Accessibility, query validation, pagination, states, mobile E2E.

**Acceptance:** Users can discover jobs and understand recommendation scores.

### Phase 11: Saved Jobs

**Objective:** Add reliable bookmark behavior.

**Tasks:** Save/unsave endpoints, saved state DTOs, saved list, feedback signal.

**Tests:** Duplicate save, idempotent unsave, ownership, concurrency, UI state.

**Acceptance:** Repeat actions are safe and users see only their own saved jobs.

### Phase 12: Application Tracker

**Objective:** Track applications with immutable history.

**Tasks:** Create applications; transition policy; transactional events; notes; next actions; resume selection; accessible board/list.

**Tests:** Creation, duplicates, transition matrix, concurrent updates, ownership, history, keyboard interaction.

**Acceptance:** Current status and history remain consistent.

### Phase 13: AI Application Assistant

**Objective:** Generate truthful editable materials.

**Tasks:** Verified fact allowlist; cover letters; claim checks; resume recommendations; screening suggestions; versioning; review labels.

**Tests:** Fabricated claims, entity/date/number checks, prompt injection, missing evidence, malformed output, versioning, quotas.

**Acceptance:** Output uses approved facts only, is editable and labeled, and never submits externally.

### Phase 14: Dashboard Analytics

**Objective:** Provide accurate funnel metrics.

**Tasks:** Aggregate discovered, matched, saved, applied, interview, offer, rejection counts; date filters; explicit denominators; event-based history; score calibration only with enough data.

**Tests:** Empty account, date boundaries, status changes, zero denominators, timezones, known fixtures.

**Acceptance:** Metrics reconcile with source records.

### Phase 15: Background Processing

**Objective:** Move expensive retryable work to reliable database-backed processing.

**Tasks:** Claim/lease; idempotency; retry/backoff; dead-letter state; parsing/embedding/matching/ingestion handlers; progress; cron authentication; stale-lock recovery.

**Tests:** Concurrent claims, worker crash, lease expiry, retries, poison jobs, idempotency, cron auth.

**Acceptance:** Work is not processed concurrently twice and recovers safely.

### Phase 16: Security Hardening

**Objective:** Complete security and privacy review.

**Tasks:** CSP/headers; IDOR audit; quotas; CSRF/origin review; XSS and URL review; PII redaction; deletion; storage/database permissions; secret/dependency scans; privacy disclosures.

**Tests:** IDOR, CSRF, XSS, upload bypasses, rate limits, error leakage, logs, scans.

**Acceptance:** No known high-severity issue remains.


# Phase 17 — Gmail / Google OAuth Integration
Objective

Allow users to securely connect their Gmail account.

Build
Google OAuth flow
Gmail connection page
OAuth callback
Connected account management
Encrypted access/refresh token storage
Token refresh
Gmail disconnect/revoke
Connection status
Architecture
User
 ↓
Connect Gmail
 ↓
Google OAuth
 ↓
OAuth Callback
 ↓
Connected Account
 ↓
Encrypted Tokens
 ↓
Gmail Service
Gmail Service
src/server/gmail/

gmail-oauth.ts
gmail-client.ts
gmail-service.ts
types.ts
APIs
GET  /api/gmail/status
GET  /api/gmail/connect
GET  /api/gmail/callback
POST /api/gmail/disconnect
Important

Do not store Google passwords.

Do not expose Gmail tokens to the client.

Request only the Gmail scopes required for reading relevant messages and sending approved emails.

# Phase 18 — Gmail Email Sync
Objective

Retrieve job-related emails without scanning/storing the entire mailbox unnecessarily.

Build
Gmail
 ↓
Search relevant messages
 ↓
Fetch message metadata/content
 ↓
Normalize email
 ↓
Store required metadata
 ↓
Process

Create:

email_messages
email_threads

Fields should include:

userId
providerMessageId
threadId
sender
recipient
subject
receivedAt
classification
processedAt

Store email body only when genuinely required.

# Phase 19 — AI Email Classification

Classify incoming job-related emails.

Categories
APPLICATION_CONFIRMATION
INTERVIEW_INVITATION
ASSESSMENT
REJECTION
OFFER
RECRUITER_MESSAGE
APPLICATION_FOLLOW_UP
OTHER

Pipeline:

Email
 ↓
Relevant?
 ↓
AI Classification
 ↓
Structured JSON
 ↓
Zod Validation
 ↓
Confidence

Example:

{
  "category": "INTERVIEW_INVITATION",
  "company": "ABC Technologies",
  "role": "Frontend Developer",
  "confidence": 0.97
}

Email content must be treated as untrusted input and must never override AI/system instructions.

# Phase 20 — Email → Application Matching

Connect detected emails to existing applications.

Matching priority:

Application/reference ID
 ↓
Exact company + role
 ↓
Company + sender domain
 ↓
Job URL
 ↓
AI-assisted ambiguous matching

If confidence is low:

Possible application match

[Confirm]
[Ignore]

Never silently attach an unrelated email to an application.

# Phase 21 — Automatic Application Status Updates

When a relevant email is confirmed/classified:

APPLICATION_CONFIRMATION
        ↓
Applied

ASSESSMENT
        ↓
Assessment

INTERVIEW_INVITATION
        ↓
Interview

REJECTION
        ↓
Rejected

OFFER
        ↓
Offer

Every change must create an immutable application event.

Existing application history infrastructure should be reused, not duplicated.

# Phase 22 — Email Intelligence UI

Add:

/dashboard/emails

Display:

Recent Job Emails

✓ Application confirmation
✓ Interview invitation
⚠ Assessment
✕ Rejection
🎉 Offer

Each email:

Company
Role
Category
Confidence
Date
Related Application

For uncertain results:

Possible Interview Email

[Confirm]
[Ignore]
# Phase 23 — Recruiter / Hiring Contact Intelligence
Objective

Allow the user to associate legitimate professional contacts with jobs.

Sources can include:

contact information present in the job posting
publicly available company information
user-provided contacts

Do not build mass personal-email harvesting.

New entity
contacts

Fields:

id
userId
jobId
company
name
role
email
source
confidence
createdAt

Possible roles:

Recruiter
Talent Acquisition
Hiring Manager
HR
# Phase 24 — Outreach Management

Add:

/dashboard/outreach

Sections:

Contacts
Drafts
Sent
Follow-ups
Responses

Create:

outreach_messages
outreach_events

Message fields:

userId
contactId
jobId
applicationId
subject
body
status
providerMessageId
sentAt
createdAt
updatedAt

Statuses:

DRAFT
READY
SENT
REPLIED
FOLLOW_UP
CLOSED
# Phase 25 — AI Recruiter Outreach Generator

Input:

Job
+
Candidate verified profile
+
Relevant experience
+
Recruiter/contact

Output:

Subject
Body

Rules:

only verified candidate facts
no fabricated experience
no fake achievements
no misleading claims
personalized to the job
editable by user

Store:

model
promptVersion
sourceFacts
generatedAt
# Phase 26 — Outreach Review + Gmail Send

Flow:

Generate
 ↓
Draft
 ↓
User reviews
 ↓
User edits
 ↓
User clicks Send
 ↓
Gmail API
 ↓
Sent

API:

POST /api/outreach/:id/send

Before sending verify:

Authenticated user
↓
Owns outreach
↓
Gmail connected
↓
Message status = READY
↓
Rate limit
↓
Send

AI must never silently send emails.

# Phase 27 — Recruiter Response Detection

When a recruiter replies:

Gmail
 ↓
Thread matching
 ↓
Detect outreach response
 ↓
AI classification
 ↓
Update outreach

Categories:

POSITIVE
NEGATIVE
NEUTRAL
REQUEST_FOR_INFORMATION
INTERVIEW
OTHER

Update:

SENT → REPLIED

If interview:

REPLIED → INTERVIEW
# Phase 28 — Follow-up Assistant

Optional follow-up workflow:

Outreach sent
 ↓
X days
 ↓
No response
 ↓
Generate follow-up
 ↓
User reviews
 ↓
Send

Add configurable limits.

Example:

Maximum follow-ups: 1

No unlimited automated emailing.

# Phase 29 — Unified Application Communication Timeline

Upgrade the existing application page.

Example:

APPLICATION TIMELINE

Aug 20
Job discovered

Aug 21
Application created

Aug 21
Applied

Aug 23
Application confirmation received

Aug 27
Recruiter outreach sent

Aug 29
Recruiter replied

Sep 01
Interview invitation

Combine:

Application events
+
Gmail events
+
Outreach events

into one chronological timeline.

# Phase 30 — Expanded Dashboard

Extend the existing dashboard.

New metrics:

Unread Job Emails
Pending Outreach
Follow-ups
Recruiter Replies
Upcoming Interviews

Dashboard sections:

Recent Applications
Recent Job Emails
Recent Recruiter Activity
Pending Follow-ups
Upcoming Interviews

Reuse the existing analytics infrastructure.

# Phase 31 — Admin Dashboard

Create:

/admin

Admin sections:

Overview
Users
Jobs
Job Sources
Processing
AI Usage
Gmail Connections
Outreach
System Health
Audit Logs
# Phase 32 — Admin Users

Display:

User
Email
Created
Last Active
Resume Count
Applications
Gmail Connected
Status

Actions:

Enable
Disable

Admins must not have unrestricted access to:

Gmail contents
OAuth tokens
Private resumes
# Phase 33 — Admin Job Sources

Display:

Source
Status
Last Sync
Jobs Found
Jobs Added
Duplicates
Errors

Actions:

Enable
Disable
Retry

Reuse existing ingestion infrastructure.

# Phase 34 — Admin Processing Monitor

Display:

Job Type
Status
Attempts
Created
Started
Completed
Error

Actions:

Retry failed job

Reuse existing processing_jobs.

# Phase 35 — Admin AI Usage

Display:

Resume Parsing
Job Matching
Embeddings
Cover Letters
Email Classification
Outreach Generation

Metrics:

Requests
Failures
Latency
Estimated usage/cost

Do not store sensitive prompts just for analytics.

# Phase 36 — Admin Gmail / Outreach Monitoring

Display operational metadata:

Gmail connections
Successful syncs
Failed syncs
Emails classified
Emails requiring review
Outreach sent
Outreach failures

Never expose mailbox content.

 # Phase 37 — Admin System Health
Database       ✓
AI Provider    ✓
Storage        ✓
Gmail API      ✓
Job Sources    ✓
Workers        ✓

Include:

Last successful job sync
Last Gmail sync
Last worker execution
Failed processing jobs
API errors
# Phase 38 — Expanded Audit Logs

Extend the existing audit system with:

GMAIL_CONNECTED
GMAIL_DISCONNECTED

EMAIL_CLASSIFIED
EMAIL_LINKED_TO_APPLICATION

OUTREACH_CREATED
OUTREACH_APPROVED
OUTREACH_SENT

ADMIN_USER_DISABLED
ADMIN_USER_ENABLED
ADMIN_SOURCE_ENABLED
ADMIN_SOURCE_DISABLED

Never log:

OAuth tokens
Passwords
Full Gmail bodies
Private resume contents
API secrets
# Phase 39 — Gmail Security Review

New security review specifically for Gmail:

OAuth state validation
Redirect URI validation
Token encryption
Token refresh
Token revocation
Account ownership
Email-send authorization
Gmail rate limits
Email prompt injection
Sensitive-data logging
Admin isolation

Test:

User A cannot access User B Gmail
User A cannot send through User B Gmail
Disconnected Gmail cannot be used
Expired tokens are handled correctly
# Phase 40 — Final Testing

Add to your existing testing plan:

Gmail
OAuth flow
Token refresh
Disconnect
Message sync
Classification
Application matching
Outreach
Draft
Review
Send
Duplicate send
Gmail failure
Rate limit
Response detection
Admin
Admin authorization
Non-admin rejection
IDOR
Audit logging
Sensitive-data isolation
Full E2E
Signup
 ↓
Resume
 ↓
Profile
 ↓
Preferences
 ↓
Find Job
 ↓
Match
 ↓
Application
 ↓
Connect Gmail
 ↓
Application email detected
 ↓
Tracker updated
 ↓
Recruiter contact
 ↓
AI outreach
 ↓
User review
 ↓
Gmail send
 ↓
Recruiter reply
 ↓
Reply detected
 ↓
Timeline updated

### Phase 41: Testing

**Objective:** Complete confidence and CI coverage.

**Tasks:** Unit coverage; PostgreSQL integration suite; Playwright journey; source/provider fixtures; AI evaluation thresholds; accessibility scans; CI gates; flake removal.

**Tests:** Full unit, integration, E2E, security, and evaluation suites.

**Acceptance:** Clean checkout CI passes and the critical journey succeeds.

### Phase 42: Deployment

**Objective:** Deploy and operate the MVP.

**Tasks:** Staging/production environments; controlled migrations; private storage; cron; health checks; monitoring; budgets; backup/restore test; runbook; smoke tests.

**Acceptance:** Signup through application tracking works in production without requiring a VPS.

## 11. Environment Variables

### Core

- `NODE_ENV`: runtime environment.
- `APP_URL`: canonical server URL.
- `NEXT_PUBLIC_APP_URL`: public URL when client-side absolute links are necessary.
- `LOG_LEVEL`: structured logging threshold.

### Database

- `DATABASE_URL`: runtime PostgreSQL connection.
- `DATABASE_MIGRATION_URL`: direct connection for migrations.
- `DATABASE_SSL_MODE`: provider-specific TLS mode.
- `EMBEDDING_DIMENSIONS`: schema/model compatibility check.

### Authentication

- `AUTH_SECRET`: auth signing/encryption secret.
- `AUTH_TRUSTED_ORIGINS`: production browser origins.
- `EMAIL_FROM`: verification/reset sender.
- `EMAIL_PROVIDER_API_KEY`: transactional email credential.
- OAuth client ID/secret variables only when a provider is enabled.

### Storage

- `STORAGE_PROVIDER`
- `STORAGE_ENDPOINT`
- `STORAGE_REGION`
- `STORAGE_BUCKET`
- `STORAGE_ACCESS_KEY_ID`
- `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_FORCE_PATH_STYLE`
- `RESUME_MAX_FILE_BYTES`
- `RESUME_MAX_FILES_PER_USER`
- `SIGNED_URL_TTL_SECONDS`

### AI

- `AI_TEXT_PROVIDER`
- `AI_TEXT_MODEL`
- `AI_EMBEDDING_PROVIDER`
- `AI_EMBEDDING_MODEL`
- `AI_REQUEST_TIMEOUT_MS`
- `AI_MAX_RETRIES`
- `AI_DAILY_USER_QUOTA`
- Provider-specific keys such as `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `GROQ_API_KEY` only when enabled.

### Job Sources

- `JOB_SOURCE_GREENHOUSE_ENABLED`
- `JOB_SOURCE_GREENHOUSE_BOARDS`
- `JOB_SOURCE_LEVER_ENABLED`
- `JOB_SOURCE_LEVER_SITES`
- `JOB_INGESTION_BATCH_SIZE`
- `JOB_INGESTION_REQUEST_DELAY_MS`
- `JOB_RETENTION_DAYS`

### Processing

- `CRON_SECRET`
- `WORKER_BATCH_SIZE`
- `WORKER_LEASE_SECONDS`
- `WORKER_MAX_ATTEMPTS`

`REDIS_URL` is deliberately not required for the MVP.

### Observability

- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN` only for client reporting if needed
- `SENTRY_AUTH_TOKEN` for source maps
- `SENTRY_ENVIRONMENT`
- Optional OpenTelemetry exporter settings

Never commit `.env` or working credentials. `.env.example` contains names and safe descriptions only.

## 12. Testing Strategy

### Unit Tests

Use Vitest for validation, skill normalization, job normalization, URL canonicalization, deduplication, match scoring, weight aggregation, status transitions, quota logic, provenance validation, unsupported-claim checks, and analytics calculations.

Core business logic must run without databases, networks, or React.

### Integration Tests

Use an isolated PostgreSQL database with pgvector. Test migrations, auth sessions, repository ownership, resume lifecycle, profile activation, preference activation, ingestion idempotency, vector queries, application status transactions, material versioning, and worker leases.

### E2E Tests

Use Playwright for signup, resume upload, processing, profile review, preferences, seeded job discovery, matching, saving, application creation, cover-letter generation with a deterministic test provider, status updates, dashboard metrics, protected routes, mobile layouts, and keyboard workflows.

### Security Tests

Test IDOR across all owned resources, CSRF/origin checks, stored/reflected XSS, malicious URLs, upload path traversal, MIME spoofing, corrupt/polyglot files, oversized/decompression-heavy files, auth brute-force limits, AI quotas, error leakage, PII/secret logs, and dependency/secret scanning.

### AI Evaluation

Maintain synthetic versioned fixtures for normal, sparse, ambiguous, contradictory, and prompt-injection resumes/jobs. Measure extraction validity, verified-fact precision, unsupported-fact rate, skill normalization, match ordering, evidence coverage, fabricated-claim rate, provider regressions, latency, and cost.

Use exact assertions for deterministic scores and rubric/structure/evidence checks for generated prose.

## 13. Deployment

Recommended MVP:

```text
Vercel Next.js application
  + managed PostgreSQL with pgvector
  + Cloudflare R2 private storage
  + one external AI provider
  + Vercel Cron for bounded jobs
  + Sentry or equivalent monitoring
```

Use staging and production separately, controlled migrations, private storage, TLS, connection pooling, cron authentication, backup/restore capability, error alerts, and AI budget alerts.

A VPS is not required unless persistent workers, self-hosted models, OCR, browser automation, continuous ingestion, Redis, or multiple backend services become necessary.

## 14. Risks and Decisions Requiring Attention

### Decisions

- Select the initial AI text and embedding providers before Phase 5.
- Confirm Better Auth production requirements for email verification and password reset.
- Confirm storage provider based on selected database/hosting ecosystem.
- Decide when Node extraction quality justifies a Python worker.
- Confirm whether profiles are one-per-user or one-per-resume. Proposed design supports multiple profiles with one active profile.
- Confirm whether deleting a resume referenced by application history removes only file/extracted data or the full history.
- Define salary conversion policy; compare only compatible currency/period values unless a versioned conversion service exists.

### Main Risks and Mitigations

| Risk | Mitigation |
|---|---|
| AI fabricates candidate facts | Provenance, evidence checks, strict schemas, allowlists, user review |
| Embedding model changes | Persist model/version, fixed dimensions, re-embedding migration |
| Incorrect job merges | Conservative deduplication and preserved source records |
| Serverless timeouts | Bounded synchronous work, then database jobs or worker extraction |
| Source format changes | Raw payload retention and adapter contract fixtures |
| Restricted source usage | Legitimate APIs/feeds only and no bypass mechanisms |
| PII exposure | Redacted logs, minimized prompts, private storage |
| IDOR | Ownership-filtered repositories and security matrix |
| Misleading scores | Recommendation-score language and component explanations |
| Duplicate workers | Leases, idempotency, transactional claiming |
| Overbuilt personalization | Collect feedback first; defer ML personalization |

## 15. Exact First Implementation Task

Initialize a minimal Next.js App Router application in the existing project root using:

- Strict TypeScript
- `src/`
- Tailwind CSS
- ESLint
- Prettier
- pnpm
- Zod-based environment validation
- Vitest
- A neutral application shell
- One foundational smoke test

Preserve `PROJECT_SPEC.md` and `opencode.json`. Do not add database, authentication, AI, job-source, resume, or placeholder product implementations in this task.

Verification commands:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 16. MVP Definition of Done

The MVP is complete when the user can register/login, upload and parse a resume, review/edit a candidate profile, configure preferences, import jobs from at least one legitimate source, normalize and deduplicate them, receive explainable matches, save jobs, create and track applications, generate a reviewed cover letter, view basic dashboard analytics, and use tested secure handling for authentication, authorization, files, secrets, errors, and core business logic.
