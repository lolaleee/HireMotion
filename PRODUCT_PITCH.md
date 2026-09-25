# HireMotion Product Pitch

HireMotion is an AI-powered hiring platform built for companies that want to stop losing strong candidates after a single rejection.

Most ATS tools track applications. HireMotion remembers talent.

Instead of treating rejected candidates as a dead end, the platform automatically matches them against other open roles, surfaces them in a reusable talent pool, and lets HR reopen or repost jobs without losing qualified applicants.

## Why HireMotion is different

### 1) Talent reactivation, not talent loss
A candidate rejected from one role is not lost forever. If they scored well for another opening, they are automatically surfaced again in the talent pool.

This turns recruiting from a one-time filtering funnel into a reusable talent engine.

### 2) AI screening with human control
The platform uses AI to score CVs and highlight fit, but HR remains in charge of the final decision.

That means faster review for recruiters without removing accountability or trust from the hiring process.

### 3) Repost and reopen workflows
When a hired candidate resigns, the role can be reopened or reposted without rebuilding the pipeline from scratch.

Strong previous candidates can be revisited automatically or manually re-invited, reducing time-to-fill and preserving pipeline quality.

### 4) Internal mobility and future-fit matching
The system is designed not only for external applicants but also for internal mobility and future-fit hiring.

A candidate who is strong for one role can be recognized as a fit for another position later, even if the first role was not a match.

### 5) Candidate experience with transparent status updates
Applicants should know where they stand. HireMotion is built to give a clear job status and communication flow so candidates feel informed instead of ignored.

That improves employer brand and reduces drop-off in the hiring pipeline.

---

## Product message

HireMotion helps companies hire faster by keeping strong candidates in circulation, matching them to future roles, and giving recruiters a smarter, less wasteful hiring workflow.

---

## Value proposition

For companies:
- reduce time-to-fill
- re-use quality candidates
- avoid losing good applicants after rejection
- improve decision quality with AI-assisted scoring

For recruiters:
- see better matches faster
- reopen roles without starting from zero
- keep a reusable candidate pipeline

For candidates:
- better transparency
- more relevant role matching
- less uncertainty during hiring

---

## Feature roadmap

### Phase 1: core ATS + talent pool
- job posting creation and lifecycle management
- candidate application tracking
- shortlist and interview workflow
- rejection + talent-pool placement
- candidate status pages

### Phase 2: smarter matching
- AI CV scoring
- reusable talent reactivation
- repost matching for closed roles
- role-to-candidate recommendation engine

### Phase 3: hiring intelligence
- analytics dashboard
- time-to-hire metrics
- hiring funnel reporting
- internal mobility recommendations
- recruiter automation and alerts

---

## Deployment plan

### Frontend deployment model
Use two separate frontend deployments:
- Candidate app: public job listings and application flow
- HR app: admin dashboard, talent pool, and job management

Both frontends should connect to the same Supabase backend and share the same database, job records, and candidate history.

### Recommended hosting
- Vercel for both frontend deployments
- Supabase for database, auth, storage, and edge functions

### Required environment variables
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY

---

## Closing pitch

HireMotion is not just another ATS. It is a hiring memory system built to keep strong candidates available, make better role matches, and help companies hire faster with less waste.
