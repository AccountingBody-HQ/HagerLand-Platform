-- RLS test script (spec WP-2, extended for migrations 0011+). Run in Supabase → SQL Editor after all migrations.
-- It creates two temporary test users and records, acts as anonymous and signed-in users,
-- checks what each can and cannot do, deletes everything it created, and returns one row per check.
-- Every row should say PASS.

-- Clean up any leftovers from an interrupted earlier run.
delete from public.properties where title like 'RLS TEST%';
delete from public.employer_verifications where organisation_id in (select id from public.organisations where name like 'RLS TEST%');
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

-- ---------- Saved items and searches (0017) ----------
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
insert into public.saved_items (user_id, entity_type, entity_id) values ('00000000-0000-4000-8000-000000000001', 'property', '00000000-0000-4000-8000-0000000000a1');
insert into public.saved_searches (user_id, name, params) values ('00000000-0000-4000-8000-000000000001', 'RLS TEST search', '{"purpose":"sale"}');
select pg_temp.record_check('User saves a property and a search', (select count(*) from public.saved_items) = 1 and (select count(*) from public.saved_searches where name = 'RLS TEST search') = 1);
do $$ begin
  perform unsubscribe_token from public.saved_searches limit 1;
  perform pg_temp.record_check('User cannot read alert unsubscribe tokens', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('User cannot read alert unsubscribe tokens', true);
end $$;
do $$ begin
  insert into public.saved_items (user_id, entity_type, entity_id) values ('00000000-0000-4000-8000-000000000002', 'property', '00000000-0000-4000-8000-0000000000a1');
  perform pg_temp.record_check('User cannot save items for someone else', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('User cannot save items for someone else', true);
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Another user sees none of those saved items or searches', (select count(*) from public.saved_items) = 0 and (select count(*) from public.saved_searches) = 0);
reset role;
delete from public.saved_searches where name = 'RLS TEST search';
delete from public.saved_items where user_id = '00000000-0000-4000-8000-000000000001';

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

-- ---------- Jobs, applications, candidates, development updates (0019) ----------
reset role;
-- The employer organisation (owned by user 1) is approved and live for these checks.
update public.organisations set status = 'published' where id = '00000000-0000-4000-8000-0000000000b1';
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
insert into public.job_posts (id, slug, employer_org_id, title, category, employment_type, location_id, description, status)
select '00000000-0000-4000-8000-0000000000d1', 'rls-test-job', '00000000-0000-4000-8000-0000000000b1', 'RLS TEST site engineer', 'engineering', 'full_time',
  (select id from public.locations where path = 'addis-ababa/bole'), 'A test job description that is long enough to pass.', 'pending_review';
select pg_temp.record_check('Employer member can post a job for review', exists (select 1 from public.job_posts where id = '00000000-0000-4000-8000-0000000000d1'));
do $$ begin
  update public.job_posts set status = 'published' where id = '00000000-0000-4000-8000-0000000000d1';
  perform pg_temp.record_check('Employer cannot publish their own job', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Employer cannot publish their own job', true);
end $$;
reset role;
update public.job_posts set status = 'published' where id = '00000000-0000-4000-8000-0000000000d1';
select pg_temp.record_check('Approving a job sets its expiry', (select expires_at > now() + interval '59 days' from public.job_posts where id = '00000000-0000-4000-8000-0000000000d1'));
insert into public.job_applications (id, job_id, applicant_user_id, name, email, cv_path)
values ('00000000-0000-4000-8000-0000000000d2', '00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000002', 'Other Test', 'rls-other@test.hagerland.invalid', 'docs/cv/00000000-0000-4000-8000-000000000002/test.pdf');
set role authenticated;
select pg_temp.record_check('Employer reads applications to their job', exists (select 1 from public.job_applications where id = '00000000-0000-4000-8000-0000000000d2'));
update public.job_applications set status = 'shortlisted' where id = '00000000-0000-4000-8000-0000000000d2';
select pg_temp.record_check('Employer can shortlist an application', (select status from public.job_applications where id = '00000000-0000-4000-8000-0000000000d2') = 'shortlisted');
do $$ begin
  update public.job_applications set cv_path = 'docs/cv/x.pdf' where id = '00000000-0000-4000-8000-0000000000d2';
  perform pg_temp.record_check('Employer cannot change the applicant''s CV', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Employer cannot change the applicant''s CV', true);
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Applicant reads their own application', exists (select 1 from public.job_applications where id = '00000000-0000-4000-8000-0000000000d2'));
do $$ begin
  insert into public.job_applications (job_id, applicant_user_id, name, email) values ('00000000-0000-4000-8000-0000000000d1', '00000000-0000-4000-8000-000000000002', 'Again', 'a@test.invalid');
  perform pg_temp.record_check('Applications are only created by the server', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Applications are only created by the server', true);
end $$;
with changed as (update public.job_posts set title = 'RLS TEST hijacked' where id = '00000000-0000-4000-8000-0000000000d1' returning 1)
select pg_temp.record_check('Non-member cannot edit the job', (select count(*) from changed) = 0);
insert into public.candidate_profiles (user_id, full_name, skills, cv_path) values ('00000000-0000-4000-8000-000000000002', 'Other Test', '{AutoCAD}', 'docs/cv/00000000-0000-4000-8000-000000000002/test.pdf');
select pg_temp.record_check('Candidate profile is private by default', (select visibility from public.candidate_profiles where user_id = '00000000-0000-4000-8000-000000000002') = 'private');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Employer cannot read candidate profiles directly', not exists (select 1 from public.candidate_profiles));
select pg_temp.record_check('Private candidates are not shown to employers', not exists (select 1 from public.candidates_for_employers));
reset role;
update public.candidate_profiles set visibility = 'employers' where user_id = '00000000-0000-4000-8000-000000000002';
set role authenticated;
select pg_temp.record_check('Opted-in candidates are shown to employers', exists (select 1 from public.candidates_for_employers where candidate_id = '00000000-0000-4000-8000-000000000002'));
do $$ begin
  perform cv_path from public.candidates_for_employers limit 1;
  perform pg_temp.record_check('Employers never see candidate CVs', false);
exception when undefined_column then
  perform pg_temp.record_check('Employers never see candidate CVs', true);
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Users who are not employers see no candidates', not exists (select 1 from public.candidates_for_employers));
reset role;
set role anon;
select pg_temp.record_check('Anonymous sees the approved job in the public view', exists (select 1 from public.jobs_public where id = '00000000-0000-4000-8000-0000000000d1'));
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['job_posts', 'job_applications', 'candidate_profiles', 'candidates_for_employers', 'development_updates']) as t(name);
reset role;
update public.job_posts set status = 'paused' where id = '00000000-0000-4000-8000-0000000000d1';
set role anon;
select pg_temp.record_check('Paused jobs leave the public view', not exists (select 1 from public.jobs_public where id = '00000000-0000-4000-8000-0000000000d1'));
-- ---------- Jobs Phase 2 (0040): phone applications, worker register, deletion log, stricter visibility ----------
reset role;
insert into public.job_applications (id, job_id, applicant_user_id, channel, name, phone, email, trade, area_text, preferred_contact, language, adult_confirmed_at, consent_at)
values ('00000000-0000-4000-8000-0000000000d3', '00000000-0000-4000-8000-0000000000d1', null, 'phone', 'RLS Phone Applicant', '+251911000099', null, 'mason', 'Bole', 'call', 'am', now(), now());
do $$ begin
  insert into public.job_applications (job_id, applicant_user_id, channel, name, phone, trade) values ('00000000-0000-4000-8000-0000000000d1', null, 'phone', 'No Ticks', '+251911000098', 'mason');
  perform pg_temp.record_check('A phone application needs the 18+ and consent ticks', false);
exception when check_violation then
  perform pg_temp.record_check('A phone application needs the 18+ and consent ticks', true);
end $$;
do $$ begin
  insert into public.job_applications (job_id, applicant_user_id, channel, name, phone, adult_confirmed_at, consent_at) values ('00000000-0000-4000-8000-0000000000d1', null, 'phone', 'Twice', '+251911000099', now(), now());
  perform pg_temp.record_check('One phone application per job per phone number', false);
exception when unique_violation then
  perform pg_temp.record_check('One phone application per job per phone number', true);
end $$;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Employer reads the phone application to their job', exists (select 1 from public.job_applications where id = '00000000-0000-4000-8000-0000000000d3'));
do $$ begin
  update public.job_applications set phone = '+251900000000' where id = '00000000-0000-4000-8000-0000000000d3';
  perform pg_temp.record_check('Employer cannot change a phone applicant''s number', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Employer cannot change a phone applicant''s number', true);
end $$;
select pg_temp.record_check('Employer cannot read or add to ' || name, pg_temp.read_denied(name)) from unnest(array['worker_register', 'job_data_cleanup_runs']) as t(name);
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Another signed-in user cannot read phone applications (no account on them)', not exists (select 1 from public.job_applications where applicant_user_id is null));
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['worker_register', 'job_data_cleanup_runs']) as t(name);
do $$ begin
  insert into public.worker_register (name, phone, trades, area_text, availability, preferred_contact, language, adult_confirmed_at, consent_at) values ('RLS', '+251911000097', '{mason}', 'Bole', 'now', 'call', 'am', now(), now());
  perform pg_temp.record_check('Signed-in user cannot join the register directly (server only)', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Signed-in user cannot join the register directly (server only)', true);
end $$;
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['worker_register', 'job_data_cleanup_runs']) as t(name);
reset role;
-- Decision 2: an employer whose only approved job HagerLand removed no longer sees candidates; a verified one does.
update public.job_posts set status = 'removed' where id = '00000000-0000-4000-8000-0000000000d1';
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Employer whose only approved job was removed sees no candidates', not exists (select 1 from public.candidates_for_employers));
reset role;
-- Jobs Phase 4 (0042): the badge needs a recorded check first.
insert into public.employer_verifications (organisation_id, licence_number, licence_checked_at, licence_check_method, tin_checked_at, phone_checked_at, verified_by, valid_until)
values ('00000000-0000-4000-8000-0000000000b1', 'RLS-1', now(), 'document', now(), now(), 'rls', (now() at time zone 'Africa/Addis_Ababa')::date + 30);
update public.organisations set verification_level = 'verified' where id = '00000000-0000-4000-8000-0000000000b1';
set role authenticated;
select pg_temp.record_check('A verified employer sees opted-in candidates', exists (select 1 from public.candidates_for_employers where candidate_id = '00000000-0000-4000-8000-000000000002'));
reset role;
-- Jobs Phase 4: decision #2 follows the badge. When the badge ends (level lowered), candidate access ends with it.
update public.organisations set verification_level = 'claimed' where id = '00000000-0000-4000-8000-0000000000b1';
set role authenticated;
select pg_temp.record_check('When the Verified badge ends, candidate access ends with it (decision #2 follows the level)', not exists (select 1 from public.candidates_for_employers));
reset role;

reset role;
delete from public.candidate_profiles where user_id = '00000000-0000-4000-8000-000000000002';
delete from public.job_posts where id = '00000000-0000-4000-8000-0000000000d1';

-- ---------- Special Buys and trade accounts (0020) ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
insert into public.organisations (id, kind, name, slug, status, created_by) values ('00000000-0000-4000-8000-0000000000e1', 'supplier', 'RLS TEST Supplier', 'rls-test-supplier', 'published', null);
insert into public.organisation_members (org_id, user_id, role) values ('00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-000000000001', 'owner');
insert into public.products (id, slug, name, category_id, seller_org_id, price_type, price_etb_cents, trade_price_etb_cents, status)
select '00000000-0000-4000-8000-0000000000e2', 'rls-test-product', 'RLS TEST cement', id, '00000000-0000-4000-8000-0000000000e1', 'fixed', 100000, 80000, 'published' from public.product_categories where parent_id is null order by sort limit 1;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
do $$ begin
  update public.products set is_special_buy = true where id = '00000000-0000-4000-8000-0000000000e2';
  perform pg_temp.record_check('Supplier cannot put their own product on Special Buy', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Supplier cannot put their own product on Special Buy', true);
end $$;
select pg_temp.record_check('Users without a trade account get no trade prices', not exists (select 1 from public.product_trade_prices(array['00000000-0000-4000-8000-0000000000e2']::uuid[])));
do $$ begin
  insert into public.trade_accounts (user_id, business_name, trade_type, phone, status) values ('00000000-0000-4000-8000-000000000001', 'RLS TEST', 'Contractor', '+251911000000', 'approved');
  perform pg_temp.record_check('Users cannot approve their own trade account', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Users cannot approve their own trade account', true);
end $$;
reset role;
insert into public.trade_accounts (user_id, business_name, trade_type, phone, status) values ('00000000-0000-4000-8000-000000000001', 'RLS TEST', 'Contractor', '+251911000000', 'approved');
set role authenticated;
select pg_temp.record_check('Approved trade accounts see trade prices', (select trade_price_etb_cents from public.product_trade_prices(array['00000000-0000-4000-8000-0000000000e2']::uuid[])) = 80000);
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Other users cannot read someone else''s trade account', not exists (select 1 from public.trade_accounts));
reset role;
set role anon;
do $$ begin
  perform * from public.product_trade_prices(array['00000000-0000-4000-8000-0000000000e2']::uuid[]);
  perform pg_temp.record_check('Anonymous cannot call the trade price function', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Anonymous cannot call the trade price function', true);
end $$;
do $$ begin
  perform trade_price_etb_cents from public.products_public limit 1;
  perform pg_temp.record_check('Trade prices are not in the public product view', false);
exception when undefined_column then
  perform pg_temp.record_check('Trade prices are not in the public product view', true);
end $$;
reset role;
update public.products set is_special_buy = true, special_ends_at = now() - interval '1 day' where id = '00000000-0000-4000-8000-0000000000e2';
set role anon;
select pg_temp.record_check('Expired Special Buys are hidden', not exists (select 1 from public.special_buys_public where id = '00000000-0000-4000-8000-0000000000e2'));
reset role;
update public.products set special_ends_at = now() + interval '7 days', special_qty_available = 0 where id = '00000000-0000-4000-8000-0000000000e2';
set role anon;
select pg_temp.record_check('Sold-out Special Buys are hidden', not exists (select 1 from public.special_buys_public where id = '00000000-0000-4000-8000-0000000000e2'));
reset role;
update public.products set special_qty_available = 5 where id = '00000000-0000-4000-8000-0000000000e2';
set role anon;
select pg_temp.record_check('Live Special Buys are shown', exists (select 1 from public.special_buys_public where id = '00000000-0000-4000-8000-0000000000e2'));
reset role;
delete from public.trade_accounts where business_name = 'RLS TEST';
delete from public.products where id = '00000000-0000-4000-8000-0000000000e2';
delete from public.organisations where id = '00000000-0000-4000-8000-0000000000e1';

-- ---------- Teams and branches (0022) ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
insert into public.organisations (id, kind, name, slug, status) values ('00000000-0000-4000-8000-0000000000f2', 'agency', 'RLS TEST Agency', 'rls-test-agency', 'published');
insert into public.organisation_members (org_id, user_id, role) values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000001', 'owner'), ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000002', 'member');
insert into public.org_invitations (org_id, email, role, token_hash) values ('00000000-0000-4000-8000-0000000000f2', 'invitee@test.hagerland.invalid', 'member', 'rls-test-hash');
do $$ begin
  delete from public.organisation_members where org_id = '00000000-0000-4000-8000-0000000000f2' and user_id = '00000000-0000-4000-8000-000000000001';
  perform pg_temp.record_check('The last owner cannot be removed', false);
exception when raise_exception then
  perform pg_temp.record_check('The last owner cannot be removed', true);
end $$;
do $$ begin
  update public.organisation_members set role = 'admin' where org_id = '00000000-0000-4000-8000-0000000000f2' and user_id = '00000000-0000-4000-8000-000000000001';
  perform pg_temp.record_check('The last owner cannot be demoted', false);
exception when raise_exception then
  perform pg_temp.record_check('The last owner cannot be demoted', true);
end $$;
update public.organisation_members set role = 'owner' where org_id = '00000000-0000-4000-8000-0000000000f2' and user_id = '00000000-0000-4000-8000-000000000002';
update public.organisation_members set role = 'admin' where org_id = '00000000-0000-4000-8000-0000000000f2' and user_id = '00000000-0000-4000-8000-000000000001';
select pg_temp.record_check('Ownership can move to another member', (select role from public.organisation_members where org_id = '00000000-0000-4000-8000-0000000000f2' and user_id = '00000000-0000-4000-8000-000000000002') = 'owner');
update public.organisation_members set role = 'member' where org_id = '00000000-0000-4000-8000-0000000000f2' and user_id = '00000000-0000-4000-8000-000000000001';
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Plain members do not see invitations', not exists (select 1 from public.org_invitations where org_id = '00000000-0000-4000-8000-0000000000f2'));
do $$ begin
  insert into public.org_branches (org_id, name) values ('00000000-0000-4000-8000-0000000000f2', 'RLS TEST branch');
  perform pg_temp.record_check('Plain members cannot add branches', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Plain members cannot add branches', true);
end $$;
do $$ begin
  insert into public.organisation_members (org_id, user_id, role) values ('00000000-0000-4000-8000-0000000000f2', '00000000-0000-4000-8000-000000000001', 'owner');
  perform pg_temp.record_check('Users cannot make themselves owners', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Users cannot make themselves owners', true);
end $$;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Owners see their invitations', exists (select 1 from public.org_invitations where org_id = '00000000-0000-4000-8000-0000000000f2'));
do $$ begin
  perform token_hash from public.org_invitations limit 1;
  perform pg_temp.record_check('Invitation tokens are never readable', false);
exception when insufficient_privilege then
  perform pg_temp.record_check('Invitation tokens are never readable', true);
end $$;
insert into public.org_branches (org_id, name, phone) values ('00000000-0000-4000-8000-0000000000f2', 'RLS TEST branch', '+251911000000');
select pg_temp.record_check('Owners add branches', exists (select 1 from public.org_branches where name = 'RLS TEST branch'));
reset role;
set role anon;
select pg_temp.record_check('Anonymous sees branch names of published organisations', exists (select 1 from public.org_branches_public where name = 'RLS TEST branch'));
do $$ begin
  perform phone from public.org_branches_public limit 1;
  perform pg_temp.record_check('Branch phone numbers are not public', false);
exception when undefined_column then
  perform pg_temp.record_check('Branch phone numbers are not public', true);
end $$;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['org_invitations', 'org_branches', 'trade_accounts', 'guides', 'build_cost_rates']) as t(name);
reset role;
delete from public.organisations where id = '00000000-0000-4000-8000-0000000000f2';
select pg_temp.record_check('Deleting an organisation removes its members', not exists (select 1 from public.organisation_members where org_id = '00000000-0000-4000-8000-0000000000f2'));

-- ---------- Suspended users are blocked from every write (spec 6.5, 25.4) ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
update public.profiles set is_suspended = true where id = '00000000-0000-4000-8000-000000000002';
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
create or replace function pg_temp.write_denied(sql text)
returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when insufficient_privilege then
  return true;
end $$;
select pg_temp.record_check('Suspended user cannot ' || label, pg_temp.write_denied(sql)) from (values
  ('create a listing', $q$insert into public.properties (slug, purpose, property_type, title, description, price_etb, location_id, lister_user_id, contact_phone, status) select 'rls-test-suspended', 'sale', 'apartment', 'RLS TEST suspended', 'Test', 1, id, '00000000-0000-4000-8000-000000000002', '+251911000000', 'draft' from public.locations where path = 'addis-ababa/bole'$q$),
  ('create an organisation', $q$insert into public.organisations (kind, name, slug, created_by) values ('contractor', 'RLS TEST suspended org', 'rls-test-suspended-org', '00000000-0000-4000-8000-000000000002')$q$),
  ('save items', $q$insert into public.saved_items (user_id, entity_type, entity_id) values ('00000000-0000-4000-8000-000000000002', 'property', gen_random_uuid())$q$),
  ('save searches', $q$insert into public.saved_searches (user_id, name, params) values ('00000000-0000-4000-8000-000000000002', 'RLS TEST', '{}')$q$),
  ('create a candidate profile', $q$insert into public.candidate_profiles (user_id, full_name) values ('00000000-0000-4000-8000-000000000002', 'Suspended')$q$),
  ('keep a quote list', $q$insert into public.quote_lists (user_id, items) values ('00000000-0000-4000-8000-000000000002', '[]')$q$)
) as t(label, sql);
reset role;
update public.profiles set is_suspended = false where id = '00000000-0000-4000-8000-000000000002';

-- ---------- Every new table has row level security; views are read-only (spec 25.4) ----------
reset role;
select pg_temp.record_check('Every table created by the relaunch has row level security switched on',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
      -- Legacy tables of the old site (Section 20) are handled by the legacy lockdown migration.
      and c.relname not in ('import_log', 'rate_limits', 'companies', 'jobs_legacy', 'housing', 'money', 'cars', 'tutors', 'community', 'events', 'delivery', 'made_in_ethiopia', 'business_claims', 'listing_enquiries', 'admin_audit', 'countries')
  ));
select pg_temp.record_check('No public view can be written by visitors or signed-in users',
  not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE') or has_table_privilege('anon', c.oid, 'DELETE')
        or has_table_privilege('authenticated', c.oid, 'INSERT') or has_table_privilege('authenticated', c.oid, 'UPDATE') or has_table_privilege('authenticated', c.oid, 'DELETE'))
  ));

-- Tables only the server (service role) may touch: anonymous and signed-in users are refused.
select set_config('hl.private_tables', 'schema_migrations,verticals,interest_registrations,partner_applications,exchange_rates,deals,property_care_requests,managed_properties,property_inspections,rent_statements,maintenance_log,build_cost_rates', false);

set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(string_to_array(current_setting('hl.private_tables'), ',')) as t(name);
-- Signed-in users read these through their own policies; anonymous visitors get nothing.
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['service_requests', 'service_request_matches', 'service_requests_for_provider', 'saved_items', 'saved_searches', 'quote_lists']) as t(name);
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

-- ---------- Section 26: pillars, modes and stage gates (0027) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['pillars', 'pillar_services', 'pillar_gate_checks', 'organisation_pillars']) as t(name);
select pg_temp.record_check('Anonymous reads visible pillars only, with their modes',
  (select count(*) from public.pillars_public) > 0 and not exists (select 1 from public.pillars_public where status = 'hidden'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['pillars', 'pillar_services', 'pillar_gate_checks']) as t(name);
select pg_temp.record_check('Signed-in user cannot add a pillar to an organisation they are not in',
  pg_temp.write_denied($q$insert into public.organisation_pillars (org_id, pillar_key) values ('00000000-0000-4000-8000-0000000000b1', 'build')$q$));
reset role;
do $$ begin
  update public.pillars set aggregate_enabled = true where key = 'finance' and not aggregate_enabled;
  perform pg_temp.record_check('Aggregate cannot be switched on without a completed stage gate', not exists (select 1 from public.pillars where key = 'finance' and aggregate_enabled));
exception when insufficient_privilege then
  perform pg_temp.record_check('Aggregate cannot be switched on without a completed stage gate', true);
end $$;

-- ---------- Section 26: estate agency and lettings (0028) ----------
reset role;
select set_config('hl.agency_tables', 'agency_contacts,applicant_requirements,agency_instructions,agency_valuations,agency_viewings,agency_offers,sale_progress_items,rental_applications,tenancies,agency_tasks,agency_activity,agency_documents', false);
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(string_to_array(current_setting('hl.agency_tables'), ',')) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(string_to_array(current_setting('hl.agency_tables'), ',')) as t(name);
select pg_temp.record_check('Signed-in user cannot create an offer directly',
  pg_temp.write_denied($q$insert into public.agency_offers (property_id, name, phone, amount_etb) select id, 'RLS TEST', '+251911000000', 1 from public.properties limit 1$q$));
reset role;
select pg_temp.record_check('Agency matching is not callable by visitors',
  not has_function_privilege('anon', 'public.agency_requirement_matches(uuid, integer)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.agency_requirement_matches(uuid, integer)', 'EXECUTE'));

-- ---------- Section 26: owner portal (0029) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['managed_property_documents', 'owner_messages']) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['managed_property_documents', 'owner_messages', 'managed_properties']) as t(name);
reset role;
select pg_temp.record_check('HagerLand Services is a labelled HagerLand organisation offering repair services',
  exists (select 1 from public.organisations o where o.slug = 'hagerland-services' and o.is_hagerland and o.status = 'published' and exists (select 1 from public.organisation_services s where s.org_id = o.id)));

-- ---------- Section 26: building projects (0030) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read build_projects', pg_temp.read_denied('build_projects'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read build_projects directly (staff notes stay private)', pg_temp.read_denied('build_projects'));
select pg_temp.record_check('Signed-in user cannot create a building project directly',
  pg_temp.write_denied($q$insert into public.build_projects (user_id, title, budget_band, timeline, services, name, phone, email) values ('00000000-0000-4000-8000-000000000002', 'RLS TEST', 'not_sure', 'later', array['design'], 'RLS', '+251911000000', 'rls@test.hagerland.invalid')$q$));
