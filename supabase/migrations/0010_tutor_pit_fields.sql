-- Dane identyfikacyjne i podatkowe nauczyciela (pod PIT-11 / rozliczenie roczne).
-- Uruchom ręcznie w SQL Editorze Supabase.
-- Nie wpływa na migracje 0006–0009 — tylko dopina kolumny do profiles (IF NOT EXISTS).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pesel text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS tax_street text,
  ADD COLUMN IF NOT EXISTS tax_postal_code text,
  ADD COLUMN IF NOT EXISTS tax_city text,
  ADD COLUMN IF NOT EXISTS tax_country text DEFAULT 'Polska',
  ADD COLUMN IF NOT EXISTS tax_office text,
  ADD COLUMN IF NOT EXISTS nip text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS tax_year_data jsonb DEFAULT '{}'::jsonb;

-- employment_type: UMOWA_ZLECENIE | UMOWA_O_PRACE | UMOWA_DZIELO | B2B
-- tax_year_data: { "2025": { "deductibleCostsPln": 0, "taxAdvancesPln": 0,
--   "zusSocialPln": 0, "zusHealthPln": 0, "reliefYoung": false, "notes": "" } }
