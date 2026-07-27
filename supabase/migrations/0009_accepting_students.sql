-- Dostępność nauczyciela: czy chce przyjmować dodatkowych uczniów.
alter table public.profiles
  add column if not exists accepting_students boolean not null default true;

comment on column public.profiles.accepting_students is
  'Czy nauczyciel chce przyjmować nowych / dodatkowych uczniów (widoczne dla admina).';
