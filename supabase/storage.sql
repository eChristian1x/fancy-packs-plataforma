-- Almacenamiento de Fancy Packs en Supabase Storage (se aplica una vez, desde el editor SQL).
-- Dos buckets de lectura pública. Cada usuario solo puede subir, ver en la API y borrar
-- dentro de su carpeta: <id del usuario>/…
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('archivos', 'archivos', true, 52428800, array['application/zip', 'application/java-archive', 'application/x-zip-compressed', 'application/octet-stream']),
  ('imagenes', 'imagenes', true, 8388608, array['image/webp', 'image/png', 'image/jpeg', 'image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists fp_subir_propio on storage.objects;
drop policy if exists fp_ver_propio on storage.objects;
drop policy if exists fp_borrar_propio on storage.objects;

create policy fp_subir_propio on storage.objects for insert to authenticated
  with check (bucket_id in ('archivos', 'imagenes') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy fp_ver_propio on storage.objects for select to authenticated
  using (bucket_id in ('archivos', 'imagenes') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy fp_borrar_propio on storage.objects for delete to authenticated
  using (bucket_id in ('archivos', 'imagenes') and (storage.foldername(name))[1] = (select auth.uid())::text);
