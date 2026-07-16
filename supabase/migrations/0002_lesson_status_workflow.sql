-- ZALICZONE workflow upgrade: lesson status machine, subject requests, payouts
-- Run in Supabase SQL Editor AFTER 0001_initial_schema.sql

-- ---------------------------------------------------------------------------
-- Lesson status enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.lesson_status as enum (
    'PLANNED',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'UNPAID'
  );
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- profiles: active subjects + ewidencja unlock
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists active_subjects text[] not null default '{}',
  add column if not exists ewidencja_unlocked_for_month text;

-- ---------------------------------------------------------------------------
-- lessons: migrate is_completed / is_paid → status
-- ---------------------------------------------------------------------------
alter table public.lessons
  add column if not exists status public.lesson_status not null default 'PLANNED';

-- Backfill from legacy booleans (if columns still exist)
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'lessons' and column_name = 'is_completed'
  ) then
    update public.lessons set status = case
      when is_completed = true and is_paid = true then 'VERIFIED'::public.lesson_status
      when is_completed = true and is_paid = false then 'PENDING_VERIFICATION'::public.lesson_status
      else 'PLANNED'::public.lesson_status
    end;
  end if;
end $$;

alter table public.lessons drop column if exists is_completed;
alter table public.lessons drop column if exists is_paid;

drop index if exists public.lessons_completed_idx;
create index if not exists lessons_status_idx on public.lessons (status);
create index if not exists lessons_pending_idx on public.lessons (status)
  where status in ('PENDING_VERIFICATION', 'UNPAID');

-- ---------------------------------------------------------------------------
-- subject_requests
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.subject_request_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.subject_requests (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null,
  status public.subject_request_status not null default 'PENDING',
  created_at timestamptz not null default now()
);

create index if not exists subject_requests_tutor_id_idx on public.subject_requests (tutor_id);
create index if not exists subject_requests_status_idx on public.subject_requests (status);

-- ---------------------------------------------------------------------------
-- payouts
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.payout_status as enum ('PENDING_DOCS', 'PAID');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  month text not null,
  amount numeric(10, 2) not null default 0,
  status public.payout_status not null default 'PENDING_DOCS',
  created_at timestamptz not null default now(),
  unique (tutor_id, month)
);

create index if not exists payouts_tutor_id_idx on public.payouts (tutor_id);
create index if not exists payouts_month_idx on public.payouts (month);

-- ---------------------------------------------------------------------------
-- RLS: subject_requests
-- ---------------------------------------------------------------------------
alter table public.subject_requests enable row level security;

drop policy if exists "subject_requests_tutor_all" on public.subject_requests;
create policy "subject_requests_tutor_all"
  on public.subject_requests for all
  using (tutor_id = auth.uid())
  with check (tutor_id = auth.uid());

drop policy if exists "subject_requests_admin_select" on public.subject_requests;
create policy "subject_requests_admin_select"
  on public.subject_requests for select
  using (public.current_user_role() = 'ADMIN');

drop policy if exists "subject_requests_admin_update" on public.subject_requests;
create policy "subject_requests_admin_update"
  on public.subject_requests for update
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- RLS: payouts
-- ---------------------------------------------------------------------------
alter table public.payouts enable row level security;

drop policy if exists "payouts_tutor_select" on public.payouts;
create policy "payouts_tutor_select"
  on public.payouts for select
  using (tutor_id = auth.uid());

drop policy if exists "payouts_admin_all" on public.payouts;
create policy "payouts_admin_all"
  on public.payouts for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- RLS: admin can update profiles (ewidencja_unlocked_for_month, active_subjects)
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select"
  on public.profiles for select
  using (public.current_user_role() = 'ADMIN');
