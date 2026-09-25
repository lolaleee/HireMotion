-- HireMotion initial Supabase schema
-- Run this in the Supabase SQL editor after creating a project.

create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'hr');
create type public.application_status as enum ('submitted', 'screening', 'shortlisted', 'interview', 'reengaged', 'rejected');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_location text,
  contact_email text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  role public.member_role not null default 'hr',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  department text not null,
  location text not null,
  employment_type text not null check (employment_type in ('Full-time', 'Part-time', 'Contract')),
  deadline date,
  description text not null,
  requirements text not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings(id) on delete restrict,
  reference_code text not null unique default ('HM-' || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8))),
  candidate_name text not null,
  candidate_email text not null,
  candidate_phone text not null,
  candidate_location text not null,
  cover_note text,
  cv_file_name text not null,
  cv_file_path text not null unique,
  status public.application_status not null default 'submitted',
  fit_score smallint check (fit_score between 0 and 100),
  fit_decision text not null default 'pending' check (fit_decision in ('pending', 'strong_match', 'possible_match', 'not_a_match')),
  fit_summary text,
  fit_matches jsonb not null default '[]'::jsonb,
  fit_gaps jsonb not null default '[]'::jsonb,
  scoring_status text not null default 'pending' check (scoring_status in ('pending', 'processing', 'scored', 'failed')),
  scoring_error text,
  scored_at timestamptz,
  cv_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_job_posting_id_idx on public.applications(job_posting_id);
create index applications_status_idx on public.applications(status);
create index applications_lookup_idx on public.applications(reference_code, lower(candidate_email));

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  mode text not null check (mode in ('Video call', 'In person')),
  scheduling_link text,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  outcome text not null default 'pending' check (outcome in ('pending', 'passed', 'failed', 'no_show')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.score_feedback (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  original_score smallint check (original_score between 0 and 100),
  verdict text not null check (verdict in ('score_too_high', 'score_too_low', 'reasoning_off')),
  note text,
  created_at timestamptz not null default now()
);

create table public.talent_pool_matches (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  matched_job_posting_id uuid not null references public.job_postings(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  match_summary text,
  dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (application_id, matched_job_posting_id)
);

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  shortlist_threshold smallint not null default 75 check (shortlist_threshold between 0 and 100),
  pool_match_threshold smallint not null default 60 check (pool_match_threshold between 0 and 100),
  auto_email_shortlisted boolean not null default true,
  auto_notify_hr boolean not null default true,
  send_rejection_emails boolean not null default false,
  updated_at timestamptz not null default now()
);

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and company_id = target_company_id and role in ('owner', 'hr')
  );
$$;

create or replace function public.is_company_owner(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and company_id = target_company_id and role = 'owner'
  );
$$;

