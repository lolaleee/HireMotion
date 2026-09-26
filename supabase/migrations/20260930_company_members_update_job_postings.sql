drop policy if exists "Owners can update company postings" on public.job_postings;
drop policy if exists "Company members can update company postings" on public.job_postings;

create policy "Company members can update company postings"
on public.job_postings for update
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));