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