reset role;

-- ---------- Section 26: knowledge & advice (0031) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['area_guides', 'market_insight', 'newsletter_subscriptions']) as t(name);
select pg_temp.record_check('Anonymous reads published area guides and minimum-sample market figures only through views',
  (select count(*) >= 0 from public.area_guides_public) and not exists (select 1 from public.market_insight_public where sample_count < 1));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read newsletter_subscriptions', pg_temp.read_denied('newsletter_subscriptions'));
reset role;
select pg_temp.record_check('Market insight refresh is not callable by visitors',
  not has_function_privilege('anon', 'public.refresh_market_insight()', 'EXECUTE') and not has_function_privilege('authenticated', 'public.refresh_market_insight()', 'EXECUTE'));

-- ---------- Section 26: verified reviews (0032) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read reviews', pg_temp.read_denied('reviews'));
select set_config('hl.reviews_seen', (select count(*)::text from public.reviews_public), false);
reset role;
select pg_temp.record_check('Anonymous reads only published reviews through the view',
  current_setting('hl.reviews_seen')::int = (select count(*) from public.reviews r join public.organisations o on o.id = r.org_id and o.status = 'published' where r.status = 'published'));
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read or write reviews directly', pg_temp.read_denied('reviews')
  and pg_temp.write_denied($q$insert into public.reviews (org_id, request_id, match_id, author_name, rating, body) select m.org_id, m.request_id, m.id, 'RLS', 5, 'A review written straight into the table.' from public.service_request_matches m limit 1$q$));
