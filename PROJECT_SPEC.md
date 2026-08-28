# AI Job Hunter — Project Specification

## 1. Project Overview

**Project name:** AI Job Hunter  
**Project type:** AI-powered job discovery, matching, application-assistance, and tracking platform.

### Vision

Build a production-style platform that helps a job seeker:

1. Upload and understand their resume.
2. Create a structured candidate profile automatically.
3. Discover jobs from legitimate/public job sources and company career systems.
4. Match jobs against the candidate's skills, experience, preferences, and constraints.
5. Explain why a job is a good or bad match.
6. Generate job-specific application materials.
7. Assist with application form completion where technically and legally appropriate.
8. Track applications from discovery through interview/rejection/offer.
9. Continuously improve recommendations from user feedback.

### Important product principle

The platform is an **AI job application assistant**, not a blind mass-application bot.

The system should prioritize:
- legitimate job sources,
- transparent matching,
- user control,
- accurate application data,
- privacy,
- rate limits,
- source-specific rules and terms,
- human confirmation before consequential submissions where required.

Do **not** make unauthorized scraping or automated submission to LinkedIn, Indeed, or other restricted platforms a core dependency.

---

# 2. Product Goals

## Primary goals

- Reduce the time required to find relevant jobs.
- Improve job-to-candidate matching beyond simple keyword search.
- Make every match explainable.
- Generate useful, truthful application materials.
- Give users one place to manage their job search.
- Demonstrate real-world AI engineering ability.

## Secondary goals

- Support multiple resumes.
- Support different job-search profiles.
- Learn from jobs the user saves/applies/rejects.
- Provide analytics about the user's job search.
- Make the architecture extensible for additional job sources.

## Non-goals

The initial version should NOT attempt to:
- bypass CAPTCHA,
- bypass authentication/security controls,
- evade anti-bot systems,
- scrape restricted platforms aggressively,
- submit applications without user control where prohibited,
- fabricate qualifications,
- invent work experience,
- claim skills the candidate does not have.

---

# 3. Target Users

## Primary user

A student, fresher, junior developer, or professional actively looking for jobs.

## Example user

A candidate has:
- React
- Next.js
- Node.js
- PostgreSQL
- Docker
- Git/GitHub
- 1–2 years equivalent project/work experience

The candidate wants:
- Junior Frontend Developer
- Full Stack Developer
- Software Engineer

Preferred:
- Remote
- India
- Entry-level / 0–2 years
- Minimum salary configurable by user

---

# 4. Core User Journey

```text
Create Account
      ↓
Upload Resume
      ↓
Parse Resume
      ↓
Create Candidate Profile
      ↓
Review / Edit Profile
      ↓
Set Job Preferences
      ↓
Discover Jobs
      ↓
Normalize Job Data
      ↓
Calculate Match Score
      ↓
Rank Jobs
      ↓
Show Match Explanation
      ↓
Save / Reject / Apply
      ↓
Generate Tailored Materials
      ↓
Review Application
      ↓
User-controlled Application Submission
      ↓
Track Application
      ↓
Analytics + Feedback
```

---

# 5. Feature Roadmap

## Phase 1 — MVP

### Authentication
- Sign up
- Sign in
- Sign out
- Session management
- Protected routes

### Resume
- Upload PDF/DOCX
- Extract text
- Parse structured information
- Store normalized candidate profile
- Edit extracted profile
- Delete resume

### Candidate profile

Store:
- name
- email
- phone
- location
- professional summary
- skills
- technical skills
- soft skills
- education
- work experience
- projects
- certifications
- languages
- links
- years of experience

### Job preferences

User can configure:
- target roles
- locations
- remote/hybrid/on-site
- minimum salary
- maximum experience
- employment type
- preferred technologies
- excluded keywords
- preferred companies

### Job discovery

Initial sources should favor:
- public APIs
- official company career systems
- Greenhouse-powered career pages
- Lever-powered career pages
- other sources that explicitly permit the intended use

