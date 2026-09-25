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

drop trigger if exists set_updated_at_job_postings on public.job_postings;
drop trigger if exists set_updated_at_applications on public.applications;
drop trigger if exists set_updated_at_company_settings on public.company_settings;
drop trigger if exists ensure_company_settings_after_insert on public.companies;

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
