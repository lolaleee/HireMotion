# HireMotion — web frontend

HireMotion is an AI-powered hiring platform designed to keep strong candidates in circulation instead of losing them after a single rejection.

This project is a Vite + React + React Router + Tailwind frontend for a split deployment setup: one public candidate app and one HR dashboard app, both connected to the same Supabase backend.

## Product pitch

HireMotion is not just another ATS. It is a hiring memory system built to reuse strong candidates, match them to future roles, and help companies fill openings faster with less waste.

## Five product differentiators

1. Talent reactivation instead of talent loss
   - rejected candidates are kept in a talent pool for future matches
2. AI-assisted scoring with human review
   - CV matching and role fit help HR screen faster without removing human oversight
3. Repost and reopen workflow
   - when a candidate resigns, the role can be reopened and previous strong applicants can be revisited
4. Internal mobility and future-fit matching
   - candidates can be surfaced for roles beyond the one they originally applied to
5. Transparent candidate experience
   - applicants get clear status updates and a more professional hiring journey

See [PRODUCT_PITCH.md](PRODUCT_PITCH.md) for the full positioning, roadmap, and deployment strategy.

---

The app currently runs on mock data in `src/lib/mockData.js`, and the first database migration is in `supabase/schema.sql`.

## Setup

```
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Runs at http://localhost:5173 by default.

## Structure

```
src/
  App.jsx                 — all routes
  lib/
    supabaseClient.js      — Supabase client (reads env vars)
    mockData.js            — placeholder data, shaped like the real tables
    ThemeContext.jsx        — light/dark mode, persisted to localStorage
  components/               — Stepper, StatusPill, ScoreBar, ThemeToggle
  pages/
    candidate/               — public site: listings, job detail/apply,
                                confirmation, status check
    hr/                       — dashboard: postings, applications,
                                applicant detail, interviews, talent pool,
                                settings
```

## Routes

Candidate site:
- `/` — job listings
- `/jobs/:jobId` — job detail + application form
- `/confirmation/:jobId` — post-submit confirmation
- `/status` — status lookup

HR dashboard:
- `/hr/postings`, `/hr/applications`, `/hr/applications/:applicationId`,
  `/hr/interviews`, `/hr/pool`, `/hr/settings`

## Wiring up the real backend

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Create an HR user under Authentication -> Users, then add its profile and
  company membership in the SQL editor. The profile's `role` must be `owner`
  or `hr`.
3. Fill in `.env.local` with that project's URL and anon key.
4. Go through each `// TODO` comment and replace the mock-data read with the
  Supabase query it describes. `JobDetail.jsx`'s submit handler is the
  important one — it needs to actually upload the CV to storage and insert
  the application row, which is what fires the screening pipeline.
5. Keep the CV bucket private and generate signed URLs for HR CV viewing.
6. **Before shipping**: add the screening and notification edge functions,
  server-side file validation, and rate limiting for public application and
  status endpoints.

### Email setup

The email function source is in `supabase/functions/send-application-email/index.ts`.
Deploy it with the Supabase CLI, then set these Edge Function secrets:

```
supabase secrets set RESEND_API_KEY=... MAIL_FROM="HireMotion <jobs@example.com>"
supabase functions deploy send-application-email
```

Use a verified sender domain in production. Until this function is deployed,
applications still save successfully but no email is sent.

## What's NOT done yet

- HR authentication is present, but database profile/role checks still need
  to be wired into the route guard; Supabase RLS remains the source of truth.
- CV upload doesn't actually hit Supabase Storage yet
- No loading/error states on the data-fetching TODOs (add these as you wire
  each one in — don't ship silent failures)
- Job posting edit / talent-pool dismiss are UI-only, no handlers wired