Each source must have its own adapter.

### Job normalization

Different sources must be converted into one internal format.

### Matching

Calculate:
- overall match score
- skills score
- experience score
- responsibilities score
- location score
- preference score

### Job details

Show:
- title
- company
- location
- salary if available
- employment type
- description
- requirements
- source
- original application link
- match score
- strengths
- gaps
- recommendation

### Application tracker

Statuses:
- Discovered
- Saved
- Applying
- Applied
- Assessment
- Interview
- Offer
- Rejected
- Withdrawn

---

# 6. Phase 2 — AI Application Assistant

## Tailored resume

Given:

```text
Candidate Resume
+
Job Description
```

Generate recommendations for:
- relevant experience emphasis
- relevant project emphasis
- skill ordering
- professional summary adaptation
- keyword coverage

Never invent facts.

## Cover letter

Generate a job-specific cover letter using only verified candidate information.

## Screening questions

The system can suggest answers based on:
- resume
- candidate profile
- job description

Answers must be marked as AI-generated and editable.

## Application review

Before submission:

```text
Job
Candidate
Resume version
Cover letter
Screening answers
Application fields
```

User must be able to review and edit.

---

# 7. Phase 3 — Advanced Features

## AI Job Agent

The user defines:

```text
Target roles:
Frontend Developer
Full Stack Developer

Location:
Remote
India

Experience:
0–2 years

Minimum salary:
User-defined

Technologies:
React
Next.js
Node.js

Exclude:
Internship
Unpaid
Night shift
```

The agent periodically discovers new jobs and ranks them.

## Daily recommendations

Example:

```text
17 new jobs found

94% — Frontend Engineer
91% — React Developer
89% — Full Stack Developer
87% — Software Engineer
```

## Smart notifications

Notify when:
- high-match job appears
- application deadline is approaching
- application status changes
- interview is upcoming
- user has not followed up
- a saved job changes

---

# 8. AI Matching Architecture

Do NOT rely on a single LLM prompt for matching.

Use a hybrid approach.

```text
Job Description
       ↓
Text preprocessing
       ↓
Structured extraction
       ↓
Embedding generation
       ↓
Vector similarity
       ↓
Rule-based scoring
       ↓
LLM semantic evaluation
       ↓
Final weighted score
```

## Suggested scoring model

Initial weights:

```text
Skills Match          35%
Experience Match      20%
Responsibilities      20%
Job Preferences       10%
Location              5%
Education             5%
Other                 5%
---------------------------
Total                100%
```

These weights must be configurable.

## Score categories

```text
90–100  Excellent
80–89   Strong
70–79   Good
60–69   Moderate
<60     Low
```

Do not present scores as objective truth.

Label them as an internal recommendation score.

---

# 9. Match Explanation

Every match should answer:

### Why this job matches

Example:

```text
Strong match:
- React
- Next.js
- PostgreSQL
- REST APIs

Partial match:
- TypeScript

Potential gap:
- AWS

Experience:
The candidate appears to satisfy most of the stated experience requirements.
```

The explanation must be derived from actual candidate/job data.

---

# 10. Resume Parsing

## Pipeline

```text
PDF/DOCX
   ↓
File validation
   ↓
Text extraction
   ↓
Cleaning
   ↓
Section detection
   ↓
Structured extraction
   ↓
Validation
   ↓
Candidate Profile
```

## Important

The parser should distinguish between:

- skills explicitly stated by the candidate
- skills inferred by AI
- skills required by the job

Never silently convert an inference into a verified skill.

Example:

```json
{
  "skill": "Docker",
  "source": "resume",
  "confidence": 1.0,
  "verified": true
}
```

---

# 11. Job Ingestion Architecture

Use an adapter pattern.

```text
JobSource
   ├── GreenhouseAdapter
   ├── LeverAdapter
   ├── CompanyCareerAdapter
   └── FutureSourceAdapter
```

