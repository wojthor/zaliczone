-- Checkbox „test sprawdzony samodzielnie” + bezpieczne dodanie kolumny.
-- Uruchom w Supabase SQL Editor.

alter table public.candidates
  add column if not exists tests_reviewed_manually boolean not null default false;

comment on column public.candidates.tests_reviewed_manually is
  'Admin zaznaczył, że sprawdził wyniki testów ręcznie.';
