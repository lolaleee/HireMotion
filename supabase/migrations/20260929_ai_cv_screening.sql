alter table public.applications
  add column if not exists fit_decision text not null default 'pending'
    check (fit_decision in ('pending', 'strong_match', 'possible_match', 'not_a_match'));
