-- Ewidencja PDF odblokowuje się datą (DATES.ewidencja.unlockDayOfNextMonth),
-- nie ręcznym flagowaniem przez koordynatora.
alter table public.profiles
  drop column if exists ewidencja_unlocked_for_month;
