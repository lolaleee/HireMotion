drop policy if exists "HR can view company profile" on public.companies;
create policy "HR can view company profile"
on public.companies for select
to authenticated
using (public.is_company_member(id));

drop policy if exists "HR can update company profile" on public.companies;
create policy "HR can update company profile"
on public.companies for update
to authenticated
using (public.is_company_member(id))
with check (public.is_company_member(id));

drop policy if exists "HR can manage company settings" on public.company_settings;
create policy "HR can manage company settings"
on public.company_settings for all
to authenticated
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));
