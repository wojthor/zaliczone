-- Singleton ustawień działalności (tryb prawny NDG / JDG) dla panelu księgowości.
-- Uruchom ręcznie w SQL Editorze Supabase, jeśli migracje nie lecą automatycznie.

CREATE TABLE IF NOT EXISTS public.business_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  legal_mode text NOT NULL DEFAULT 'NDG' CHECK (legal_mode IN ('NDG', 'JDG')),
  jdg_registration_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.business_settings (id, legal_mode)
VALUES (1, 'NDG')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- Odczyt dla zalogowanych (panel admina czyta przez SSR client / service role przy zapisie).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'business_settings' AND policyname = 'business_settings_select_authenticated'
  ) THEN
    CREATE POLICY business_settings_select_authenticated
      ON public.business_settings
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