reset role;

-- ---------- Section 26: staff accounts (0033) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read staff_users', pg_temp.read_denied('staff_users'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read or create staff accounts', pg_temp.read_denied('staff_users')
  and pg_temp.write_denied($q$insert into public.staff_users (email, name, role) values ('rls@test.hagerland.invalid', 'RLS', 'owner')$q$));
reset role;
do $$ begin
  insert into public.staff_users (email, name, role, status) values ('rls-staff@test.hagerland.invalid', 'RLS staff', 'agent', 'active');
  perform pg_temp.record_check('An active staff account must have two-factor enrolled', false);
exception when check_violation then
  perform pg_temp.record_check('An active staff account must have two-factor enrolled', true);
end $$;

-- ---------- Supply partners (0034): HagerLand only ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['supply_partners', 'supply_contacts']) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read or create supply partner records', pg_temp.read_denied('supply_partners') and pg_temp.read_denied('supply_contacts')
  and pg_temp.write_denied($q$insert into public.supply_partners (org_id) select id from public.organisations limit 1$q$)
  and pg_temp.write_denied($q$insert into public.supply_contacts (org_id, name) select id, 'RLS' from public.organisations limit 1$q$));
reset role;

-- ---------- Supplier offers (0035): HagerLand only ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read supplier_offers', pg_temp.read_denied('supplier_offers'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read or create supplier offers', pg_temp.read_denied('supplier_offers')
  and pg_temp.write_denied($q$insert into public.supplier_offers (org_id, product_id, item_key, unit, price_etb_cents, price_date, valid_until, source) select seller_org_id, id, 'rls', 'piece', 100, current_date, current_date, 'other' from public.products limit 1$q$));