create or replace function public.lookup_application_status(p_reference_code text, p_email text)
returns table (reference_code text, role text, status public.application_status)
language sql
stable
security definer
set search_path = public
as $$
  select a.reference_code, j.title, a.status
  from public.applications a
  join public.job_postings j on j.id = a.job_posting_id
  where upper(a.reference_code) = upper(trim(p_reference_code))
    and lower(a.candidate_email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.lookup_application_status(text, text) from public;
grant execute on function public.lookup_application_status(text, text) to anon, authenticated;

create or replace function public.get_public_company_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.name
  from public.companies c
  join public.job_postings j on j.company_id = c.id
  where j.is_open = true
  order by j.created_at desc
  limit 1;
$$;

revoke all on function public.get_public_company_name() from public;
grant execute on function public.get_public_company_name() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.ensure_company_settings()
returns trigger
language plpgsql
as $$
begin
  insert into public.company_settings (company_id)
  values (new.id)
  on conflict (company_id) do nothing;

  return new;
end;
$$;

create or replace function public.create_company_and_owner(
  p_name text,
  p_default_location text default null,
  p_contact_email text default null,
  p_full_name text default null
)
returns table (company_id uuid, profile_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to create a company';
  end if;

  insert into public.companies (name, default_location, contact_email)
  values (p_name, p_default_location, p_contact_email)
  returning id into v_company_id;

  insert into public.profiles (id, company_id, role, full_name)
  values (auth.uid(), v_company_id, 'owner', p_full_name)
  on conflict (id) do update
    set company_id = excluded.company_id,
        role = excluded.role,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.company_settings (company_id)
  values (v_company_id)
  on conflict (company_id) do nothing;

  return query
    select v_company_id, auth.uid();
end;
$$;

revoke all on function public.create_company_and_owner(text, text, text, text) from public;
grant execute on function public.create_company_and_owner(text, text, text, text) to authenticated;

create or replace function public.submit_application(
  p_id uuid,
  p_job_posting_id uuid,
  p_candidate_name text,
  p_candidate_email text,
  p_candidate_phone text,
  p_candidate_location text,
  p_cover_note text,
  p_cv_file_name text,
  p_cv_file_path text
)
returns table (reference_code text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.job_postings where id = p_job_posting_id and is_open = true) then
    raise exception 'This job posting is not open';
  end if;

  insert into public.applications (
    id, job_posting_id, candidate_name, candidate_email, candidate_phone,
    candidate_location, cover_note, cv_file_name, cv_file_path
  ) values (
    p_id, p_job_posting_id, trim(p_candidate_name), lower(trim(p_candidate_email)),
    trim(p_candidate_phone), trim(p_candidate_location), nullif(trim(p_cover_note), ''),
    p_cv_file_name, p_cv_file_path
  );

  return query select a.reference_code from public.applications a where a.id = p_id;
end;
$$;

revoke all on function public.submit_application(uuid, uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_application(uuid, uuid, text, text, text, text, text, text, text) to anon, authenticated;

create trigger set_updated_at_job_postings
before update on public.job_postings
for each row execute function public.set_updated_at();

create trigger set_updated_at_applications
before update on public.applications
for each row execute function public.set_updated_at();

create trigger set_updated_at_company_settings
before update on public.company_settings
for each row execute function public.set_updated_at();

create trigger ensure_company_settings_after_insert
after insert on public.companies
for each row execute function public.ensure_company_settings();

create or replace view public.score_distribution_by_department as
select
  jp.company_id,
  jp.department,
  round(avg(a.fit_score)::numeric, 1) as avg_score,
  count(*) as total_scored
from public.applications a
join public.job_postings jp on jp.id = a.job_posting_id
where a.fit_score is not null
group by jp.company_id, jp.department
order by jp.company_id, jp.department;

create or replace view public.scoring_accuracy_summary as
select
  jp.company_id,
  count(*) as total_reviews,
  sum(case when sf.verdict = 'score_too_high' then 1 else 0 end) as score_too_high,
  sum(case when sf.verdict = 'score_too_low' then 1 else 0 end) as score_too_low,
  sum(case when sf.verdict = 'reasoning_off' then 1 else 0 end) as reasoning_off
from public.score_feedback sf
join public.applications a on a.id = sf.application_id
join public.job_postings jp on jp.id = a.job_posting_id
group by jp.company_id;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.job_postings enable row level security;
alter table public.applications enable row level security;
alter table public.interviews enable row level security;
alter table public.score_feedback enable row level security;
alter table public.talent_pool_matches enable row level security;
alter table public.company_settings enable row level security;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "HR can view company profile"
on public.companies for select
to authenticated
using (public.is_company_member(id));

create policy "HR can update company profile"
on public.companies for update
to authenticated
using (public.is_company_member(id))
with check (public.is_company_member(id));

create policy "Public can view open postings"
on public.job_postings for select
to anon, authenticated
using (is_open = true);

create policy "HR can view company postings"
on public.job_postings for select
to authenticated
using (public.is_company_member(company_id));

create policy "HR can create company postings"
on public.job_postings for insert
to authenticated
with check (public.is_company_member(company_id));

create policy "Owners can update company postings"
on public.job_postings for update
to authenticated
using (public.is_company_owner(company_id))
with check (public.is_company_owner(company_id));

create policy "Public can submit to open postings"
on public.applications for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.job_postings j
    where j.id = job_posting_id and j.is_open = true
  )
);

create policy "HR can view company applications"
on public.applications for select
to authenticated
using (
  exists (
    select 1 from public.job_postings j
    where j.id = job_posting_id and public.is_company_member(j.company_id)
  )
);

create policy "HR can update company applications"
on public.applications for update
to authenticated
using (
  exists (
    select 1 from public.job_postings j
    where j.id = job_posting_id and public.is_company_member(j.company_id)
  )
)
with check (
  exists (
    select 1 from public.job_postings j
    where j.id = job_posting_id and public.is_company_member(j.company_id)
  )
);

create policy "HR can view company interviews"
on public.interviews for select
to authenticated
using (
  exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_posting_id
    where a.id = application_id and public.is_company_member(j.company_id)
  )
);

create policy "HR can manage company interviews"
on public.interviews for all
to authenticated
using (
  exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_posting_id
    where a.id = application_id and public.is_company_member(j.company_id)
  )
)
with check (
  exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_posting_id
    where a.id = application_id and public.is_company_member(j.company_id)
  )
);

create policy "Reviewers can submit score feedback"
on public.score_feedback for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_posting_id
    where a.id = application_id and public.is_company_member(j.company_id)
  )
);

create policy "HR can view company score feedback"
on public.score_feedback for select
to authenticated
using (
  exists (
    select 1 from public.applications a
    join public.job_postings j on j.id = a.job_posting_id
    where a.id = application_id and public.is_company_member(j.company_id)
  )
);

create policy "HR can manage company talent matches"
on public.talent_pool_matches for all
to authenticated
using (
  exists (
    select 1 from public.job_postings j
    where j.id = matched_job_posting_id and public.is_company_member(j.company_id)
  )
)
with check (
  exists (
    select 1 from public.job_postings j
    where j.id = matched_job_posting_id and public.is_company_member(j.company_id)
  )
);

create policy "HR can view company settings"
on public.company_settings for select
to authenticated
using (public.is_company_member(company_id));

create policy "HR can manage company settings"
on public.company_settings for all
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

create policy "Owners can manage company settings"
on public.company_settings for all
to authenticated
using (public.is_company_owner(company_id))
with check (public.is_company_owner(company_id));

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false)
on conflict (id) do nothing;

-- Candidate uploads should be limited to an application-scoped folder.
-- This is still a practical intermediate step until a server-side upload function exists.
create policy "Candidates can upload CVs to their application folder"
on storage.objects for insert
to anon, authenticated
with check (
  bucket_id = 'cvs'
  and name ~ '^[0-9a-fA-F-]{36}/[^/]+\.(pdf|doc|docx)$'
);

create policy "HR can view CVs for their applications"
on storage.objects for select
to authenticated
using (
  bucket_id = 'cvs'
  and exists (
    select 1
    from public.applications a
    join public.job_postings j on j.id = a.job_posting_id
    where public.is_company_member(j.company_id)
      and name like a.id::text || '/%'
  )
);
