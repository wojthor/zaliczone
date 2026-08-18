-- Skrzynka powiadomień (prośba o ewidencję, zmiana cennika itd.)

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('ADMIN', 'TUTOR')),
  tutor_id uuid references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_tutor_created_idx
  on public.notifications (tutor_id, created_at desc);

create index if not exists notifications_audience_created_idx
  on public.notifications (audience, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_admin_all"
  on public.notifications for all
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN')
  );

drop policy if exists "notifications_tutor_select" on public.notifications;
create policy "notifications_tutor_select"
  on public.notifications for select
  to authenticated
  using (audience = 'TUTOR' and tutor_id = auth.uid());

drop policy if exists "notifications_tutor_update" on public.notifications;
create policy "notifications_tutor_update"
  on public.notifications for update
  to authenticated
  using (audience = 'TUTOR' and tutor_id = auth.uid())
  with check (audience = 'TUTOR' and tutor_id = auth.uid());

grant select, insert, update on table public.notifications to authenticated;