Each adapter should expose a common interface:

```text
fetchJobs()
normalizeJob()
getSourceName()
getApplicationUrl()
```

The rest of the application must not depend directly on a specific source.

## Deduplication

Jobs can appear from multiple sources.

Use:
- source job ID where available
- canonical application URL
- normalized company + title + location
- content similarity when necessary

---

# 12. Database Design

Recommended database:

**PostgreSQL**

Recommended extension:

**pgvector**

## Core tables

### users

```text
id
email
name
created_at
updated_at
```

### resumes

```text
id
user_id
file_name
file_url
version
raw_text
parsed_data
created_at
updated_at
```

### candidate_profiles

```text
id
user_id
summary
location
years_experience
education
skills
experience
projects
certifications
links
created_at
updated_at
```

### job_preferences

```text
id
user_id
target_roles
locations
remote_preference
min_salary
max_experience
employment_types
preferred_skills
excluded_keywords
preferred_companies
created_at
updated_at
```

### jobs

```text
id
source
source_job_id
company
title
description
location
salary_min
salary_max
employment_type
application_url
published_at
expires_at
raw_data
normalized_data
embedding
created_at
updated_at
```

### job_matches

```text
id
user_id
job_id
overall_score
skills_score
experience_score
responsibilities_score
preference_score
location_score
education_score
strengths
gaps
explanation
created_at
```

### saved_jobs

```text
id
user_id
job_id
created_at
```

### applications

```text
id
user_id
job_id
resume_id
status
applied_at
last_updated_at
notes
created_at
updated_at
```

### application_materials

```text
id
application_id
type
content
version
created_at
updated_at
```

### user_feedback

```text
id
user_id
job_id
feedback_type
created_at
```

---

# 13. Vector Search

Use pgvector to store embeddings for:

- candidate profile
- resume
- job descriptions

Example:

```text
candidate_embedding
job_embedding
```

Similarity can be used as one component of ranking.

Do not use vector similarity as the only score.

---

# 14. Recommended Tech Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod

## Backend

Start with:

- Next.js Route Handlers
- Server Actions where appropriate

If processing becomes heavy:

- FastAPI/Python service

## Database

- PostgreSQL
- pgvector
- Prisma or Drizzle ORM

Choose ONE ORM and stay consistent.

## Authentication

Choose one:

- Auth.js
- Better Auth

Do not implement password hashing/authentication from scratch unless there is a strong reason.

## AI

Architecture must support multiple providers.

```text
AIProvider
   ├── GeminiProvider
   ├── OpenAIProvider
   ├── GroqProvider
   └── LocalProvider
```

The application should not hard-code one AI vendor throughout the codebase.

## Resume processing

Python:
- PyMuPDF
- python-docx

## Background jobs

For MVP:
- simple database-backed jobs

Later:
- Redis + BullMQ
- or another queue system

Do not add Redis unnecessarily in the first version.

---

# 15. Project Architecture

Recommended structure:

```text
ai-job-hunter/
│
├── app/
│   ├── (auth)/
│   ├── dashboard/
│   ├── jobs/
│   ├── applications/
│   ├── resume/
│   ├── settings/
│   ├── api/
│   └── ...
│
├── components/
│   ├── ui/
│   ├── jobs/
│   ├── resume/
│   ├── applications/
│   └── dashboard/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── ai/
│   ├── matching/
│   ├── jobs/
│   ├── resume/
│   ├── validation/
│   └── utils/
│
├── prisma/
│   └── schema.prisma
│
├── scripts/
│
├── tests/
│
├── docs/
│
├── public/
│
├── .env.example
├── README.md
├── PROJECT_SPEC.md
└── package.json
```

---

# 16. API Design

Example endpoints:

