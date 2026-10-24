-- Local test data for Imports compliance (Google Places data): businesses imported from Google in every state.
-- LOCAL COPY ONLY (scripts/seed-imports-local.sh refuses anything else). Resets only its own fixed rows each run.
-- The details below are invented and stand in for what the old Imports tool stored from Google.

delete from public.organisations where id::text like '1ab00000-0000-4000-8000-%';
delete from public.import_log where google_place_id like 'ChIJseedImport%';

create temporary table seed_places on commit drop as
select (select id from public.locations where path = 'addis-ababa/bole') as bole, (select id from public.locations where path = 'addis-ababa/kirkos') as kirkos;

-- id suffix, name, status, days since import, place id, extra
insert into public.organisations (id, kind, name, slug, phone, website, address_line, lat, lng, description, location_id, google_place_id, source, status, verification_level, claimed_at, created_at)
select v.id::uuid, 'supplier', v.name, v.slug, v.phone, v.website, v.address, v.lat, v.lng, v.description, p.bole, v.place, v.source, v.status::public.listing_status, 'listed', v.claimed, now() - (v.days || ' days')::interval
from seed_places p, (values
  ('1ab00000-0000-4000-8000-000000000001', 'Fresh Import Cement (seed)', 'fresh-import-cement-seed', '+251911700001', 'https://fresh.example', 'Bole Road, Addis Ababa', 9.01::numeric, 38.76::numeric, 'Fresh Import Cement sells cement and blocks in Bole. Text written by AI from Google data.', 'ChIJseedImport000001', 'import', 'draft', null::timestamptz, 5),
  ('1ab00000-0000-4000-8000-000000000002', 'Near Expiry Steel (seed)', 'near-expiry-steel-seed', '+251911700002', null, 'Kirkos, Addis Ababa', 9.00, 38.75, 'Near Expiry Steel sells rebar in Kirkos. Text written by AI from Google data.', 'ChIJseedImport000002', 'import', 'pending_review', null, 25),
  ('1ab00000-0000-4000-8000-000000000003', 'Expired Private Blocks (seed)', 'expired-private-blocks-seed', '+251911700003', 'https://expired.example', 'Megenagna, Addis Ababa', 9.02, 38.80, 'Expired Private Blocks makes hollow blocks. Text written by AI from Google data.', 'ChIJseedImport000003', 'import', 'draft', null, 40),
  ('1ab00000-0000-4000-8000-000000000004', 'Expired Public Tiles (seed)', 'expired-public-tiles-seed', '+251911700004', 'https://tiles.example', 'Piassa, Addis Ababa', 9.03, 38.74, 'Expired Public Tiles sells floor and wall tiles in Piassa. Text written by AI from Google data.', 'ChIJseedImport000004', 'import', 'published', null, 40),
  ('1ab00000-0000-4000-8000-000000000005', 'Partly Confirmed Paint', 'partly-confirmed-paint', '+251911700005', 'https://paint.example', 'Sarbet, Addis Ababa', 9.00, 38.73, null, 'ChIJseedImport000005', 'import', 'draft', null, 40),
  ('1ab00000-0000-4000-8000-000000000006', 'Fully Confirmed Glass', 'fully-confirmed-glass', '+251911700006', null, 'CMC, Addis Ababa', null, null, 'Fully Confirmed Glass cuts and fits glass in CMC (written by HagerLand).', 'ChIJseedImport000006', 'import', 'published', null, 60),
  ('1ab00000-0000-4000-8000-000000000007', 'Expired Supply Partner Sand (seed)', 'expired-supply-partner-sand-seed', '+251911700007', null, 'Kality, Addis Ababa', 8.95, 38.77, 'Expired Supply Partner Sand delivers sand. Text written by AI from Google data.', 'ChIJseedImport000007', 'import', 'draft', null, 45),
  ('1ab00000-0000-4000-8000-000000000008', 'Not Imported Hardware (seed)', 'not-imported-hardware-seed', '+251911700008', 'https://hardware.example', 'Bole, Addis Ababa', 9.01, 38.78, 'Added by HagerLand by hand, never from Google.', null, 'admin', 'draft', null, 90),
  ('1ab00000-0000-4000-8000-000000000009', 'Unconfirmed lead — refetch from Google', 'unconfirmed-lead-seed09', null, null, null, null, null, null, 'ChIJseedImport000009', 'import', 'draft', null, 2),
  ('1ab00000-0000-4000-8000-000000000010', 'Expired Claimed Doors (seed)', 'expired-claimed-doors-seed', '+251911700010', null, 'Ayat, Addis Ababa', 9.04, 38.86, null, 'ChIJseedImport000010', 'import', 'draft', now() - interval '20 days', 50)
) as v(id, name, slug, phone, website, address, lat, lng, description, place, source, status, claimed, days);

insert into public.supply_partners (org_id, relationship_status, roles) values ('1ab00000-0000-4000-8000-000000000007', 'contacted', '{wholesaler}');

-- Where each detail came from: Google (fetched at import) unless marked confirmed below.
insert into public.org_field_sources (org_id, field, source, place_id, fetched_at, confirmed_at, confirmed_by, confirm_method, note)
select o.id, f.field,
  case when (o.id::text like '%05' and f.field in ('name', 'phone')) or o.id::text like '%06' then 'confirmed_with_business' else 'google_places' end,
  o.google_place_id, o.created_at,
  case when (o.id::text like '%05' and f.field in ('name', 'phone')) or o.id::text like '%06' then now() - interval '3 days' end,
  case when (o.id::text like '%05' and f.field in ('name', 'phone')) or o.id::text like '%06' then 'Seed staff' end,
  case when (o.id::text like '%05' and f.field in ('name', 'phone')) or o.id::text like '%06' then 'phone' end,
  'seed'
from public.organisations o
cross join lateral unnest(array_remove(array['name',
  case when o.phone is not null then 'phone' end, case when o.address_line is not null then 'address_line' end,
  case when o.website is not null then 'website' end, case when o.description is not null then 'description' end,
  case when o.lat is not null then 'lat_lng' end], null)) as f(field)
where o.id::text like '1ab00000-0000-4000-8000-%' and o.source = 'import' and o.id::text not like '%09';
-- The partly confirmed business: its address was fetched again 10 days ago (within 30 days).
update public.org_field_sources set fetched_at = now() - interval '10 days' where org_id = '1ab00000-0000-4000-8000-000000000005' and field = 'address_line';

-- The old Imports tool copied business names into the import history.
insert into public.import_log (google_place_id, section, status, listing_id, listing_name, entity_type, imported_at)
select o.google_place_id, 'org_supplier', 'imported', o.id::text, o.name, 'organisation', o.created_at
from public.organisations o where o.id::text like '1ab00000-0000-4000-8000-%' and o.google_place_id is not null and o.id::text not like '%09';
insert into public.import_log (google_place_id, section, status, listing_id, listing_name, entity_type, imported_at)
values ('ChIJseedImport000009', 'org_supplier', 'imported', '1ab00000-0000-4000-8000-000000000009', '', 'organisation', now() - interval '2 days');
