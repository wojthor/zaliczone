-- Zdjęcie nauczyciela na landing (portret 3:4).
alter table public.profiles
  add column if not exists photo_url text;

comment on column public.profiles.photo_url is
  'Publiczny URL zdjęcia na landing (zalecane 900×1200, proporcje 3:4).';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'tutor-photos',
  'tutor-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tutor_photos_public_read" on storage.objects;
create policy "tutor_photos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'tutor-photos');

drop policy if exists "tutor_photos_admin_insert" on storage.objects;
create policy "tutor_photos_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tutor-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );

drop policy if exists "tutor_photos_admin_update" on storage.objects;
create policy "tutor_photos_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tutor-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );

drop policy if exists "tutor_photos_admin_delete" on storage.objects;
create policy "tutor_photos_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tutor-photos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'ADMIN'
    )
  );
