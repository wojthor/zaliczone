-- Metoda płatności ustawiana przy zatwierdzaniu lekcji (Rozliczenia).
-- Wymagane przez wydruk Ewidencji Sprzedaży (kolumna "Metoda płatności").
alter table public.lessons
  add column if not exists payment_method text;

alter table public.lessons
  drop constraint if exists lessons_payment_method_check;

alter table public.lessons
  add constraint lessons_payment_method_check
  check (payment_method is null or payment_method in ('Przelew tradycyjny', 'BLIK', 'Przelewy24', 'Gotówka'));
