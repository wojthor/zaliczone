-- Blokada ucznia + alerty (3× UNPAID z rzędu, rezygnacja z zajęć).

alter table public.students
  add column if not exists blocked boolean not null default false;

alter table public.students
  add column if not exists blocked_at timestamptz;

alter table public.students
  add column if not exists blocked_reason text;

comment on column public.students.blocked is
  'Uczeń zablokowany przez admina (np. 3 lekcje z rzędu bez wpłaty).';

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('UNPAID_STREAK', 'STOP_TEACHING', 'STUDENT_BLOCKED')),
  audience text not null check (audience in ('ADMIN', 'TUTOR')),
  tutor_id uuid references public.profiles (id) on delete cascade,
  student_id uuid references public.students (id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  resolved_at timestamptz
);

create index if not exists alerts_audience_open_idx
  on public.alerts (audience, created_at desc)
  where resolved_at is null;

create unique index if not exists alerts_open_unpaid_streak_idx
  on public.alerts (student_id)
  where kind = 'UNPAID_STREAK' and audience = 'ADMIN' and resolved_at is null;

create unique index if not exists alerts_open_stop_teaching_idx
  on public.alerts (tutor_id)
  where kind = 'STOP_TEACHING' and audience = 'ADMIN' and resolved_at is null;

create unique index if not exists alerts_open_student_blocked_idx
  on public.alerts (student_id)
  where kind = 'STUDENT_BLOCKED' and audience = 'TUTOR' and resolved_at is null;

alter table public.alerts enable row level security;

drop policy if exists "alerts_admin_all" on public.alerts;
create policy "alerts_admin_all"
  on public.alerts for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

drop policy if exists "alerts_tutor_select" on public.alerts;
create policy "alerts_tutor_select"
  on public.alerts for select
  to authenticated
  using (audience = 'TUTOR' and tutor_id = auth.uid());

drop policy if exists "alerts_tutor_update" on public.alerts;
create policy "alerts_tutor_update"
  on public.alerts for update
  to authenticated
  using (audience = 'TUTOR' and tutor_id = auth.uid())
  with check (audience = 'TUTOR' and tutor_id = auth.uid());

grant select, update on table public.alerts to authenticated;
