-- RLS test script (spec WP-2, extended for migrations 0011+). Run in Supabase → SQL Editor after all migrations.
-- It creates two temporary test users and records, acts as anonymous and signed-in users,
-- checks what each can and cannot do, deletes everything it created, and returns one row per check.
-- Every row should say PASS.

-- Clean up any leftovers from an interrupted earlier run.
delete from public.properties where title like 'RLS TEST%';
delete from public.organisations where name like 'RLS TEST%';
delete from auth.users where email in ('rls-owner@test.hagerland.invalid', 'rls-other@test.hagerland.invalid');

select set_config('hl.results', '', false);

create or replace function pg_temp.record_check(label text, ok boolean)
returns void language sql as $$
  select set_config('hl.results', current_setting('hl.results') || case when ok then 'PASS' else 'FAIL' end || ' · ' || label || E'\n', false)
$$;

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-8000-000000000001', 'rls-owner@test.hagerland.invalid', '{"full_name": "Owner Test"}'),
       ('00000000-0000-4000-8000-000000000002', 'rls-other@test.hagerland.invalid', '{"full_name": "Other Test"}');

select pg_temp.record_check('Signup trigger creates a profile',
  (select count(*) from public.profiles where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002')) = 2);

-- ---------- Owner (user 1) ----------
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);

insert into public.properties (id, slug, purpose, property_type, title, description, price_etb, location_id, lister_user_id, contact_phone, status)
select '00000000-0000-4000-8000-0000000000a1', 'rls-test-a1', 'sale', 'apartment', 'RLS TEST apartment', 'Test', 1000000,
  (select id from public.locations where path = 'addis-ababa/bole'), '00000000-0000-4000-8000-000000000001', '+251911000000', 'draft';
select pg_temp.record_check('Owner can create a draft listing',
  exists (select 1 from public.properties where id = '00000000-0000-4000-8000-0000000000a1'));

update public.properties set title = 'RLS TEST apartment edited' where id = '00000000-0000-4000-8000-0000000000a1';
select pg_temp.record_check('Owner can edit own draft',
  (select title from public.properties where id = '00000000-0000-4000-8000-0000000000a1') = 'RLS TEST apartment edited');

do $$ begin
  update public.properties set status = 'published' where id = '00000000-0000-4000-8000-0000000000a1';
  perform pg_temp.record_check('Owner cannot publish own listing', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Owner cannot publish own listing', true);
end $$;

do $$ begin
  update public.properties set is_featured = true where id = '00000000-0000-4000-8000-0000000000a1';
  perform pg_temp.record_check('Owner cannot set is_featured', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Owner cannot set is_featured', true);
end $$;

update public.properties set status = 'pending_review' where id = '00000000-0000-4000-8000-0000000000a1';
select pg_temp.record_check('Owner can submit for review',
  (select status from public.properties where id = '00000000-0000-4000-8000-0000000000a1') = 'pending_review');

insert into public.organisations (id, kind, name, slug, verification_level, status, is_hagerland, created_by)
values ('00000000-0000-4000-8000-0000000000b1', 'contractor', 'RLS TEST Builders', 'rls-test-builders', 'verified', 'published', true,
        '00000000-0000-4000-8000-000000000001');
select pg_temp.record_check('New organisation is forced to pending review, Listed, not HagerLand',
  (select status = 'pending_review' and verification_level = 'listed' and not is_hagerland
     from public.organisations where id = '00000000-0000-4000-8000-0000000000b1'));
select pg_temp.record_check('Creator becomes organisation owner',
  exists (select 1 from public.organisation_members where org_id = '00000000-0000-4000-8000-0000000000b1' and role = 'owner'));

do $$ begin
  update public.organisations set verification_level = 'verified' where id = '00000000-0000-4000-8000-0000000000b1';
  perform pg_temp.record_check('Owner cannot verify own organisation', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Owner cannot verify own organisation', true);
end $$;

-- ---------- Another user (user 2) ----------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);

with changed as (
  update public.properties set title = 'RLS TEST hijacked' where id = '00000000-0000-4000-8000-0000000000a1' returning 1
)
select pg_temp.record_check('Another user cannot edit the listing', (select count(*) from changed) = 0);
select pg_temp.record_check('Another user cannot see the draft listing',
  not exists (select 1 from public.properties where id = '00000000-0000-4000-8000-0000000000a1'));

with changed as (
  update public.organisations set name = 'RLS TEST hijacked' where id = '00000000-0000-4000-8000-0000000000b1' returning 1
)
select pg_temp.record_check('Non-member cannot edit the organisation', (select count(*) from changed) = 0);

-- ---------- Anonymous visitor ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
set role anon;

do $$ begin
  perform count(*) from public.properties;
  perform pg_temp.record_check('Anonymous cannot read the properties table', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Anonymous cannot read the properties table', true);
end $$;

do $$ begin
  perform count(*) from public.organisations;
  perform pg_temp.record_check('Anonymous cannot read the organisations table', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Anonymous cannot read the organisations table', true);
end $$;

do $$ begin
  perform count(*) from public.enquiries;
  perform pg_temp.record_check('Anonymous cannot read enquiries', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Anonymous cannot read enquiries', true);
end $$;

select pg_temp.record_check('Anonymous does not see unpublished listings in the public view',
  not exists (select 1 from public.properties_public where id = '00000000-0000-4000-8000-0000000000a1'));

do $$ begin
  perform contact_phone from public.properties_public limit 1;
  perform pg_temp.record_check('Public view has no contact columns', false);
exception when undefined_column then
  perform pg_temp.record_check('Public view has no contact columns', true);
end $$;

select pg_temp.record_check('Anonymous can read active locations', (select count(*) from public.locations) > 0);

do $$ begin
  update public.site_settings_public set value = '"changed"' where key = 'listing_expiry_days';
  perform pg_temp.record_check('Anonymous cannot change site settings through the public view', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Anonymous cannot change site settings through the public view', true);
end $$;

do $$ begin
  delete from public.media_public;
  perform pg_temp.record_check('Anonymous cannot delete media through the public view', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Anonymous cannot delete media through the public view', true);
end $$;

do $$ begin
  insert into public.properties_public (id) values (gen_random_uuid());
  perform pg_temp.record_check('Anonymous cannot insert into the public properties view', false);
-- Postgres refuses either for lack of permission or because this view is not insertable at all.
exception when insufficient_privilege or object_not_in_prerequisite_state then
  perform pg_temp.record_check('Anonymous cannot insert into the public properties view', true);
end $$;

-- ---------- HagerLand publishes the listing ----------
reset role;
update public.properties set status = 'published' where id = '00000000-0000-4000-8000-0000000000a1';
select pg_temp.record_check('Publishing sets published_at and a future expiry date',
  (select published_at is not null and expires_at > now() from public.properties where id = '00000000-0000-4000-8000-0000000000a1'));

set role anon;
select pg_temp.record_check('Anonymous sees the published listing in the public view',
  exists (select 1 from public.properties_public where id = '00000000-0000-4000-8000-0000000000a1'));
select pg_temp.record_check('Search function finds the published listing',
  (public.search_properties(p_q => 'RLS TEST') ->> 'total')::int >= 1);
select pg_temp.record_check('Search results contain no contact details',
  public.search_properties(p_q => 'RLS TEST')::text not like '%+251911000000%');

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin
  update public.properties set price_etb = 1 where id = '00000000-0000-4000-8000-0000000000a1';
  perform pg_temp.record_check('Owner cannot change a live listing directly', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Owner cannot change a live listing directly', true);
end $$;

update public.properties set pending_changes = '{"price_etb": 900000}' where id = '00000000-0000-4000-8000-0000000000a1';
select pg_temp.record_check('Owner can propose changes to a live listing',
  (select pending_changes is not null from public.properties where id = '00000000-0000-4000-8000-0000000000a1'));

update public.properties set status = 'paused' where id = '00000000-0000-4000-8000-0000000000a1';
select pg_temp.record_check('Owner can pause a live listing',
  (select status = 'paused' from public.properties where id = '00000000-0000-4000-8000-0000000000a1'));

-- ---------- International (0013): property listings stay in Ethiopia ----------
do $$ begin
  update public.properties set location_id = (select id from public.locations where path = 'united-kingdom/london') where id = '00000000-0000-4000-8000-0000000000a1';
  perform pg_temp.record_check('A listing cannot be moved outside Ethiopia', false);
exception when check_violation then
  perform pg_temp.record_check('A listing cannot be moved outside Ethiopia', true);
end $$;

-- ---------- Service requests (0014) ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
insert into public.service_requests (id, vertical_key, title, details, name, phone, email, requester_user_id)
values ('00000000-0000-4000-8000-0000000000c1', 'contractors', 'RLS TEST request', 'Fix the roof', 'Requester Two', '+251922000000', 'rls-other@test.hagerland.invalid', '00000000-0000-4000-8000-000000000002');
insert into public.service_request_matches (id, request_id, org_id, lead_fee_minor) values ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000b1', 50000);

-- The provider (user 1 owns organisation b1)
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Provider sees the request offered to them, without contact details',
  (select requester_phone is null and title = 'RLS TEST request' from public.service_requests_for_provider where match_id = '00000000-0000-4000-8000-0000000000c2'));
select pg_temp.record_check('Provider cannot read the request table directly', not exists (select 1 from public.service_requests where id = '00000000-0000-4000-8000-0000000000c1'));
do $$ begin
  perform lead_fee_minor from public.service_request_matches limit 1;
  perform pg_temp.record_check('Provider cannot read commercial fields', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Provider cannot read commercial fields', true);
end $$;
update public.service_request_matches set status = 'accepted', responded_at = now() where id = '00000000-0000-4000-8000-0000000000c2';
select pg_temp.record_check('Provider sees contact details after accepting',
  (select requester_phone = '+251922000000' from public.service_requests_for_provider where match_id = '00000000-0000-4000-8000-0000000000c2'));
do $$ begin
  update public.service_request_matches set status = 'won' where id = '00000000-0000-4000-8000-0000000000c2';
  perform pg_temp.record_check('Provider cannot mark their own match as won', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Provider cannot mark their own match as won', true);
end $$;
do $$ begin
  update public.service_request_matches set lead_fee_minor = 0 where id = '00000000-0000-4000-8000-0000000000c2';
  perform pg_temp.record_check('Provider cannot change commercial fields', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Provider cannot change commercial fields', true);
end $$;

-- The requester (user 2)
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Requester reads their own request', exists (select 1 from public.service_requests where id = '00000000-0000-4000-8000-0000000000c1'));
select pg_temp.record_check('Requester does not see a match before it is quoted', not exists (select 1 from public.service_request_matches where id = '00000000-0000-4000-8000-0000000000c2'));
select pg_temp.record_check('Requester is not shown the request in the provider view', not exists (select 1 from public.service_requests_for_provider where match_id = '00000000-0000-4000-8000-0000000000c2'));
reset role;
update public.service_request_matches set status = 'quoted', quote_amount_minor = 1500000, quote_currency = 'ETB', quoted_at = now() where id = '00000000-0000-4000-8000-0000000000c2';
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Requester sees the quote once it is sent', exists (select 1 from public.service_request_matches where id = '00000000-0000-4000-8000-0000000000c2' and quote_amount_minor = 1500000));
reset role;
delete from public.service_requests where id = '00000000-0000-4000-8000-0000000000c1';

-- ---------- Phase 1.5 tables (migrations 0011+) ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);

-- True when the current role is refused any read of the table.
create or replace function pg_temp.read_denied(tbl text)
returns boolean language plpgsql as $$
begin
  execute format('select 1 from public.%I limit 1', tbl);
  return false;
exception when insufficient_privilege then
  return true;
end $$;

-- Tables only the server (service role) may touch: anonymous and signed-in users are refused.
select set_config('hl.private_tables', 'schema_migrations,verticals,interest_registrations,partner_applications,exchange_rates,deals,property_care_requests,managed_properties,property_inspections,rent_statements,maintenance_log', false);

set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(string_to_array(current_setting('hl.private_tables'), ',')) as t(name);
-- Signed-in users read these through their own policies; anonymous visitors get nothing.
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['service_requests', 'service_request_matches', 'service_requests_for_provider']) as t(name);
select pg_temp.record_check('Anonymous can read exchange rates through the public view only', (select count(*) >= 0 from public.exchange_rates_public));
select pg_temp.record_check('Anonymous reads live and coming-soon verticals only',
  (select count(*) from public.verticals_public) > 0 and not exists (select 1 from public.verticals_public where status = 'hidden'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(string_to_array(current_setting('hl.private_tables'), ',')) as t(name);
do $$ begin
  update public.verticals_public set status = 'live' where key = 'finance';
  perform pg_temp.record_check('Signed-in user cannot change verticals through the public view', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Signed-in user cannot change verticals through the public view', true);
end $$;

-- ---------- Clean up ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
delete from public.properties where title like 'RLS TEST%';
delete from public.organisations where name like 'RLS TEST%';
delete from auth.users where email in ('rls-owner@test.hagerland.invalid', 'rls-other@test.hagerland.invalid');

select line as result
from unnest(string_to_array(trim(trailing E'\n' from current_setting('hl.results')), E'\n')) as line;
