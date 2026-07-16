-- ZALICZONE: daty umowy zlecenia na profilu nauczyciela
alter table public.profiles
  add column if not exists contract_start date,
  add column if not exists contract_end date;
