-- ZALICZONE: tutor contact fields, cennik tiers, in-app admin messages
-- Run AFTER 0002_lesson_status_workflow.sql

-- ---------------------------------------------------------------------------
-- profiles: contact & payout details
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists phone text,
  add column if not exists bank_account text,
  add column if not exists olx_url text;

-- ---------------------------------------------------------------------------
-- price_tiers (cennik)
-- ---------------------------------------------------------------------------
create table if not exists public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  client_rate_pln numeric(10, 2) not null,
  worker_rate_pln numeric(10, 2) not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.price_tiers (label, client_rate_pln, worker_rate_pln, sort_order)
select * from (values
  ('Szkoła podstawowa', 60::numeric, 42::numeric, 0),
  ('Szkoła średnia', 70::numeric, 49::numeric, 1),
  ('Matura', 80::numeric, 56::numeric, 2)
) as v(label, client_rate_pln, worker_rate_pln, sort_order)
where not exists (select 1 from public.price_tiers limit 1);

alter table public.price_tiers enable row level security;

drop policy if exists "price_tiers_select_all_authenticated" on public.price_tiers;
create policy "price_tiers_select_all_authenticated"
  on public.price_tiers for select
  using (auth.uid() is not null);

drop policy if exists "price_tiers_admin_all" on public.price_tiers;
create policy "price_tiers_admin_all"
  on public.price_tiers for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- in-app messages (admin → tutors)
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.message_category as enum ('employer', 'system');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.message_template as enum (
    'CUSTOM',
    'EWIDENCJA',
    'CENNIK',
    'PAYOUT',
    'WELCOME'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.admin_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.profiles (id) on delete set null,
  title text not null,
  body text not null,
  category public.message_category not null default 'employer',
  template public.message_template not null default 'CUSTOM',
  created_at timestamptz not null default now()
);

create table if not exists public.message_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.admin_messages (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (message_id, recipient_id)
);

create index if not exists admin_messages_created_idx on public.admin_messages (created_at desc);
create index if not exists message_recipients_recipient_idx on public.message_recipients (recipient_id);
create index if not exists message_recipients_unread_idx on public.message_recipients (recipient_id)
  where read_at is null;

alter table public.admin_messages enable row level security;
alter table public.message_recipients enable row level security;

drop policy if exists "admin_messages_admin_all" on public.admin_messages;
create policy "admin_messages_admin_all"
  on public.admin_messages for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

drop policy if exists "admin_messages_tutor_select" on public.admin_messages;
create policy "admin_messages_tutor_select"
  on public.admin_messages for select
  using (
    exists (
      select 1 from public.message_recipients mr
      where mr.message_id = admin_messages.id and mr.recipient_id = auth.uid()
    )
  );

drop policy if exists "message_recipients_admin_all" on public.message_recipients;
create policy "message_recipients_admin_all"
  on public.message_recipients for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

drop policy if exists "message_recipients_tutor_select" on public.message_recipients;
create policy "message_recipients_tutor_select"
  on public.message_recipients for select
  using (recipient_id = auth.uid());

drop policy if exists "message_recipients_tutor_update" on public.message_recipients;
create policy "message_recipients_tutor_update"
  on public.message_recipients for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