reset role;

-- ---------- Suppliers for each quote (0036) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read supply_quote_lines', pg_temp.read_denied('supply_quote_lines'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read or create supply quote lines', pg_temp.read_denied('supply_quote_lines')
  and pg_temp.write_denied($q$insert into public.supply_quote_lines (quote_request_id, org_id) select q.id, o.id from public.quote_requests q, public.organisations o limit 1$q$));
select pg_temp.record_check('Signed-in user cannot add quote items (including HagerLand-only items)',
  pg_temp.write_denied($q$insert into public.quote_request_items (quote_request_id, free_text_item, quantity, unit, added_by_admin) select id, 'RLS', 1, 'bag', true from public.quote_requests limit 1$q$));
reset role;

-- ---------- Agreements, orders, delivery proof and ledger (0037) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['supply_agreements', 'supply_orders', 'supply_order_lines', 'supply_order_events', 'supply_delivery_proofs', 'supply_ledger_entries']) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['supply_agreements', 'supply_orders', 'supply_order_lines', 'supply_order_events', 'supply_delivery_proofs', 'supply_ledger_entries']) as t(name);
select pg_temp.record_check('Signed-in user cannot add ledger entries',
  pg_temp.write_denied($q$insert into public.supply_ledger_entries (entry_type, direction, amount_cents, occurred_on) values ('service_fee', 'in', 100, current_date)$q$));