```text
POST   /api/resumes
GET    /api/resumes
GET    /api/resumes/:id
DELETE /api/resumes/:id

GET    /api/jobs
GET    /api/jobs/:id

POST   /api/jobs/:id/match
POST   /api/jobs/:id/save

GET    /api/matches
GET    /api/matches/:id

GET    /api/applications
POST   /api/applications
PATCH  /api/applications/:id

POST   /api/applications/:id/cover-letter
POST   /api/applications/:id/tailored-resume

GET    /api/preferences
PUT    /api/preferences
```

Validate every request with Zod or equivalent schema validation.

---

# 17. Security Requirements

This is a job platform handling sensitive personal information.

## Must implement

- authentication
- authorization
- server-side validation
- input sanitization
- secure file upload
- file type validation
- file size limits
- rate limiting
- secure cookies/session handling
- CSRF protection where applicable
- protection against IDOR
- SQL injection prevention through ORM/parameterization
- XSS prevention
- secure headers
- secret management
- audit logging for sensitive actions

## File upload security

Never trust:
- filename
- extension
- MIME type supplied by browser

Validate actual file content.

Limit:
- file size
- accepted formats
- number of uploads

Do not execute uploaded files.

---

# 18. Privacy

Resume data may contain:
- phone number
- email
- address
- employment history
- education
- personal links

Therefore:

- store only what is necessary
- never log full resumes
- never log API keys
- never expose resume files publicly
- use signed/private URLs where possible
- allow users to delete their data
- clearly explain how AI providers are used
- minimize third-party data transmission

AI prompts should send only the information necessary for the operation.

---

# 19. AI Safety / Accuracy Rules

The AI must NEVER:

- invent experience
- invent employment history
- invent education
- invent certifications
- invent projects
- invent salary history
- claim proficiency the user does not have
- answer application questions dishonestly

For generated content:

```text
Generated from verified candidate data.
User review required.
```

The user must be able to edit generated output.

---

# 20. Auto-Apply Strategy

The system should use three levels.

## Level 1 — Application Assistant

Safest MVP.

```text
Find job
↓
Generate materials
↓
Open application page
↓
User submits
```

## Level 2 — Browser-assisted filling

Where technically and legally appropriate:

```text
Open application
↓
Fill known fields
↓
Stop before final submission
↓
User reviews
↓
User submits
```

Never bypass:
- CAPTCHA
- MFA
- bot detection
- access controls

## Level 3 — Direct API submission

Only when:
- an official API exists,
- the API permits submission,
- authentication is legitimate,
- the platform's terms permit the use.

Do not build the project around unauthorized automation of restricted job platforms.

---

# 21. Dashboard

Dashboard should show:

```text
Jobs Found
High Matches
Saved Jobs
Applications
Interviews
Offers
Response Rate
```

Example:

```text
Applications this month: 34

Applied:       34
Interviews:     6
Rejected:      12
Pending:       16

Interview rate:
17.6%
```

---

# 22. Job Discovery UI

Each job card:

```text
Frontend Developer
Company Name

Remote · India
₹X–Y LPA

Match: 92%

React ✓
Next.js ✓
TypeScript ✓
AWS ⚠

[View Job]
[Save]
[Apply]
```

Avoid misleading visual indicators.

A 92% score is a recommendation score, not a probability of getting hired.

---

# 23. Application Tracker UI

Kanban-style board:

```text
Saved
   ↓
Applying
   ↓
Applied
   ↓
Assessment
   ↓
Interview
   ↓
Offer / Rejected
```

Allow manual status updates.

---

# 24. Observability

Production application should include:

- structured logs
- error tracking
- API latency monitoring
- job ingestion failures
- AI provider failures
- matching failures
- background task status

Never log:
- passwords
- API keys
- complete resumes
- sensitive application answers unnecessarily

---

# 25. Testing Strategy

## Unit tests

Test:
- matching calculations
- resume parsing transformations
- job normalization
- deduplication
- validation
- permission checks

## Integration tests

