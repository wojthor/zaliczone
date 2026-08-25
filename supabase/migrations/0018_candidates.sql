-- Migracja 0018: kandydaci rekrutacji (Google Forms → panel admina)
-- Uruchom w Supabase SQL Editor.
-- Jeśli wcześniej wgrałeś starą wersję 0018, najpierw:
--   drop table if exists public.candidates cascade;
--   drop type if exists public.candidate_status cascade;

create type public.candidate_status as enum (
  'NEW',
  'IN_PROGRESS',
  'REJECTED',
  'HIRED'
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  dob date,
  student_status boolean not null default false,
  university text,
  experience boolean not null default false,
  -- Jeden test na przedmiot = najwyższy wybrany poziom, np.:
  -- [{"subject":"Biologia","level":"Matura"},{"subject":"Matematyka","level":"Szkoła podstawowa"}]
  required_tests jsonb not null default '[]'::jsonb,
  levels text,
  hours_per_week text,
  cv_url text,
  tests_expected integer not null default 0,
  tests_completed integer not null default 0,
  -- {"Biologia":{"score":"18/20","level":"Matura"}}
  test_results jsonb not null default '{}'::jsonb,
  test_sent_manually boolean not null default false,
  status public.candidate_status not null default 'NEW',
  created_at timestamptz not null default now()
);

-- Upgrade ze starszej 0018 (subjects text[] → required_tests jsonb)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'candidates' and column_name = 'subjects'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'candidates' and column_name = 'required_tests'
  ) then
    alter table public.candidates add column required_tests jsonb not null default '[]'::jsonb;
    update public.candidates
    set required_tests = coalesce(
      (
        select jsonb_agg(jsonb_build_object('subject', s, 'level', ''))
        from unnest(subjects) as s
      ),
      '[]'::jsonb
    );
    alter table public.candidates drop column subjects;
  end if;
end $$;

create index if not exists candidates_email_idx on public.candidates (lower(email));
create index if not exists candidates_status_idx on public.candidates (status);
create index if not exists candidates_created_at_idx on public.candidates (created_at desc);

alter table public.candidates enable row level security;

drop policy if exists "candidates_admin_select" on public.candidates;
drop policy if exists "candidates_admin_insert" on public.candidates;
drop policy if exists "candidates_admin_update" on public.candidates;
drop policy if exists "candidates_admin_delete" on public.candidates;

create policy "candidates_admin_select"
  on public.candidates for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'));

create policy "candidates_admin_insert"
  on public.candidates for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'));

create policy "candidates_admin_update"
  on public.candidates for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'));

create policy "candidates_admin_delete"
  on public.candidates for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN'));

comment on table public.candidates is 'Kandydaci: required_tests (przedmiot+najwyższy poziom) + test_results per subject.';