reset role;

-- ---------- Recruitment desk (0041): no access for visitors or signed-in users; consent and 18+ before introduction ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['recruitment_assignments', 'recruitment_candidates', 'recruitment_events', 'recruitment_placements', 'recruitment_fee_terms', 'recruitment_fee_entries']) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Signed-in employer cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['recruitment_assignments', 'recruitment_candidates', 'recruitment_events', 'recruitment_placements', 'recruitment_fee_terms', 'recruitment_fee_entries']) as t(name);
select pg_temp.record_check('Signed-in user cannot add a shortlist row',
  pg_temp.write_denied($q$insert into public.recruitment_candidates (assignment_id, source, created_by) select id, 'manual', 'rls' from public.recruitment_assignments limit 1$q$));
reset role;
select pg_temp.record_check('Recruitment agreements bucket is private', exists (select 1 from storage.buckets where id = 'recruitment-private' and public = false));

-- The rules below run as the server would, inside a block that is rolled back at the end: nothing is left behind.
do $$
declare
  res text := '';
  v_staffing uuid;
  v_plumbers uuid;
  v_req uuid;
  v_req2 uuid;
  v_req_abroad uuid;
  v_a uuid;
  v_c uuid;
  v_c2 uuid;
  v_p uuid;
  v_p2 uuid;
  v_t uuid;
  v_t2 uuid;
  v_e uuid;
