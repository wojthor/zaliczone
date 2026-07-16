-- Data wpływu płatności (ewidencja sprzedaży — kolumna „Data zapłaty”)
alter table public.lessons
  add column if not exists payment_received_at date;

comment on column public.lessons.payment_received_at is
  'Data wpływu na konto — ustawiana przy zatwierdzeniu w Rozliczeniach (VERIFIED).';
