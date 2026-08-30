-- Data wysłania linków do testów (do liczenia terminu 3 dni roboczych).
-- Uruchom w Supabase SQL Editor.

alter table public.candidates
  add column if not exists test_sent_at date;

comment on column public.candidates.test_sent_at is
  'Data, kiedy admin wysłał kandydatowi linki do testów (podawana ręcznie w panelu).';