begin
  begin
    select id into v_staffing from public.service_categories where slug = 'staffing';
    select id into v_plumbers from public.service_categories where slug = 'plumbers';
    insert into public.service_requests (vertical_key, service_category_id, title, name, phone) values ('jobs', v_staffing, 'RLS TEST staffing', 'RLS', '+251911000096') returning id into v_req;
    insert into public.service_requests (vertical_key, service_category_id, title, name, phone) values ('contractors', v_plumbers, 'RLS TEST plumbing', 'RLS', '+251911000095') returning id into v_req2;
    insert into public.service_requests (vertical_key, service_category_id, title, name, phone, country_code) values ('jobs', v_staffing, 'RLS TEST staffing abroad', 'RLS', '+251911000094', 'GB') returning id into v_req_abroad;

    begin
      insert into public.recruitment_assignments (service_request_id, private_client, created_by) values (v_req2, true, 'rls');
      res := res || E'FAIL · An assignment is only for a staffing request\n';
    exception when check_violation then res := res || E'PASS · An assignment is only for a staffing request\n';
    end;
    begin
      insert into public.recruitment_assignments (service_request_id, private_client, created_by) values (v_req_abroad, true, 'rls');
      res := res || E'FAIL · The desk refuses work outside Ethiopia\n';
    exception when check_violation then res := res || E'PASS · The desk refuses work outside Ethiopia\n';
    end;
    insert into public.recruitment_assignments (service_request_id, private_client, created_by) values (v_req, true, 'rls') returning id into v_a;
    begin
      insert into public.recruitment_assignments (service_request_id, private_client, created_by) values (v_req, true, 'rls');
      res := res || E'FAIL · One assignment per staffing request\n';
    exception when unique_violation then res := res || E'PASS · One assignment per staffing request\n';
    end;

    insert into public.recruitment_candidates (assignment_id, source, name, phone, trade, created_by) values (v_a, 'manual', 'RLS Worker', '+251911000093', 'mason', 'rls') returning id into v_c;
    begin
      update public.recruitment_candidates set introduced_at = now(), introduced_by = 'rls' where id = v_c;
      res := res || E'FAIL · No introduction without consent\n';
    exception when check_violation then res := res || E'PASS · No introduction without consent\n';
    end;
    begin
      update public.recruitment_candidates set consent_at = now(), consent_method = 'phone_call', consent_recorded_by = 'rls' where id = v_c;
      res := res || E'FAIL · Consent needs at least one shared contact method\n';
    exception when check_violation then res := res || E'PASS · Consent needs at least one shared contact method\n';
    end;
    update public.recruitment_candidates set consent_at = now() - interval '1 minute', consent_method = 'phone_call', consent_recorded_by = 'rls', share_phone = true where id = v_c;
    begin
      update public.recruitment_candidates set introduced_at = now(), introduced_by = 'rls' where id = v_c;
      res := res || E'FAIL · No introduction without a confirmed 18+\n';
    exception when check_violation then res := res || E'PASS · No introduction without a confirmed 18+\n';
    end;
    begin
      update public.recruitment_candidates set share_email = true where id = v_c;
      res := res || E'FAIL · Shared contact methods are fixed once consent is recorded\n';
    exception when check_violation then res := res || E'PASS · Shared contact methods are fixed once consent is recorded\n';
    end;
    update public.recruitment_candidates set adult_confirmed_at = now(), adult_confirmed_by = 'rls', adult_confirmed_method = 'phone_call' where id = v_c;
    update public.recruitment_candidates set introduced_at = now(), introduced_by = 'rls', status = 'introduced' where id = v_c;
    res := res || case when exists (select 1 from public.recruitment_candidates where id = v_c and introduced_at is not null) then 'PASS' else 'FAIL' end || E' · Introduction allowed with consent and 18+\n';
    begin
      update public.recruitment_candidates set introduced_at = null where id = v_c;
      res := res || E'FAIL · An introduction cannot be undone\n';
    exception when check_violation then res := res || E'PASS · An introduction cannot be undone\n';
    end;

    -- Withdrawal: allowed after an introduction, never undone; nobody is introduced after a withdrawal.
    insert into public.recruitment_candidates (assignment_id, source, name, phone, trade, created_by, consent_at, consent_method, consent_recorded_by, share_phone, adult_confirmed_at, adult_confirmed_by, adult_confirmed_method)
      values (v_a, 'manual', 'RLS Second', '+251911000092', 'mason', 'rls', now() - interval '1 minute', 'phone_call', 'rls', true, now(), 'rls', 'phone_call') returning id into v_c2;
    update public.recruitment_candidates set consent_withdrawn_at = now(), consent_withdrawn_by = 'rls', status = 'withdrawn' where id = v_c2;
    begin
      update public.recruitment_candidates set consent_withdrawn_at = null, consent_withdrawn_by = null where id = v_c2;
      res := res || E'FAIL · A withdrawal of consent cannot be undone\n';
    exception when check_violation then res := res || E'PASS · A withdrawal of consent cannot be undone\n';
    end;
    begin
      update public.recruitment_candidates set introduced_at = now(), introduced_by = 'rls' where id = v_c2;
      res := res || E'FAIL · Nobody is introduced after withdrawing consent\n';
    exception when check_violation then res := res || E'PASS · Nobody is introduced after withdrawing consent\n';
    end;
    begin
      update public.recruitment_candidates set declined_at = now() where id = v_c2;
      res := res || E'FAIL · Consent and a refusal cannot both be recorded\n';
    exception when check_violation then res := res || E'PASS · Consent and a refusal cannot both be recorded\n';
    end;

    -- Placements, free replacements and fees.
    begin
      insert into public.recruitment_placements (candidate_id, assignment_id, role_type, start_date, guarantee_days, created_by) values (v_c2, v_a, 'trade', current_date, 30, 'rls');
      res := res || E'FAIL · Only an introduced person can be placed\n';
    exception when check_violation then res := res || E'PASS · Only an introduced person can be placed\n';
    end;
    insert into public.recruitment_placements (candidate_id, assignment_id, role_type, start_date, guarantee_days, created_by) values (v_c, v_a, 'trade', date '2026-11-01', 30, 'rls') returning id into v_p;
    res := res || case when (select guarantee_ends_on from public.recruitment_placements where id = v_p) = date '2026-12-01' then 'PASS' else 'FAIL' end || E' · The database works out the guarantee end date\n';
    begin
      insert into public.recruitment_fee_terms (placement_id, fee_type, amount_minor, percent_bps, basis, created_by) values (v_p, 'fixed', 300000, 1000, 'first_month_pay', 'rls');
      res := res || E'FAIL · A fee is a fixed amount or a percentage, not both\n';
    exception when check_violation then res := res || E'PASS · A fee is a fixed amount or a percentage, not both\n';
    end;
    begin
      insert into public.recruitment_fee_terms (placement_id, fee_type, amount_minor, status, created_by) values (v_p, 'fixed', 300000, 'agreed', 'rls');
      res := res || E'FAIL · Agreed fee terms need the date agreed in writing\n';
    exception when check_violation then res := res || E'PASS · Agreed fee terms need the date agreed in writing\n';
    end;
    insert into public.recruitment_fee_terms (placement_id, fee_type, amount_minor, created_by) values (v_p, 'fixed', 300000, 'rls') returning id into v_t;
    insert into public.recruitment_fee_entries (fee_terms_id, entry_type, amount_minor, currency, occurred_on, created_by) values (v_t, 'fee_due', 300000, 'ETB', current_date, 'rls') returning id into v_e;
    begin
      update public.recruitment_fee_entries set amount_minor = 1 where id = v_e;
      res := res || E'FAIL · Fee entries cannot be changed\n';
    exception when insufficient_privilege then res := res || E'PASS · Fee entries cannot be changed\n';
    end;
    begin
      delete from public.recruitment_fee_entries where id = v_e;
      res := res || E'FAIL · Fee entries cannot be deleted\n';
    exception when insufficient_privilege then res := res || E'PASS · Fee entries cannot be deleted\n';
    end;
    insert into public.recruitment_fee_entries (fee_terms_id, entry_type, amount_minor, currency, occurred_on, reverses_entry_id, reason, created_by) values (v_t, 'reversal', 300000, 'ETB', current_date, v_e, 'RLS test', 'rls');
    begin
      insert into public.recruitment_fee_entries (fee_terms_id, entry_type, amount_minor, currency, occurred_on, reverses_entry_id, reason, created_by) values (v_t, 'reversal', 300000, 'ETB', current_date, v_e, 'RLS test', 'rls');
      res := res || E'FAIL · An entry is reversed only once\n';
    exception when unique_violation then res := res || E'PASS · An entry is reversed only once\n';
    end;
    insert into public.recruitment_events (assignment_id, step, actor) values (v_a, 'probe', 'rls');
    begin
      update public.recruitment_events set step = 'changed' where assignment_id = v_a;
      res := res || E'FAIL · The desk timeline cannot be changed\n';
    exception when insufficient_privilege then res := res || E'PASS · The desk timeline cannot be changed\n';
    end;
    begin
      delete from public.recruitment_events where assignment_id = v_a;
      res := res || E'FAIL · The desk timeline cannot be deleted\n';
    exception when insufficient_privilege then res := res || E'PASS · The desk timeline cannot be deleted\n';
    end;
    -- Left inside the guarantee, then a free replacement: no fee may be recorded on it.
    update public.recruitment_placements set status = 'replaced', ended_on = date '2026-11-20', end_reason = 'left_by_worker' where id = v_p;
    insert into public.recruitment_candidates (assignment_id, source, name, phone, trade, created_by, consent_at, consent_method, consent_recorded_by, share_phone, adult_confirmed_at, adult_confirmed_by, adult_confirmed_method, introduced_at, introduced_by)
      values (v_a, 'manual', 'RLS Third', '+251911000091', 'mason', 'rls', now() - interval '2 minutes', 'phone_call', 'rls', true, now() - interval '2 minutes', 'rls', 'phone_call', now(), 'rls') returning id into v_c2;
    insert into public.recruitment_placements (candidate_id, assignment_id, role_type, start_date, guarantee_days, replaces_placement_id, is_free_replacement, created_by) values (v_c2, v_a, 'trade', date '2026-11-25', 30, v_p, false, 'rls') returning id into v_p2;
    res := res || case when (select is_free_replacement from public.recruitment_placements where id = v_p2) then 'PASS' else 'FAIL' end || E' · The database marks a replacement inside the guarantee as free\n';
    begin
      insert into public.recruitment_fee_terms (placement_id, fee_type, amount_minor, created_by) values (v_p2, 'fixed', 300000, 'rls') returning id into v_t2;
      res := res || E'FAIL · A free replacement has no fee\n';
    exception when check_violation then res := res || E'PASS · A free replacement has no fee\n';
    end;
    begin
      update public.recruitment_placements set is_free_replacement = false where id = v_p2;
      res := res || E'FAIL · The free-replacement flag cannot be changed\n';
    exception when check_violation then res := res || E'PASS · The free-replacement flag cannot be changed\n';
    end;
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · Recruitment desk checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('Recruitment desk checks left nothing behind', not exists (select 1 from public.service_requests where title like 'RLS TEST staffing%' or title = 'RLS TEST plumbing'));

