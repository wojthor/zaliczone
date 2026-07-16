-- ZALICZONE initial schema + RLS
-- Run this entire script in the Supabase SQL Editor.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('ADMIN', 'TUTOR')),
  full_name text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- students
-- ---------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  subjects text[] not null default '{}',
  class_level text not null,
  rate_pln numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists students_tutor_id_idx on public.students (tutor_id);

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  subject text not null,
  is_completed boolean not null default false,
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lessons_tutor_id_idx on public.lessons (tutor_id);
create index if not exists lessons_student_id_idx on public.lessons (student_id);
create index if not exists lessons_date_idx on public.lessons (date);
create index if not exists lessons_completed_idx on public.lessons (is_completed) where is_completed = true;

-- ---------------------------------------------------------------------------
-- Helper: current user's role
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.lessons enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.current_user_role() = 'ADMIN');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- students
drop policy if exists "students_tutor_all" on public.students;
create policy "students_tutor_all"
  on public.students for all
  using (tutor_id = auth.uid())
  with check (tutor_id = auth.uid());

drop policy if exists "students_admin_select" on public.students;
create policy "students_admin_select"
  on public.students for select
  using (public.current_user_role() = 'ADMIN');

-- lessons
drop policy if exists "lessons_tutor_all" on public.lessons;
create policy "lessons_tutor_all"
  on public.lessons for all
  using (tutor_id = auth.uid())
  with check (tutor_id = auth.uid());

drop policy if exists "lessons_admin_select" on public.lessons;
create policy "lessons_admin_select"
  on public.lessons for select
  using (public.current_user_role() = 'ADMIN');

drop policy if exists "lessons_admin_update" on public.lessons;
create policy "lessons_admin_update"
  on public.lessons for update
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- Auto-create profile row on signup (optional safety net)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'TUTOR'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