Test:
- authentication
- resume upload
- database operations
- job ingestion
- matching pipeline
- application creation

## E2E tests

Test:

```text
Signup
→ Upload resume
→ Configure preferences
→ Discover jobs
→ View match
→ Save job
→ Generate cover letter
→ Create application
```

---

# 26. Error Handling

Never expose internal errors to users.

Bad:

```text
PrismaClientKnownRequestError...
```

Good:

```text
We couldn't process your resume.
Please try again or upload another PDF.
```

Log technical details server-side.

---

# 27. Environment Variables

Use:

```text
DATABASE_URL=
AUTH_SECRET=

AI_PROVIDER=
AI_API_KEY=

STORAGE_PROVIDER=
STORAGE_BUCKET=

REDIS_URL=

SENTRY_DSN=
```

Never commit `.env`.

Provide `.env.example`.

---

# 28. Git Strategy

Use:

```text
main
develop
feature/*
fix/*
```

Commit examples:

```text
feat: add resume upload pipeline
feat: implement job matching
fix: prevent duplicate job ingestion
refactor: extract AI provider interface
test: add match scoring tests
```

Do not commit generated secrets or private user data.

---

# 29. AI Coding Tool Rules

This project may be developed with:

- GitHub Copilot
- Antigravity
- other coding assistants

AI coding tools are assistants, not the architect.

Before generating code:

1. Read `PROJECT_SPEC.md`.
2. Understand the existing architecture.
3. Inspect related files.
4. Reuse existing utilities.
5. Avoid duplicate implementations.
6. Follow established naming conventions.
7. Add tests for non-trivial logic.
8. Do not introduce dependencies without a reason.
9. Do not change database schema casually.
10. Explain security-sensitive changes.

Never blindly accept generated code.

---

# 30. Development Rules

## Rule 1

Build incrementally.

Do not generate the entire application in one shot.

## Rule 2

Keep business logic separate from UI.

Bad:

```text
React component
→ database
→ AI API
→ matching algorithm
```

Better:

```text
UI
 ↓
Server/API
 ↓
Service layer
 ↓
Repository
 ↓
Database
```

## Rule 3

Use typed interfaces.

## Rule 4

Validate at boundaries.

## Rule 5

Keep AI provider code isolated.

## Rule 6

Keep job-source integrations isolated.

## Rule 7

Every important feature should be testable without the UI.

---

# 31. Recommended Build Order

## Step 1

Initialize:
- Next.js
- TypeScript
- Tailwind
- shadcn/ui
- ESLint
- Prettier

## Step 2

Set up:
- PostgreSQL
- ORM
- migrations
- base schema

## Step 3

Implement:
- authentication
- user model
- protected dashboard

## Step 4

Implement:
- resume upload
- storage
- text extraction

## Step 5

Implement:
- AI resume parsing
- candidate profile
- profile editor

## Step 6

Implement:
- job preferences

## Step 7

Implement:
- job-source adapter architecture

## Step 8

Implement:
- job normalization
- deduplication
- database persistence

## Step 9

Implement:
- embeddings
- pgvector
- hybrid matching

## Step 10

Implement:
- match explanations
- recommendations

## Step 11

Implement:
- saved jobs
- application tracker

## Step 12

Implement:
- cover letter generation
- tailored resume recommendations

## Step 13

Implement:
- application assistant

## Step 14

Implement:
- dashboard analytics

## Step 15

Implement:
- background jobs
- notifications

## Step 16

Testing + security audit

## Step 17

Deployment

---

# 32. Deployment Strategy

## MVP

Prefer:

```text
Next.js
   ↓
Vercel / equivalent
   ↓
Managed PostgreSQL
```

Do not buy a VPS just because the project uses AI.

A VPS becomes useful later if you need:
- persistent workers
- self-hosted models
- Redis
- custom browser automation
- long-running ingestion
- multiple backend services

---

# 33. Cost Strategy