-- ---------- Jobs Phase 4 (0042): verification evidence, private-client jobs, reports ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['employer_verifications', 'org_verification_notices', 'job_reports']) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['employer_verifications', 'org_verification_notices', 'job_reports']) as t(name);
select pg_temp.record_check('Signed-in user cannot file a report directly (server only)',
  pg_temp.write_denied($q$insert into public.job_reports (job_post_id, reason) select id, 'fake_or_scam' from public.job_posts limit 1$q$));
do $$ begin
  insert into public.job_posts (slug, employer_org_id, title, category, employment_type, description, posted_for, created_by_staff)
  values ('rls-p4-crafted', '00000000-0000-4000-8000-0000000000b1', 'RLS crafted private', 'construction', 'full_time', 'A crafted private-client job that must be refused by the database.', 'private_client', 'crafted');
  perform pg_temp.record_check('An employer cannot post as a private client', false);
exception when insufficient_privilege or check_violation then
  perform pg_temp.record_check('An employer cannot post as a private client', true);
end $$;
reset role;

do $$
declare
  res text := '';
  v_org uuid;
  v_legacy uuid;
  v_hs uuid;
  v_req uuid;
  v_a uuid;
  v_city uuid;
  v_area uuid;
  v_job uuid;
  v_user uuid := '00000000-0000-4000-8000-000000000002';
