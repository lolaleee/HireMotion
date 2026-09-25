alter table public.interviews
  add column if not exists status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  add column if not exists outcome text not null default 'pending'
    check (outcome in ('pending', 'passed', 'failed', 'no_show')),
  add column if not exists completed_at timestamptz;

alter table public.applications
  add column if not exists scoring_status text not null default 'pending'
    check (scoring_status in ('pending', 'processing', 'scored', 'failed')),
  add column if not exists scoring_error text,
  add column if not exists scored_at timestamptz,
  add column if not exists cv_text text;