The first version should minimize recurring costs.

Use:
- free/student tiers
- open-source libraries
- PostgreSQL free tiers where suitable
- local models for development where practical
- provider abstraction to avoid vendor lock-in

Important:

**Free tier ≠ unlimited.**

The application should handle:
- rate limits
- quota exhaustion
- provider failures
- retries
- fallback providers

---

# 34. Performance

Do not perform expensive AI operations synchronously if they can be asynchronous.

Example:

Bad:

```text
Upload resume
→ wait for 5 AI calls
→ wait for embeddings
→ return response
```

Better:

```text
Upload resume
→ save file
→ create processing job
→ return
→ worker processes
→ notify UI
```

For MVP, synchronous processing can be acceptable if processing time is short. Move to background jobs when needed.

---

# 35. AI Provider Abstraction

Use a common interface:

```text
generateText()
generateStructuredObject()
generateEmbedding()
```

Example conceptual architecture:

```text
Application
    ↓
AI Service
    ↓
AI Provider Interface
    ↓
┌──────────┬──────────┬──────────┐
│ Gemini   │ OpenAI   │ Local    │
└──────────┴──────────┴──────────┘
```

This makes the application easier to maintain.

---

# 36. Data Model Principle

Keep raw and normalized data separately.

Example:

```text
raw_data
normalized_data
```

Why?

If a source changes its response format, you can reprocess the original data without fetching it again.

---

# 37. Source Adapter Principle

Each job source should be independently enabled/disabled.

Example:

```text
JOB_SOURCE_GREENHOUSE=true
JOB_SOURCE_LEVER=true
JOB_SOURCE_COMPANY_CAREERS=true
```

Never spread source-specific logic throughout the application.

---

# 38. Recommendation Quality

Matching quality should improve over time.

Possible feedback:

```text
User saves job
+ positive signal

User applies
++ strong signal

User rejects job
- negative signal

User says "not relevant"
-- strong negative signal
```

Future ranking can use this data.

Do not build ML personalization before collecting enough meaningful feedback.

---

# 39. Analytics

Track:

```text
Jobs discovered
Jobs viewed
Jobs saved
Jobs applied
Interviews
Offers
```

Useful derived metrics:

```text
Save rate
Application rate
Interview rate
Offer rate
```

Also track match-score calibration.

Example:

```text
90%+ matches → interview rate
80–89% matches → interview rate
70–79% matches → interview rate
```

This helps determine whether the matching algorithm is actually useful.

---

# 40. UX Principles

The UI should feel like a serious SaaS product.

Avoid:
- excessive gradients
- unnecessary animations
- giant AI branding
- cluttered dashboards
- fake AI statistics

Prioritize:
- clarity
- speed
- readable job cards
- transparent scoring
- useful explanations
- obvious actions

---

# 41. Accessibility

Implement:
- keyboard navigation
- semantic HTML
- proper labels
- accessible forms
- sufficient contrast
- visible focus states
- screen-reader-friendly controls

---

# 42. Internationalization

Do not hard-code assumptions that all users are in one country.

Design for:
- multiple locations
- multiple currencies
- different employment types
- different date formats

Initial launch can still focus on India.

---

# 43. Example AI Prompt Contract

The application should use structured output rather than trusting free-form AI responses.

Example:

```json
{
  "skills": [
    {
      "name": "React",
      "evidence": "Built multiple React projects",
      "verified": true
    }
  ],
  "experience_years": 1.5,
  "education": [],
  "projects": []
}
```

Validate the result before storing it.

---

# 44. AI Hallucination Prevention

Use a source hierarchy.

```text
Candidate Resume
      ↓
Verified Candidate Profile
      ↓
Job Description
      ↓
AI inference
```

AI inference must never override verified facts.

For generated application material:

```text
Allowed:
"Built a Next.js application..."

Not allowed unless verified:
"Led a team of 10 engineers..."
```

---