begin
  begin
    insert into public.organisations (kind, name, slug, status, verification_level) values ('contractor', 'RLS P4 Org', 'rls-p4-org', 'published', 'listed') returning id into v_org;
    begin
      insert into public.organisations (kind, name, slug, status, verification_level) values ('contractor', 'RLS P4 Direct', 'rls-p4-direct', 'published', 'verified');
      res := res || E'FAIL · A business cannot be created as Verified without a recorded check\n';
    exception when check_violation then res := res || E'PASS · A business cannot be created as Verified without a recorded check\n';
    end;
    begin
      update public.organisations set verification_level = 'verified' where id = v_org;
      res := res || E'FAIL · The badge cannot be given without a recorded check\n';
    exception when check_violation then res := res || E'PASS · The badge cannot be given without a recorded check\n';
    end;
    insert into public.employer_verifications (organisation_id, licence_number, licence_checked_at, licence_check_method, tin_checked_at, phone_checked_at, verified_by, verified_at, valid_until)
      values (v_org, 'RLS-EXP', now() - interval '13 months', 'document', now() - interval '13 months', now() - interval '13 months', 'rls', now() - interval '13 months', ((now() - interval '13 months') at time zone 'Africa/Addis_Ababa')::date + 30);
    begin
      update public.organisations set verification_level = 'verified' where id = v_org;
      res := res || E'FAIL · An ended check does not give the badge\n';
    exception when check_violation then res := res || E'PASS · An ended check does not give the badge\n';
    end;
    update public.employer_verifications set status = 'expired' where organisation_id = v_org;
    insert into public.employer_verifications (organisation_id, licence_number, licence_checked_at, licence_check_method, tin_checked_at, phone_checked_at, verified_by, valid_until)
      values (v_org, 'RLS-OK', now(), 'online_register', now(), now(), 'rls', (now() at time zone 'Africa/Addis_Ababa')::date + 300);
    update public.organisations set verification_level = 'verified' where id = v_org;
    res := res || case when (select verification_level from public.organisations where id = v_org) = 'verified' then 'PASS' else 'FAIL' end || E' · A live recorded check gives the badge\n';
    begin
      insert into public.employer_verifications (organisation_id, licence_number, licence_checked_at, licence_check_method, tin_checked_at, phone_checked_at, verified_by, valid_until)
        values (v_org, 'RLS-LONG', now(), 'document', now(), now(), 'rls', (now() at time zone 'Africa/Addis_Ababa')::date + 400);
      res := res || E'FAIL · A check lasts at most 12 months\n';
    exception when check_violation or unique_violation then res := res || E'PASS · A check lasts at most 12 months\n';
    end;
    update public.organisations set name = 'RLS P4 Org Renamed' where id = v_org;
    res := res || case when (select status from public.employer_verifications where organisation_id = v_org and licence_number = 'RLS-OK') = 'needs_recheck' then 'PASS' else 'FAIL' end || E' · A new business name puts the check into "needs re-check"\n';
    -- Legacy: verified with no recorded check (made here by removing the record inside this rolled-back block).
    insert into public.organisations (kind, name, slug, status, verification_level) values ('contractor', 'RLS P4 Legacy', 'rls-p4-legacy', 'published', 'listed') returning id into v_legacy;
    insert into public.employer_verifications (organisation_id, licence_number, licence_checked_at, licence_check_method, tin_checked_at, phone_checked_at, verified_by, valid_until)
      values (v_legacy, 'RLS-L', now(), 'document', now(), now(), 'rls', (now() at time zone 'Africa/Addis_Ababa')::date + 10);
    update public.organisations set verification_level = 'verified' where id = v_legacy;
    delete from public.employer_verifications where organisation_id = v_legacy;
    update public.organisations set description = 'Edited description of a legacy verified business.', name = 'RLS P4 Legacy Edited' where id = v_legacy;
    res := res || case when (select verification_level from public.organisations where id = v_legacy) = 'verified' then 'PASS' else 'FAIL' end || E' · Ordinary edits to a legacy verified business are never refused\n';

    -- HagerLand Services has no members.
    select id into v_hs from public.organisations where slug = 'hagerland-services';
    begin
      insert into public.organisation_members (org_id, user_id, role) values (v_hs, v_user, 'member');
      res := res || E'FAIL · Nobody can become a member of HagerLand Services\n';
    exception when insufficient_privilege then res := res || E'PASS · Nobody can become a member of HagerLand Services\n';
    end;

    -- Private-client jobs.
    select id into v_city from public.locations where path = 'addis-ababa/bole';
    select id into v_area from public.locations where level = 'area' and country_code = 'ET' limit 1;
    insert into public.service_requests (vertical_key, service_category_id, title, name, phone) select 'jobs', id, 'RLS TEST P4 staffing', 'RLS', '+251911000090' from public.service_categories where slug = 'staffing' returning id into v_req;
    insert into public.recruitment_assignments (service_request_id, private_client, created_by) values (v_req, true, 'rls') returning id into v_a;
    begin
      insert into public.job_posts (slug, employer_org_id, title, category, employment_type, description, location_id, posted_for, recruitment_assignment_id)
      values ('rls-p4-notours', v_org, 'RLS private', 'construction', 'full_time', 'A private-client job on a business that is not HagerLand.', v_city, 'private_client', v_a);
      res := res || E'FAIL · A private-client job belongs to HagerLand\n';
    exception when check_violation then res := res || E'PASS · A private-client job belongs to HagerLand\n';
    end;
    begin
      insert into public.job_posts (slug, employer_org_id, title, category, employment_type, description, location_id, posted_for)
      values ('rls-p4-noassign', v_hs, 'RLS private', 'construction', 'full_time', 'A private-client job without a desk assignment.', v_city, 'private_client');
      res := res || E'FAIL · A private-client job needs a desk assignment\n';
    exception when check_violation then res := res || E'PASS · A private-client job needs a desk assignment\n';
    end;
    if v_area is not null then
      begin
        insert into public.job_posts (slug, employer_org_id, title, category, employment_type, description, location_id, posted_for, recruitment_assignment_id)
        values ('rls-p4-area', v_hs, 'RLS private', 'construction', 'full_time', 'A private-client job showing a precise area.', v_area, 'private_client', v_a);
        res := res || E'FAIL · A private-client job shows city or sub-city only\n';
      exception when check_violation then res := res || E'PASS · A private-client job shows city or sub-city only\n';
      end;
    end if;
    insert into public.job_posts (slug, employer_org_id, title, category, employment_type, description, location_id, posted_for, recruitment_assignment_id, created_by_staff, status)
      values ('rls-p4-ok', v_hs, 'RLS private ok', 'construction', 'full_time', 'A private-client job created by a staff member for review.', v_city, 'private_client', v_a, 'staff:ops@test', 'pending_review') returning id into v_job;
    begin
      update public.job_posts set status = 'published', approved_by = 'staff:ops@test' where id = v_job;
      res := res || E'FAIL · The creator cannot approve their own private-client job\n';
    exception when check_violation then res := res || E'PASS · The creator cannot approve their own private-client job\n';
    end;
    update public.job_posts set status = 'published', approved_by = 'staff:ops@test', self_approval_reason = 'Owner approved own post: urgent client' where id = v_job;
    res := res || E'PASS · With a recorded reason the creator''s approval is accepted (owner only, on the server)\n';
    res := res || case when not exists (select 1 from public.jobs_public where id = v_job) then 'PASS' else 'FAIL' end || E' · A private-client job is hidden while the private-client switch is off\n';
    update public.site_settings set value = 'true'::jsonb where key = 'jobs_private_client_posts';
    res := res || case when (select employer_name = 'Posted by HagerLand for a private client' and employer_slug is null and employer_logo_path is null and employer_verification is null and posted_for = 'private_client' from public.jobs_public where id = v_job) then 'PASS' else 'FAIL' end || E' · The public job list never shows the client: label only, no link, logo or badge\n';
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · Phase 4 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('Phase 4 checks left nothing behind', not exists (select 1 from public.organisations where slug like 'rls-p4-%') and (select value from public.site_settings where key = 'jobs_private_client_posts') = 'false'::jsonb);

-- ---------- Clean up ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
delete from public.properties where title like 'RLS TEST%';
-- Jobs Phase 4: this script's own verification records go before its test organisations.
delete from public.org_verification_notices where organisation_id in (select id from public.organisations where name like 'RLS TEST%');
delete from public.employer_verifications where organisation_id in (select id from public.organisations where name like 'RLS TEST%');
delete from public.organisations where name like 'RLS TEST%';
delete from auth.users where email in ('rls-owner@test.hagerland.invalid', 'rls-other@test.hagerland.invalid');

select line as result
from unnest(string_to_array(trim(trailing E'\n' from current_setting('hl.results')), E'\n')) as line;
