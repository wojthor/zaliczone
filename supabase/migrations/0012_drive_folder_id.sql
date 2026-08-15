-- Google Drive: folder nauczyciela na prywatnym dysku (nakładka ZALICZONE).
alter table public.profiles
  add column if not exists drive_folder_id text;

comment on column public.profiles.drive_folder_id is
  'ID folderu Google Drive (zaliczone/nauczyciele/<Imię Nazwisko>). Null = jeszcze nie zsynchronizowano.';