# 45. Application Submission Principle

The system must distinguish:

```text
ASSIST
```

from:

```text
SUBMIT
```

AI can:
- recommend
- generate
- prefill
- explain

The user remains responsible for:
- final answers
- truthfulness
- submission

Where an official integration explicitly permits direct submission, the integration can be implemented separately.

---

# 46. Future Features

Potential future roadmap:

- browser extension
- Gmail integration for application emails
- calendar integration for interviews
- interview preparation
- AI mock interviews
- salary analysis
- company research
- recruiter CRM
- networking assistant
- referral discovery
- job market analytics
- resume A/B testing
- personalized job-search agent
- multi-language support

These should NOT block the MVP.

---

# 47. Definition of Done — MVP

The MVP is complete only when:

- [ ] User can register/login.
- [ ] User can upload a resume.
- [ ] Resume is parsed.
- [ ] Candidate profile is generated.
- [ ] User can edit profile.
- [ ] User can configure job preferences.
- [ ] Jobs can be imported from at least one legitimate source.
- [ ] Jobs are normalized.
- [ ] Duplicate jobs are handled.
- [ ] Matching works.
- [ ] Match score is explainable.
- [ ] User can save jobs.
- [ ] User can create an application record.
- [ ] User can generate a cover letter.
- [ ] User can track application status.
- [ ] Basic dashboard analytics work.
- [ ] Authentication/authorization is tested.
- [ ] File uploads are secured.
- [ ] Secrets are not committed.
- [ ] Error handling is implemented.
- [ ] Core business logic has tests.
- [ ] Production deployment works.

---

# 48. Portfolio / Interview Positioning

This project should demonstrate:

### Full-stack engineering
- Next.js
- TypeScript
- PostgreSQL
- APIs
- authentication
- file handling

### AI engineering
- structured extraction
- embeddings
- vector search
- LLM orchestration
- hybrid ranking
- prompt design
- hallucination control

### Backend engineering
- service architecture
- source adapters
- data normalization
- deduplication
- background processing

### Security
- authentication
- authorization
- secure file uploads
- validation
- rate limiting
- privacy

### Product thinking
- explainable recommendations
- user control
- analytics
- feedback loops

---

# 49. Final Architecture

```text
                         ┌─────────────────────┐
                         │      Next.js UI     │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │ API / Server Layer  │
                         └──────────┬──────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
┌─────────▼─────────┐     ┌─────────▼─────────┐     ┌────────▼────────┐
│ Resume Service    │     │ Job Service       │     │ Application     │
│                   │     │                   │     │ Service         │
└─────────┬─────────┘     └─────────┬─────────┘     └────────┬────────┘
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   AI / Matching     │
                         │      Service        │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
             ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼──────┐
             │ LLM        │  │ Embeddings  │  │ Vector DB   │
             │ Providers  │  │             │  │ pgvector    │
             └────────────┘  └─────────────┘  └─────────────┘

                         ┌────────────────────┐
                         │    PostgreSQL      │
                         └────────────────────┘

                         ┌────────────────────┐
                         │ Job Source Adapters│
                         ├────────────────────┤
                         │ Greenhouse        │
                         │ Lever             │
                         │ Company Careers   │
                         │ Future Sources    │
                         └────────────────────┘
```

---

# 50. Project Success Criteria

The project should not be judged by how many AI features it has.

The real success criteria are:

1. **Can it find relevant jobs?**
2. **Are the recommendations actually useful?**
3. **Can it explain why a job matches?**
4. **Does it avoid fabricating candidate information?**
5. **Can the user trust the generated application material?**
6. **Is the application data secure?**
7. **Can the architecture support additional job sources?**
8. **Can the developer explain every major technical decision?**
9. **Can the system be deployed and run reliably?**
10. **Can the project survive code review and edge-case testing?**

The goal is to build a **real AI-assisted job-search product**, not merely a demo that calls an LLM API.
