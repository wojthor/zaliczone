-- ZALICZONE: finalna migracja PO 0004_payment_received_at.sql
-- Scalone: dokumenty/Storage, zamknięcie miesiąca, premie, daty umowy, koszty + załączniki.
-- Uruchom w Supabase SQL Editor. Idempotentne (bezpieczne przy ponownym uruchomieniu).

-- ---------------------------------------------------------------------------
-- 1) payment_received_at (gdyby 0004 nie był uruchomiony)
-- ---------------------------------------------------------------------------
alter table public.lessons
  add column if not exists payment_received_at date;

-- ---------------------------------------------------------------------------
-- 2) Daty umowy zlecenia na profilu nauczyciela
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists contract_start date,
  add column if not exists contract_end date;

-- ---------------------------------------------------------------------------
-- 3) closed_months — zamknięcie miesiąca księgowego
-- ---------------------------------------------------------------------------
create table if not exists public.closed_months (
  month text primary key,
  closed_at timestamptz not null default now(),
  closed_by uuid references public.profiles (id) on delete set null,
  checklist jsonb not null default '{}'::jsonb,
  notes text
);

alter table public.closed_months enable row level security;

drop policy if exists "closed_months_admin_all" on public.closed_months;
create policy "closed_months_admin_all"
  on public.closed_months for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

drop policy if exists "closed_months_tutor_select" on public.closed_months;
create policy "closed_months_tutor_select"
  on public.closed_months for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- 4) bonus_rules — konfiguracja premiowa
-- ---------------------------------------------------------------------------
create table if not exists public.bonus_rules (
  id uuid primary key default gen_random_uuid(),
  label text not null default 'Premia miesięczna',
  lessons_threshold int not null default 40,
  bonus_pln numeric(10, 2) not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.bonus_rules (label, lessons_threshold, bonus_pln, active)
select 'Premia za 40 lekcji', 40, 100, true
where not exists (select 1 from public.bonus_rules limit 1);

alter table public.bonus_rules enable row level security;

drop policy if exists "bonus_rules_select_auth" on public.bonus_rules;
create policy "bonus_rules_select_auth"
  on public.bonus_rules for select
  using (auth.uid() is not null);

drop policy if exists "bonus_rules_admin_all" on public.bonus_rules;
create policy "bonus_rules_admin_all"
  on public.bonus_rules for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

-- ---------------------------------------------------------------------------
-- 5) payouts: premia + podział kwot
-- ---------------------------------------------------------------------------
alter table public.payouts
  add column if not exists lessons_amount numeric(10, 2) not null default 0,
  add column if not exists bonus_amount numeric(10, 2) not null default 0,
  add column if not exists lesson_count int not null default 0,
  add column if not exists student_count int not null default 0;

-- ---------------------------------------------------------------------------
-- 6) document_folders / document_files — dysk dokumentów
-- ---------------------------------------------------------------------------
create table if not exists public.document_folders (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.document_folders (id) on delete cascade,
  name text not null,
  scope text not null check (scope in ('COMPANY', 'TUTOR')),
  tutor_id uuid references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists document_folders_parent_idx on public.document_folders (parent_id);
create index if not exists document_folders_tutor_idx on public.document_folders (tutor_id);

create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.document_folders (id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  scope text not null check (scope in ('COMPANY', 'TUTOR')),
  tutor_id uuid references public.profiles (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists document_files_folder_idx on public.document_files (folder_id);
create index if not exists document_files_tutor_idx on public.document_files (tutor_id);

alter table public.document_folders enable row level security;
alter table public.document_files enable row level security;

drop policy if exists "document_folders_admin_all" on public.document_folders;
create policy "document_folders_admin_all"
  on public.document_folders for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

drop policy if exists "document_folders_tutor_select" on public.document_folders;
create policy "document_folders_tutor_select"
  on public.document_folders for select
  using (
    scope = 'COMPANY'
    or (scope = 'TUTOR' and tutor_id = auth.uid())
  );

drop policy if exists "document_files_admin_all" on public.document_files;
create policy "document_files_admin_all"
  on public.document_files for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');

drop policy if exists "document_files_tutor_select" on public.document_files;
create policy "document_files_tutor_select"
  on public.document_files for select
  using (
    scope = 'COMPANY'
    or (scope = 'TUTOR' and tutor_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 7) Storage bucket documents (załączniki kosztów + dokumenty)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_storage_admin" on storage.objects;
create policy "documents_storage_admin"
  on storage.objects for all
  using (bucket_id = 'documents' and public.current_user_role() = 'ADMIN')
  with check (bucket_id = 'documents' and public.current_user_role() = 'ADMIN');

drop policy if exists "documents_storage_tutor_read" on storage.objects;
create policy "documents_storage_tutor_read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and (
      public.current_user_role() = 'ADMIN'
      or (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] = 'company'
    )
  );

-- ---------------------------------------------------------------------------
-- 8) operating_expenses — koszty + załączniki faktur/rachunków
-- ---------------------------------------------------------------------------
create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  invoice_date date not null,
  document_number text not null default '',
  expense_name text not null,
  issuer_name text not null,
  amount_pln numeric(10, 2) not null check (amount_pln >= 0),
  attachment_name text,
  attachment_path text,
  attachment_mime text,
  attachment_size_bytes bigint,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

-- Gdy tabela powstała wcześniej bez załączników:
alter table public.operating_expenses
  add column if not exists attachment_name text,
  add column if not exists attachment_path text,
  add column if not exists attachment_mime text,
  add column if not exists attachment_size_bytes bigint;

create index if not exists operating_expenses_month_idx on public.operating_expenses (month);
create index if not exists operating_expenses_invoice_date_idx on public.operating_expenses (invoice_date);

alter table public.operating_expenses enable row level security;

drop policy if exists "operating_expenses_admin_all" on public.operating_expenses;
create policy "operating_expenses_admin_all"
  on public.operating_expenses for all
  using (public.current_user_role() = 'ADMIN')
  with check (public.current_user_role() = 'ADMIN');
