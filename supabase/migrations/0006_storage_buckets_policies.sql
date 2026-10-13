-- 0006 · Storage buckets (spec 6.5, 19.1).
-- public-media: processed, EXIF-stripped WebP images only. Anyone can view; only the server writes.
-- private-docs: verification documents, materials lists, quote PDFs and raw uploads awaiting
--               processing. Never public; the server issues 10-minute signed links.
-- No storage.objects policies are created for anon or authenticated users, so neither can list,
-- upload, change or delete objects directly. Uploads use server-issued signed upload URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('public-media', 'public-media', true, 12582912, array['image/webp', 'image/jpeg', 'image/png']),
  ('private-docs', 'private-docs', false, 15728640, array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ])
on conflict (id) do nothing;
