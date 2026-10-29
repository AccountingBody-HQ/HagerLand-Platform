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
select pg_temp.record_check('Private candidates are not shown to employers', not exists (select 1 from public.candidates_for_employers where candidate_id = '00000000-0000-4000-8000-000000000002'));
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
-- Jobs Phase 6 (0044): every status change of the test job is in its history, with who made it (the employer through
-- their own session; this script's own changes as the database owner count as "server").
select pg_temp.record_check('Job status history records every change of the test job and who made it',
  (select array_agg(coalesce(from_status, '-') || '>' || to_status || ':' || actor_kind order by 1) from public.job_status_events where job_post_id = '00000000-0000-4000-8000-0000000000d1')
  = (select array_agg(x order by 1) from unnest(array['->pending_review:employer', 'pending_review>published:server', 'published>paused:server', 'paused>removed:server']) as x));
delete from public.candidate_profiles where user_id = '00000000-0000-4000-8000-000000000002';
delete from public.job_posts where id = '00000000-0000-4000-8000-0000000000d1';
select pg_temp.record_check('Deleting a job (only this test does) takes its history with it',
  not exists (select 1 from public.job_status_events where job_post_id = '00000000-0000-4000-8000-0000000000d1'));

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

-- ---------- Jobs Phase 5 (0043): call-back requests and the wrong-number block list (server only) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['callback_requests', 'callback_blocked_phones']) as t(name);
select pg_temp.record_check('Anonymous cannot add a call-back request directly (server only)',
  pg_temp.write_denied($q$insert into public.callback_requests (name, phone, need, area_text, language, time_of_day, consent_at) values ('RLS', '+251911000000', 'x', 'y', 'am', 'any', now())$q$));
select pg_temp.record_check('Anonymous sees jobs_amharic in the public settings, never jobs_callbacks',
  exists (select 1 from public.site_settings_public where key = 'jobs_amharic') and not exists (select 1 from public.site_settings_public where key = 'jobs_callbacks'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Signed-in user cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['callback_requests', 'callback_blocked_phones']) as t(name);
select pg_temp.record_check('Signed-in user cannot add to the block list directly (server only)',
  pg_temp.write_denied($q$insert into public.callback_blocked_phones (phone_hash, blocked_until) values (repeat('a', 64), now())$q$));
reset role;
do $$
declare res text := '';
begin
  begin
    insert into public.callback_requests (name, phone, need, area_text, language, time_of_day, consent_at) values ('RLS TEST caller', '+251911000099', 'Masons', 'Bole', 'am', 'any', now());
    begin
      insert into public.callback_requests (name, phone, need, area_text, language, time_of_day, consent_at) values ('RLS TEST caller', '+251911000099', 'Masons', 'Bole', 'am', 'any', now());
      res := res || E'FAIL · One open call-back request per phone number\n';
    exception when unique_violation then res := res || E'PASS · One open call-back request per phone number\n';
    end;
    begin
      insert into public.callback_requests (phone, need, area_text, language, time_of_day, consent_at) values ('+251911000098', 'Masons', 'Bole', 'am', 'any', now());
      res := res || E'FAIL · A call-back request needs its details until they are deleted\n';
    exception when check_violation then res := res || E'PASS · A call-back request needs its details until they are deleted\n';
    end;
    begin
      update public.callback_requests set status = 'closed' where phone = '+251911000099';
      res := res || E'FAIL · A closed call-back request needs an outcome\n';
    exception when check_violation then res := res || E'PASS · A closed call-back request needs an outcome\n';
    end;
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · Phase 5 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('Phase 5 checks left nothing behind', not exists (select 1 from public.callback_requests where name = 'RLS TEST caller') and (select value from public.site_settings where key = 'jobs_callbacks') = 'false'::jsonb);

-- ---------- Jobs Phase 6 (0044): the job status history (server only, append-only, honest actor) ----------
reset role;
set role anon;
select pg_temp.record_check('Anonymous cannot read job_status_events', pg_temp.read_denied('job_status_events'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Signed-in user cannot read job_status_events', pg_temp.read_denied('job_status_events'));
select pg_temp.record_check('Signed-in user cannot write a status history row directly',
  pg_temp.write_denied($q$insert into public.job_status_events (job_post_id, to_status, actor_kind) select id, 'published', 'staff' from public.job_posts limit 1$q$));
select pg_temp.record_check('Signed-in user cannot call the status history function',
  pg_temp.write_denied($q$select public.job_posts_status_history()$q$));
reset role;
do $$
declare
  res text := '';
  v_job uuid;
  v_n int;
  v_trail text;
begin
  begin
    -- The employer (user 1, a member of the test business) posts and closes a job with their own session, and tries to
    -- claim "staff" with the header: the role decides, so it is still "employer".
    perform set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
    perform set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
    perform set_config('request.headers', '{"x-hl-job-actor": "staff"}', true);
    execute 'set local role authenticated';
    insert into public.job_posts (slug, employer_org_id, title, category, employment_type, location_id, description, status)
    values ('rls-p6-job', '00000000-0000-4000-8000-0000000000b1', 'RLS TEST P6 mason', 'construction', 'full_time',
            (select id from public.locations where path = 'addis-ababa/bole'), 'A job for the status history checks, long enough.', 'pending_review')
    returning id into v_job;
    update public.job_posts set status = 'draft' where id = v_job;
    update public.job_posts set status = 'pending_review' where id = v_job;
    execute 'reset role';
    -- Staff actions (service role + "staff"), the daily job (service role + "system"), the service role without a valid
    -- header ("server"), and SQL run by hand ("server").
    execute 'set local role service_role';
    perform set_config('request.headers', '{"x-hl-job-actor": "staff"}', true);
    update public.job_posts set status = 'rejected' where id = v_job;
    update public.job_posts set status = 'published' where id = v_job;
    perform set_config('request.headers', '{"x-hl-job-actor": "system"}', true);
    update public.job_posts set status = 'expired' where id = v_job;
    perform set_config('request.headers', '{"x-hl-job-actor": "owner"}', true);
    update public.job_posts set status = 'paused' where id = v_job;
    perform set_config('request.headers', '', true);
    update public.job_posts set status = 'published' where id = v_job;
    execute 'reset role';
    update public.job_posts set status = 'removed' where id = v_job;
    select string_agg(coalesce(from_status, '-') || '>' || to_status || ':' || actor_kind, ' ' order by created_at, id) into v_trail
      from public.job_status_events where job_post_id = v_job;
    res := res || case when (select array_agg(coalesce(from_status, '-') || '>' || to_status || ':' || actor_kind order by 1) from public.job_status_events where job_post_id = v_job)
        = (select array_agg(x order by 1) from unnest(array['->pending_review:employer', 'pending_review>draft:employer', 'draft>pending_review:employer', 'pending_review>rejected:staff',
             'rejected>published:staff', 'published>expired:system', 'expired>paused:server', 'paused>published:server', 'published>removed:server']) as x)
      then 'PASS' else 'FAIL' end || ' · Status history records employer, staff, system and server honestly (' || coalesce(v_trail, 'none') || E')\n';

    -- No row when the status does not change.
    select count(*) into v_n from public.job_status_events where job_post_id = v_job;
    update public.job_posts set title = 'RLS TEST P6 mason (edited)' where id = v_job;
    res := res || case when (select count(*) from public.job_status_events where job_post_id = v_job) = v_n then 'PASS' else 'FAIL' end || E' · No history row when the status does not change\n';

    -- Append-only: no change, no direct delete, no emptying.
    begin
      update public.job_status_events set actor_kind = 'staff' where job_post_id = v_job;
      res := res || E'FAIL · Status history rows cannot be changed\n';
    exception when insufficient_privilege then res := res || E'PASS · Status history rows cannot be changed\n';
    end;
    begin
      delete from public.job_status_events where job_post_id = v_job;
      res := res || E'FAIL · Status history rows cannot be deleted directly\n';
    exception when insufficient_privilege then res := res || E'PASS · Status history rows cannot be deleted directly\n';
    end;
    begin
      truncate public.job_status_events;
      res := res || E'FAIL · The status history cannot be emptied\n';
    exception when insufficient_privilege then res := res || E'PASS · The status history cannot be emptied\n';
    end;
    begin
      insert into public.job_status_events (job_post_id, to_status, actor_kind) values (v_job, 'published', 'admin');
      res := res || E'FAIL · Only employer, staff, system or server can be recorded\n';
    exception when check_violation then res := res || E'PASS · Only employer, staff, system or server can be recorded\n';
    end;

    -- If the history cannot be written, the status change fails too (no silent gaps).
    alter table public.job_status_events add constraint rls_p6_block check (to_status <> 'archived') not valid;
    begin
      update public.job_posts set status = 'archived' where id = v_job;
      res := res || E'FAIL · A status change fails when its history cannot be written\n';
    exception when check_violation then
      res := res || case when (select status from public.job_posts where id = v_job) = 'removed' then 'PASS' else 'FAIL' end || E' · A status change fails when its history cannot be written\n';
    end;
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · Phase 6 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('Phase 6 checks left nothing behind', not exists (select 1 from public.job_posts where slug = 'rls-p6-job')
  and not exists (select 1 from pg_constraint where conname = 'rls_p6_block'));

-- ---------- Tidy T-2 (0045): listing report clearing columns; HagerLand never counted as a provider ----------
reset role;
select pg_temp.record_check('Listing reports gained handled_at and personal_data_deleted_at, both optional with no default',
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'reports' and column_name in ('handled_at', 'personal_data_deleted_at') and is_nullable = 'YES' and column_default is null) = 2);
set role anon;
select pg_temp.record_check('Anonymous still cannot read listing reports', pg_temp.read_denied('reports'));
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('Signed-in user still cannot read listing reports', pg_temp.read_denied('reports'));
reset role;
do $$
declare
  res text := '';
  v_before int;
  v_hs uuid;
  v_req uuid;
  v_a uuid;
  v_job uuid;
begin
  begin
    select public.pillar_active_providers('jobs') into v_before;
    select id into v_hs from public.organisations where slug = 'hagerland-services';
    update public.site_settings set value = 'true'::jsonb where key = 'jobs_private_client_posts';
    insert into public.service_requests (vertical_key, service_category_id, title, name, phone) select 'jobs', id, 'RLS TEST T2 staffing', 'RLS', '+251911000091' from public.service_categories where slug = 'staffing' returning id into v_req;
    insert into public.recruitment_assignments (service_request_id, private_client, created_by) values (v_req, true, 'rls') returning id into v_a;
    insert into public.job_posts (slug, employer_org_id, title, category, employment_type, description, location_id, posted_for, recruitment_assignment_id, created_by_staff, status)
      values ('rls-t2-pc', v_hs, 'RLS TEST T2 private', 'construction', 'full_time', 'A private-client job for the provider count check.', (select id from public.locations where path = 'addis-ababa/bole'), 'private_client', v_a, 'staff:ops@test', 'pending_review') returning id into v_job;
    update public.job_posts set status = 'published', approved_by = 'staff:owner@test' where id = v_job;
    res := res || case when public.pillar_active_providers('jobs') = v_before then 'PASS' else 'FAIL' end || E' · An approved private-client job does not count HagerLand Services as a Jobs provider\n';
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · Tidy T-2 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('Tidy T-2 checks left nothing behind', not exists (select 1 from public.job_posts where slug = 'rls-t2-pc') and (select value from public.site_settings where key = 'jobs_private_client_posts') = 'false'::jsonb);

-- ---------- Fix F-3 (0046): choosing a quote is all or nothing; one deal per chosen request ----------
reset role;
create or replace function pg_temp.choose_denied()
returns boolean language plpgsql as $$
begin
  perform public.choose_service_request_quote(gen_random_uuid(), gen_random_uuid(), null, null);
  return false;
exception when insufficient_privilege then
  return true;
end $$;
set role anon;
select pg_temp.record_check('Anonymous cannot run the quote choice', pg_temp.choose_denied());
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('A signed-in customer cannot run the quote choice directly (only the website can)', pg_temp.choose_denied());
reset role;
set role service_role;
select pg_temp.record_check('The website (service role) can run the quote choice',
  public.choose_service_request_quote(gen_random_uuid(), gen_random_uuid(), null, null) = '{"outcome": "not_allowed", "reason": "not_owner"}'::jsonb);
reset role;
do $$
declare
  res text := '';
  v_a uuid;
  v_b uuid;
  v_c uuid;
  v_req uuid;
  v_req2 uuid;
  v_req3 uuid;
  v_ma uuid;
  v_mb uuid;
  v_mc uuid;
  v_m2 uuid;
  v_m3 uuid;
  v_out jsonb;
  v_ok boolean;
  v_deal record;
  v_user constant uuid := '00000000-0000-4000-8000-000000000001';
  v_other constant uuid := '00000000-0000-4000-8000-000000000002';
begin
  begin
    insert into public.organisations (kind, name, slug, status) values ('contractor', 'RLS TEST F3 A', 'rls-test-f3-a', 'published') returning id into v_a;
    insert into public.organisations (kind, name, slug, status) values ('contractor', 'RLS TEST F3 B', 'rls-test-f3-b', 'published') returning id into v_b;
    insert into public.organisations (kind, name, slug, status) values ('contractor', 'RLS TEST F3 C', 'rls-test-f3-c', 'published') returning id into v_c;
    insert into public.service_requests (vertical_key, title, name, phone, requester_user_id, status) values ('contractors', 'RLS TEST F3 pipes', 'RLS', '+251911000301', v_user, 'quoted') returning id into v_req;
    insert into public.service_request_matches (request_id, org_id, status, quote_amount_minor, quote_currency, quote_valid_until, lead_fee_minor, commission_minor)
      values (v_req, v_a, 'quoted', 2500000, 'ETB', current_date + 7, 50000, 125000) returning id into v_ma;
    insert into public.service_request_matches (request_id, org_id, status, quote_amount_minor, quote_currency) values (v_req, v_b, 'quoted', 3000000, 'ETB') returning id into v_mb;
    insert into public.service_request_matches (request_id, org_id, status) values (v_req, v_c, 'declined') returning id into v_mc;

    -- Refusals before any choice: nothing is written.
    v_out := public.choose_service_request_quote(v_req, v_ma, v_other, null);
    res := res || case when v_out ->> 'reason' = 'not_owner' then 'PASS' else 'FAIL' end || E' · Another user cannot choose a quote on someone else''s request\n';
    v_out := public.choose_service_request_quote(v_req, v_ma, null, 'not-the-link');
    res := res || case when v_out ->> 'reason' = 'not_owner' then 'PASS' else 'FAIL' end || E' · A wrong private link cannot choose a quote\n';
    v_out := public.choose_service_request_quote(gen_random_uuid(), v_ma, v_user, null);
    res := res || case when v_out ->> 'reason' = 'not_owner' then 'PASS' else 'FAIL' end || E' · An unknown request is refused\n';
    v_out := public.choose_service_request_quote(v_req, v_mc, v_user, null);
    res := res || case when v_out ->> 'reason' = 'quote_not_available' then 'PASS' else 'FAIL' end || E' · A declined match cannot be chosen\n';
    v_out := public.choose_service_request_quote(v_req, gen_random_uuid(), v_user, null);
    res := res || case when v_out ->> 'reason' = 'quote_not_available' then 'PASS' else 'FAIL' end || E' · A match that is not on this request is refused\n';
    res := res || case when (select status from public.service_requests where id = v_req) = 'quoted'
      and (select count(*) from public.service_request_matches where request_id = v_req and status = 'quoted') = 2
      and not exists (select 1 from public.deals where source_id = v_req) then 'PASS' else 'FAIL' end || E' · Refused choices change nothing\n';

    -- All or nothing: a deal that cannot be saved leaves the request and every match as they were.
    execute format('alter table public.deals add constraint rls_f3_block check (source_id is distinct from %L) not valid', v_req);
    v_ok := false;
    begin
      perform public.choose_service_request_quote(v_req, v_ma, v_user, null);
    exception when check_violation then
      v_ok := true;
    end;
    alter table public.deals drop constraint rls_f3_block;
    res := res || case when v_ok and (select status from public.service_requests where id = v_req) = 'quoted' and (select closed_at from public.service_requests where id = v_req) is null
      and (select status from public.service_request_matches where id = v_ma) = 'quoted' and (select status from public.service_request_matches where id = v_mb) = 'quoted'
      and not exists (select 1 from public.deals where source_id = v_req) then 'PASS' else 'FAIL' end || E' · A failure while saving the deal leaves nothing half-done\n';

    -- The choice.
    v_out := public.choose_service_request_quote(v_req, v_ma, v_user, null);
    res := res || case when v_out ->> 'outcome' = 'chosen' and (v_out ->> 'org_id')::uuid = v_a then 'PASS' else 'FAIL' end || E' · The requester chooses a quote: chosen\n';
    res := res || case when (select status from public.service_request_matches where id = v_ma) = 'won' and (select status from public.service_request_matches where id = v_mb) = 'lost'
      and (select status from public.service_request_matches where id = v_mc) = 'declined' then 'PASS' else 'FAIL' end || E' · Chosen match won, the other quote lost, the declined one untouched\n';
    res := res || case when (select status = 'won' and closed_reason = 'completed' and closed_at is not null from public.service_requests where id = v_req) then 'PASS' else 'FAIL' end || E' · The request is won and closed as completed\n';
    select * into v_deal from public.deals where source_id = v_req;
    res := res || case when (select count(*) from public.deals where source_id = v_req) = 1 and v_deal.source_type = 'service_request' and v_deal.match_id = v_ma and v_deal.org_id = v_a
      and v_deal.title = (select reference || ': RLS TEST F3 pipes' from public.service_requests where id = v_req) and v_deal.currency = 'ETB' and v_deal.value_minor = 2500000
      and v_deal.lead_fee_minor = 50000 and v_deal.commission_minor = 125000 and v_deal.status = 'won' and v_deal.closed_at = (select closed_at from public.service_requests where id = v_req)
      and v_deal.pillar_key is null and v_deal.notes is null then 'PASS' else 'FAIL' end || E' · Exactly one deal, with the value and fees copied from the match\n';

    -- Again: the same quote (double tap) and another quote.
    v_out := public.choose_service_request_quote(v_req, v_ma, v_user, null);
    res := res || case when v_out ->> 'outcome' = 'already_chosen' and (select count(*) from public.deals where source_id = v_req) = 1 then 'PASS' else 'FAIL' end || E' · Choosing the same quote again: already chosen, no second deal\n';
    v_out := public.choose_service_request_quote(v_req, v_mb, v_user, null);
    res := res || case when v_out ->> 'reason' = 'request_closed' and (select status from public.service_request_matches where id = v_mb) = 'lost'
      and (select count(*) from public.deals where source_id = v_req) = 1 then 'PASS' else 'FAIL' end || E' · Choosing another quote afterwards is refused and changes nothing\n';

    -- The database safety net: no second deal from a chosen quote; hand-made ledger entries are still allowed.
    v_ok := false;
    begin
      insert into public.deals (source_type, source_id, match_id, org_id, title, status) values ('service_request', v_req, v_mb, v_b, 'RLS TEST F3 duplicate', 'won');
    exception when unique_violation then
      v_ok := true;
    end;
    res := res || case when v_ok then 'PASS' else 'FAIL' end || E' · A second deal from a chosen quote is refused by the database\n';
    insert into public.deals (source_type, source_id, title, status) values ('service_request', v_req, 'RLS TEST F3 manual 1', 'open'), ('service_request', v_req, 'RLS TEST F3 manual 2', 'open');
    res := res || E'PASS · Staff can still add their own ledger entries for the same request\n';

    -- Private links, a closed request and an expired quote.
    insert into public.service_requests (vertical_key, title, name, phone, status, access_token_hash, access_token_expires_at) values ('contractors', 'RLS TEST F3 guest', 'RLS', '+251911000302', 'matched', 'rls-f3-hash', now() + interval '1 day') returning id into v_req2;
    insert into public.service_request_matches (request_id, org_id, status, quote_amount_minor, quote_currency) values (v_req2, v_a, 'quoted', 100000, 'USD') returning id into v_m2;
    v_out := public.choose_service_request_quote(v_req2, v_m2, v_user, null);
    res := res || case when v_out ->> 'reason' = 'not_owner' then 'PASS' else 'FAIL' end || E' · A signed-in user cannot choose on a guest''s request (no account on it)\n';
    update public.service_requests set access_token_expires_at = now() - interval '1 second' where id = v_req2;
    v_out := public.choose_service_request_quote(v_req2, v_m2, null, 'rls-f3-hash');
    res := res || case when v_out ->> 'reason' = 'not_owner' then 'PASS' else 'FAIL' end || E' · An expired private link cannot choose a quote\n';
    update public.service_requests set access_token_expires_at = now() + interval '1 day' where id = v_req2;
    v_out := public.choose_service_request_quote(v_req2, v_m2, null, 'rls-f3-hash');
    res := res || case when v_out ->> 'outcome' = 'chosen' and (select currency from public.deals where source_id = v_req2) = 'USD' then 'PASS' else 'FAIL' end || E' · A guest with a valid private link chooses a quote (deal in the quote''s currency)\n';
    insert into public.service_requests (vertical_key, title, name, phone, requester_user_id, status) values ('contractors', 'RLS TEST F3 expired', 'RLS', '+251911000303', v_user, 'quoted') returning id into v_req3;
    insert into public.service_request_matches (request_id, org_id, status, quote_amount_minor, quote_currency, quote_valid_until) values (v_req3, v_b, 'quoted', 100000, 'ETB', current_date - 1) returning id into v_m3;
    v_out := public.choose_service_request_quote(v_req3, v_m3, v_user, null);
    res := res || case when v_out ->> 'reason' = 'quote_expired' and (select status from public.service_requests where id = v_req3) = 'quoted' then 'PASS' else 'FAIL' end || E' · An expired quote cannot be chosen\n';
    update public.service_requests set status = 'cancelled' where id = v_req3;
    update public.service_request_matches set quote_valid_until = null where id = v_m3;
    v_out := public.choose_service_request_quote(v_req3, v_m3, v_user, null);
    res := res || case when v_out ->> 'reason' = 'request_closed' and not exists (select 1 from public.deals where source_id = v_req3) then 'PASS' else 'FAIL' end || E' · A cancelled request cannot have a quote chosen\n';
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · F-3 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('F-3 checks left nothing behind', not exists (select 1 from public.service_requests where title like 'RLS TEST F3%')
  and not exists (select 1 from public.organisations where name like 'RLS TEST F3%') and not exists (select 1 from pg_constraint where conname = 'rls_f3_block'));

-- ---------- F-5 (0047): keeping periods ----------
reset role;
create or replace function pg_temp.column_write_denied(tbl text, col text)
returns boolean language plpgsql as $$
begin
  execute format('update public.%I set %I = now() where false', tbl, col);
  return false;
exception when insufficient_privilege then
  return true;
end $$;
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name || ' (with its new column)', pg_temp.read_denied(name))
from unnest(array['enquiries', 'service_requests', 'quote_requests', 'property_care_requests', 'managed_properties', 'build_projects', 'partner_applications', 'claims', 'trade_accounts']) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('A signed-in user cannot set personal_data_deleted_at on ' || name, pg_temp.column_write_denied(name, 'personal_data_deleted_at'))
from unnest(array['enquiries', 'service_requests', 'quote_requests', 'property_care_requests', 'managed_properties', 'build_projects', 'partner_applications', 'claims', 'trade_accounts']) as t(name);
select pg_temp.record_check('A signed-in user cannot set ended_at on managed properties', pg_temp.column_write_denied('managed_properties', 'ended_at'));
reset role;
do $$
declare
  res text := '';
  v_mp uuid;
  v_ended timestamptz;
begin
  begin
    insert into public.managed_properties (owner_name, title, status) values ('RLS TEST F5 owner', 'RLS TEST F5 flat', 'active') returning id into v_mp;
    res := res || case when (select ended_at from public.managed_properties where id = v_mp) is null then 'PASS' else 'FAIL' end || E' · A new managed property has no end date\n';
    update public.managed_properties set notes = 'still managed' where id = v_mp;
    res := res || case when (select ended_at from public.managed_properties where id = v_mp) is null then 'PASS' else 'FAIL' end || E' · Other changes do not set the end date\n';
    update public.managed_properties set status = 'ended' where id = v_mp;
    select ended_at into v_ended from public.managed_properties where id = v_mp;
    res := res || case when v_ended is not null then 'PASS' else 'FAIL' end || E' · Ending the management records when it ended\n';
    update public.managed_properties set notes = 'after the end' where id = v_mp;
    res := res || case when (select ended_at from public.managed_properties where id = v_mp) = v_ended then 'PASS' else 'FAIL' end || E' · A later change keeps the end date\n';
    update public.managed_properties set status = 'active' where id = v_mp;
    res := res || case when (select ended_at from public.managed_properties where id = v_mp) is null then 'PASS' else 'FAIL' end || E' · Restarting the management clears the end date\n';
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · F-5 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('F-5 checks left nothing behind', not exists (select 1 from public.managed_properties where title like 'RLS TEST F5%'));

-- ---------- S6-1 (0048): private partner registration, partner area and product drafts ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
-- Two private partners (A for user 1, B for user 2), each with one draft. Inserted directly (fixed references), so no
-- reference number is used up.
insert into public.organisations (id, kind, name, slug, status, source) values
  ('00000000-0000-4000-8000-0000000006a1', 'manufacturer', 'RLS TEST S6 partner A', 'rls-test-s6-partner-a', 'draft', 'admin'),
  ('00000000-0000-4000-8000-0000000006b1', 'supplier', 'RLS TEST S6 partner B', 'rls-test-s6-partner-b', 'draft', 'admin');
insert into public.partner_registrations (reference, roles, business_name, contact_name, phone, org_id, source, status) values
  ('HLB-RLS-A', array['manufacturer'], 'RLS TEST S6 partner A', 'A Test', '+251911000001', '00000000-0000-4000-8000-0000000006a1', 'staff', 'approved'),
  ('HLB-RLS-B', array['supplier'], 'RLS TEST S6 partner B', 'B Test', '+251911000002', '00000000-0000-4000-8000-0000000006b1', 'staff', 'approved');
insert into public.partner_members (org_id, user_id) values
  ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-0000000006b1', '00000000-0000-4000-8000-000000000002');
insert into public.partner_product_drafts (org_id, name, partner_sku, proposed_price_cents, status) values
  ('00000000-0000-4000-8000-0000000006a1', 'RLS TEST S6 draft A', 'SKU-A', 10000, 'submitted'),
  ('00000000-0000-4000-8000-0000000006b1', 'RLS TEST S6 draft B', 'SKU-B', 20000, 'draft');

set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name))
from unnest(array['partner_registrations', 'partner_members', 'partner_invitations', 'partner_product_drafts', 'product_sources', 'partner_my_products']) as t(name);

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('A signed-in user cannot read ' || name || ' directly', pg_temp.read_denied(name))
from unnest(array['partner_registrations', 'partner_members', 'partner_invitations', 'partner_product_drafts', 'product_sources']) as t(name);
select pg_temp.record_check('A partner member sees only their own partner''s drafts',
  (select count(*) from public.partner_my_products where name like 'RLS TEST S6%') = 1
  and (select name from public.partner_my_products where name like 'RLS TEST S6%') = 'RLS TEST S6 draft A');
select pg_temp.record_check('The partner view never carries prices or product codes',
  not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'partner_my_products' and column_name in ('partner_sku', 'proposed_price_cents')));
select pg_temp.record_check('A partner member cannot ' || label, pg_temp.write_denied(sql)) from (values
  ('add a draft directly', $q$insert into public.partner_product_drafts (org_id, name) values ('00000000-0000-4000-8000-0000000006a1', 'RLS TEST S6 direct')$q$),
  ('write a product source', $q$insert into public.product_sources (product_id, org_id) select id, '00000000-0000-4000-8000-0000000006a1' from public.products limit 1$q$),
  ('make themselves a member of another partner', $q$insert into public.partner_members (org_id, user_id) values ('00000000-0000-4000-8000-0000000006b1', '00000000-0000-4000-8000-000000000001')$q$),
  ('approve their own registration', $q$update public.partner_registrations set status = 'approved'$q$)
) as w(label, sql);
reset role;
-- The view cannot be written at all (read-only grant, and a view over two tables).
create or replace function pg_temp.view_write_refused(sql text)
returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when insufficient_privilege or feature_not_supported or object_not_in_prerequisite_state then
  return true;
end $$;
set role authenticated;
select pg_temp.record_check('A partner member cannot change a draft through the view',
  pg_temp.view_write_refused($q$update public.partner_my_products set name = 'RLS TEST S6 hacked' where name like 'RLS TEST S6%'$q$));
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
select pg_temp.record_check('The other partner sees only theirs',
  (select string_agg(name, ',') from public.partner_my_products where name like 'RLS TEST S6%') = 'RLS TEST S6 draft B');
reset role;
-- A suspended partner's member sees nothing.
update public.partner_registrations set status = 'suspended' where reference = 'HLB-RLS-B';
set role authenticated;
select pg_temp.record_check('A suspended partner''s member sees no drafts', not exists (select 1 from public.partner_my_products where name like 'RLS TEST S6%'));
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);

create or replace function pg_temp.refused(sql text)
returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when check_violation then
  return true;
end $$;
-- Every path that makes a business public ends in a status change or a business member: both are refused for partners.
select pg_temp.record_check('Partner business: ' || label || ' is refused', pg_temp.refused(sql)) from (values
  ('publishing (admin, moderation, imports)', $q$update public.organisations set status = 'published' where id = '00000000-0000-4000-8000-0000000006a1'$q$),
  ('sending for review (owner resubmit)', $q$update public.organisations set status = 'pending_review' where id = '00000000-0000-4000-8000-0000000006a1'$q$),
  ('adding a business member (team invitation, claim approval)', $q$insert into public.organisation_members (org_id, user_id, role) values ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-000000000001', 'owner')$q$)
) as w(label, sql);
insert into public.products (id, slug, name, category_id, seller_org_id)
select '00000000-0000-4000-8000-0000000006c1', 'rls-test-s6-product', 'RLS TEST S6 product', (select id from public.product_categories order by sort limit 1), id
from public.organisations where slug = 'hagerland-supply';
insert into public.products (id, slug, name, category_id, seller_org_id)
select '00000000-0000-4000-8000-0000000006c2', 'rls-test-s6-product-2', 'RLS TEST S6 product 2', (select id from public.product_categories order by sort limit 1), '00000000-0000-4000-8000-0000000000b1';
select pg_temp.record_check('A partner source on a product sold by HagerLand Supply is accepted',
  not pg_temp.refused($q$insert into public.product_sources (product_id, org_id) values ('00000000-0000-4000-8000-0000000006c1', '00000000-0000-4000-8000-0000000006a1')$q$));
select pg_temp.record_check('Partner-sourced product: ' || label || ' is refused', pg_temp.refused(sql)) from (values
  ('a source on a product sold by another business', $q$insert into public.product_sources (product_id, org_id) values ('00000000-0000-4000-8000-0000000006c2', '00000000-0000-4000-8000-0000000006a1')$q$),
  ('moving its seller away from HagerLand', $q$update public.products set seller_org_id = '00000000-0000-4000-8000-0000000006a1' where id = '00000000-0000-4000-8000-0000000006c1'$q$),
  ('making HagerLand itself a partner source', $q$insert into public.product_sources (product_id, org_id) select '00000000-0000-4000-8000-0000000006c1', id from public.organisations where slug = 'hagerland-developments'$q$)
) as w(label, sql);
select pg_temp.record_check('A product source makes its business a partner business too (publishing refused)',
  pg_temp.refused($q$update public.organisations set status = 'published' where id = '00000000-0000-4000-8000-0000000006b1'$q$));
update public.organisations set status = 'paused' where id = '00000000-0000-4000-8000-0000000000b1';
select pg_temp.record_check('Ordinary businesses can still be published (the rule is for partners only)',
  not pg_temp.refused($q$update public.organisations set status = 'published' where id = '00000000-0000-4000-8000-0000000000b1'$q$));
delete from public.product_sources where product_id in ('00000000-0000-4000-8000-0000000006c1', '00000000-0000-4000-8000-0000000006c2');
delete from public.products where id in ('00000000-0000-4000-8000-0000000006c1', '00000000-0000-4000-8000-0000000006c2');
delete from public.partner_product_drafts where name like 'RLS TEST S6%';
delete from public.partner_members where org_id in ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-0000000006b1');
delete from public.partner_registrations where reference in ('HLB-RLS-A', 'HLB-RLS-B');
delete from public.organisations where id in ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-0000000006b1');
select pg_temp.record_check('S6-1 checks left nothing behind',
  not exists (select 1 from public.partner_registrations where reference like 'HLB-RLS-%')
  and not exists (select 1 from public.products where slug like 'rls-test-s6%')
  and not exists (select 1 from public.organisations where slug like 'rls-test-s6%'));

create or replace function pg_temp.read_denied_sql(sql text)
returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when insufficient_privilege then
  return true;
end $$;

-- ---------- S6-2 (0049): order requests, reservations and payments ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
-- A private partner, a HagerLand Supply product it supplies, and one order request for each test user. Fixed references,
-- so no reference number is used up.
insert into public.organisations (id, kind, name, slug, status, source) values ('00000000-0000-4000-8000-0000000007a1', 'supplier', 'RLS TEST S62 partner', 'rls-test-s62-partner', 'draft', 'admin');
insert into public.products (id, slug, name, category_id, seller_org_id, unit, status)
select '00000000-0000-4000-8000-0000000007c1', 'rls-test-s62-product', 'RLS TEST S62 cement', (select id from public.product_categories order by sort limit 1), id, 'bag', 'published'
from public.organisations where slug = 'hagerland-supply';
-- S6-3: a cost below the test prices (a customer price below the partner's cost is refused).
insert into public.product_sources (product_id, org_id, cost_price_cents) values ('00000000-0000-4000-8000-0000000007c1', '00000000-0000-4000-8000-0000000007a1', 1000);
insert into public.order_requests (id, reference, requester_user_id, name, phone, delivery_address, access_token_hash) values
  ('00000000-0000-4000-8000-0000000007d1', 'HLR-RLS-A', '00000000-0000-4000-8000-000000000001', 'RLS TEST S62 A', '+251911000071', 'Bole', 'rls-s62-a'),
  ('00000000-0000-4000-8000-0000000007d2', 'HLR-RLS-B', '00000000-0000-4000-8000-000000000002', 'RLS TEST S62 B', '+251911000072', 'Kirkos', 'rls-s62-b');
insert into public.order_request_lines (id, order_request_id, product_id, item_name, quantity, unit) values
  ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007d1', '00000000-0000-4000-8000-0000000007c1', 'RLS TEST S62 cement', 10, 'bag'),
  ('00000000-0000-4000-8000-0000000007e2', '00000000-0000-4000-8000-0000000007d2', '00000000-0000-4000-8000-0000000007c1', 'RLS TEST S62 cement', 5, 'bag');
update public.order_request_lines set source_org_id = '00000000-0000-4000-8000-0000000007a1', cost_price_cents = 1000 where id = '00000000-0000-4000-8000-0000000007e1';

set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name))
from unnest(array['order_requests', 'order_request_lines', 'stock_reservations', 'order_request_events', 'order_request_payments', 'order_request_lines_customer']) as t(name);

reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('A customer reads only their own order request',
  (select string_agg(reference, ',') from (select reference from public.order_requests where reference like 'HLR-RLS-%') x) = 'HLR-RLS-A');
select pg_temp.record_check('A customer cannot read the private link, notes or history columns of their request',
  pg_temp.read_denied_sql($q$select access_token_hash from public.order_requests$q$) and pg_temp.read_denied_sql($q$select requester_user_id from public.order_requests$q$));
select pg_temp.record_check('A customer reads only their own lines, without the partner or the cost',
  (select count(*) from public.order_request_lines_customer where item_name like 'RLS TEST S62%') = 1
  and (select quantity from public.order_request_lines_customer where item_name like 'RLS TEST S62%') = 10
  and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'order_request_lines_customer' and column_name in ('source_org_id', 'cost_price_cents')));
select pg_temp.record_check('A signed-in user cannot read ' || name || ' directly', pg_temp.read_denied(name))
from unnest(array['order_request_lines', 'stock_reservations', 'order_request_events', 'order_request_payments']) as t(name);
select pg_temp.record_check('A customer cannot ' || label, pg_temp.write_denied(sql)) from (values
  ('send a request directly', $q$insert into public.order_requests (name, phone) values ('RLS TEST S62 direct', '+251911000079')$q$),
  ('change their request', $q$update public.order_requests set status = 'paid' where reference = 'HLR-RLS-A'$q$),
  ('record a payment', $q$insert into public.order_request_payments (order_request_id, entry_type, direction, amount_cents, occurred_on) values ('00000000-0000-4000-8000-0000000007d1', 'customer_payment', 'in', 1, current_date)$q$),
  ('record a stock hold', $q$insert into public.stock_reservations (order_request_line_id, org_id, qty, held_until) values ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007a1', 1, now() + interval '1 day')$q$)
) as w(label, sql);
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);

-- The state machine, the golden rule and the "exactly one source" checks (inside one block that is rolled back, so
-- no reference number is used up and nothing stays behind).
do $$
declare
  res text := '';
  v_total bigint;
  v_n int;
  refused boolean;
begin
  begin
    begin
      update public.order_requests set status = 'paid', updated_by = 'rls' where id = '00000000-0000-4000-8000-0000000007d1';
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A new order request cannot jump to paid\n';
    update public.order_requests set status = 'checking_stock', updated_by = 'rls' where id = '00000000-0000-4000-8000-0000000007d1';
    update public.order_request_lines set status = 'confirmed', confirmed_qty = 10 where id = '00000000-0000-4000-8000-0000000007e1';
    begin
      perform public.order_request_reserve('00000000-0000-4000-8000-0000000007d1', 48, 0, '[{"line_id": "00000000-0000-4000-8000-0000000007e1", "price_cents": 2000}]'::jsonb, 'rls');
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · No reservation without a partner hold that lasts until it ends\n';
    insert into public.stock_reservations (order_request_line_id, org_id, qty, held_until) values ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007a1', 10, now() + interval '3 days');
    v_total := public.order_request_reserve('00000000-0000-4000-8000-0000000007d1', 48, 0, '[{"line_id": "00000000-0000-4000-8000-0000000007e1", "price_cents": 2000}]'::jsonb, 'rls');
    res := res || case when v_total = 20000 and (select status from public.order_requests where id = '00000000-0000-4000-8000-0000000007d1') = 'reserved' then 'PASS' else 'FAIL' end || E' · Reserving fixes the total (10 × 20.00 = 200.00)\n';
    insert into public.order_request_payments (order_request_id, entry_type, direction, amount_cents, occurred_on, created_by) values ('00000000-0000-4000-8000-0000000007d1', 'customer_payment', 'in', 10000, current_date, 'rls');
    res := res || case when (select status from public.order_requests where id = '00000000-0000-4000-8000-0000000007d1') = 'reserved' then 'PASS' else 'FAIL' end || E' · A part payment does not make it paid\n';
    begin
      update public.order_requests set status = 'paid', updated_by = 'rls' where id = '00000000-0000-4000-8000-0000000007d1';
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · Paid cannot be set by hand without full payment\n';
    begin
      insert into public.order_request_payments (order_request_id, entry_type, direction, amount_cents, occurred_on, created_by) values ('00000000-0000-4000-8000-0000000007d1', 'refund', 'out', 10001, current_date, 'rls');
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A refund can never be more than was paid\n';
    insert into public.order_request_payments (order_request_id, entry_type, direction, amount_cents, occurred_on, created_by) values ('00000000-0000-4000-8000-0000000007d1', 'customer_payment', 'in', 10000, current_date, 'rls');
    res := res || case when (select status from public.order_requests where id = '00000000-0000-4000-8000-0000000007d1') = 'paid' then 'PASS' else 'FAIL' end || E' · Full payment before the end makes it paid (set by the database)\n';
    perform public.order_request_create_supply_orders('00000000-0000-4000-8000-0000000007d1', 'rls', current_date);
    select count(*) into v_n from public.supply_orders where order_request_id = '00000000-0000-4000-8000-0000000007d1' and status = 'paid' and quote_request_id is null;
    res := res || case when v_n = 1 and public.order_request_net_cents('00000000-0000-4000-8000-0000000007d1') = 0 and public.order_request_held_cents('00000000-0000-4000-8000-0000000007d1') = 20000 then 'PASS' else 'FAIL' end || E' · Supplier orders take the money into the ledger, to the cent\n';
    begin
      perform public.order_request_create_supply_orders('00000000-0000-4000-8000-0000000007d1', 'rls', current_date);
      refused := false;
    exception when check_violation or unique_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A second tap never makes a second supplier order\n';
    -- A late payment: the reservation of request B ends before the money arrives.
    update public.order_requests set status = 'checking_stock', updated_by = 'rls' where id = '00000000-0000-4000-8000-0000000007d2';
    update public.order_request_lines set status = 'confirmed', confirmed_qty = 5 where id = '00000000-0000-4000-8000-0000000007e2';
    insert into public.stock_reservations (order_request_line_id, org_id, qty, held_until) values ('00000000-0000-4000-8000-0000000007e2', '00000000-0000-4000-8000-0000000007a1', 5, now() + interval '3 days');
    perform public.order_request_reserve('00000000-0000-4000-8000-0000000007d2', 1, 0, '[{"line_id": "00000000-0000-4000-8000-0000000007e2", "price_cents": 2000}]'::jsonb, 'rls');
    update public.order_requests set reserved_until = now() - interval '1 minute', payment_due_at = now() - interval '1 minute' where id = '00000000-0000-4000-8000-0000000007d2';
    insert into public.order_request_payments (order_request_id, entry_type, direction, amount_cents, occurred_on, created_by) values ('00000000-0000-4000-8000-0000000007d2', 'customer_payment', 'in', 10000, current_date, 'rls');
    res := res || case when (select status from public.order_requests where id = '00000000-0000-4000-8000-0000000007d2') = 'reserved' then 'PASS' else 'FAIL' end || E' · A payment after the reservation ended is not accepted\n';
    perform public.order_request_expire_due('rls');
    res := res || case when (select status from public.order_requests where id = '00000000-0000-4000-8000-0000000007d2') = 'expired' then 'PASS' else 'FAIL' end || E' · The ended reservation expires\n';
    begin
      update public.order_requests set status = 'paid', updated_by = 'rls' where id = '00000000-0000-4000-8000-0000000007d2';
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · An ended reservation cannot become paid (only Reopen or refund)\n';
    begin
      insert into public.supply_orders (org_id, money_model) values ('00000000-0000-4000-8000-0000000007a1', 'A');
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A supplier order needs exactly one source (a quote or an order request)\n';
    begin
      insert into public.supply_order_lines (order_id, item_name, quantity, unit, supplier_unit_price_cents)
      select id, 'RLS TEST S62 line', 1, 'bag', 1 from public.supply_orders where order_request_id = '00000000-0000-4000-8000-0000000007d1' limit 1;
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · An order line needs exactly one link (a quote line or an order request line)\n';
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · S6-2 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;

-- Clean up (the history is append-only, so its test rows go with the replica setting, which turns the protections off
-- for this session's own statements only).
set session_replication_role = replica;
delete from public.order_request_events where order_request_id in ('00000000-0000-4000-8000-0000000007d1', '00000000-0000-4000-8000-0000000007d2');
set session_replication_role = origin;
delete from public.stock_reservations where order_request_line_id in ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007e2');
set session_replication_role = replica;
delete from public.order_request_lines where id in ('00000000-0000-4000-8000-0000000007e1', '00000000-0000-4000-8000-0000000007e2');
set session_replication_role = origin;
delete from public.order_requests where id in ('00000000-0000-4000-8000-0000000007d1', '00000000-0000-4000-8000-0000000007d2');
delete from public.product_sources where product_id = '00000000-0000-4000-8000-0000000007c1';
delete from public.products where id = '00000000-0000-4000-8000-0000000007c1';
delete from public.organisations where id = '00000000-0000-4000-8000-0000000007a1';
select pg_temp.record_check('S6-2 checks left nothing behind',
  not exists (select 1 from public.order_requests where reference like 'HLR-RLS-%')
  and not exists (select 1 from public.order_request_events where order_request_id in ('00000000-0000-4000-8000-0000000007d1', '00000000-0000-4000-8000-0000000007d2'))
  and not exists (select 1 from public.products where slug = 'rls-test-s62-product'));

-- ---------- S6-3 (0050): partner terms, settlements after delivery ----------
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);
set role anon;
select pg_temp.record_check('Anonymous cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['partner_settlements', 'partner_settlement_items']) as t(name);
reset role;
set role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated"}', false), set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
select pg_temp.record_check('A signed-in user (customer or partner member) cannot read ' || name, pg_temp.read_denied(name)) from unnest(array['partner_settlements', 'partner_settlement_items']) as t(name);
select pg_temp.record_check('A signed-in user cannot write a settlement', pg_temp.write_denied($q$insert into public.partner_settlements (org_id, period_from, period_to) values ('00000000-0000-4000-8000-0000000000b1', current_date, current_date)$q$));
reset role;
select set_config('request.jwt.claims', '', false), set_config('request.jwt.claim.sub', '', false);

do $$
declare
  res text := '';
  refused boolean;
  v_req uuid := '00000000-0000-4000-8000-0000000008d1';
  v_line uuid := '00000000-0000-4000-8000-0000000008e1';
  v_org uuid := '00000000-0000-4000-8000-0000000008a1';
  v_order uuid;
  v_settlement uuid;
  v_ref text;
  v_n int;
begin
  begin
    insert into public.organisations (id, kind, name, slug, status, source) values (v_org, 'supplier', 'RLS TEST S63 partner', 'rls-test-s63-partner', 'draft', 'admin');
    insert into public.products (id, slug, name, category_id, seller_org_id, unit, status)
    select '00000000-0000-4000-8000-0000000008c1', 'rls-test-s63-product', 'RLS TEST S63 cement', (select id from public.product_categories order by sort limit 1), id, 'bag', 'published'
    from public.organisations where slug = 'hagerland-supply';
    begin
      insert into public.product_sources (product_id, org_id, cost_price_cents, markup_bps, commission_bps) values ('00000000-0000-4000-8000-0000000008c1', v_org, 70000, 1000, 500);
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A source has one model: a markup or a commission, never both\n';
    insert into public.product_sources (product_id, org_id, cost_price_cents, markup_bps) values ('00000000-0000-4000-8000-0000000008c1', v_org, 70000, 1000);
    insert into public.order_requests (id, reference, name, phone, delivery_address) values (v_req, 'HLR-RLS-S63', 'RLS TEST S63', '+251911000081', 'Bole');
    insert into public.order_request_lines (id, order_request_id, product_id, item_name, quantity, unit) values (v_line, v_req, '00000000-0000-4000-8000-0000000008c1', 'RLS TEST S63 cement', 10, 'bag');
    update public.order_requests set status = 'checking_stock', updated_by = 'rls' where id = v_req;
    update public.order_request_lines set status = 'confirmed', confirmed_qty = 10 where id = v_line;
    insert into public.stock_reservations (order_request_line_id, org_id, qty, held_until) values (v_line, v_org, 10, now() + interval '3 days');
    begin
      perform public.order_request_reserve(v_req, 48, 0, jsonb_build_array(jsonb_build_object('line_id', v_line, 'price_cents', 60000)), 'rls');
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A reservation below what the partner is paid is refused\n';
    perform public.order_request_reserve(v_req, 48, 5000, '[]'::jsonb, 'rls');
    res := res || case when (select terms_model || ':' || terms_bps || ':' || partner_payable_unit_cents || ':' || customer_unit_price_cents from public.order_request_lines where id = v_line) = 'markup:1000:70000:77000' then 'PASS' else 'FAIL' end || E' · The reservation stores the terms (markup 10%: pays 700.00, suggests 770.00)\n';
    insert into public.order_request_payments (order_request_id, entry_type, direction, amount_cents, occurred_on, created_by) values (v_req, 'customer_payment', 'in', 775000, current_date, 'rls');
    select o.id into v_order from public.order_request_create_supply_orders(v_req, 'rls', current_date) o;
    res := res || case when (select hagerland_delivery_income_cents from public.supply_orders where id = v_order) = 5000 and public.supply_order_payable_cents(v_order) = 700000 then 'PASS' else 'FAIL' end || E' · Delivery stays HagerLand''s; the partner is owed 7,000.00\n';
    begin
      perform public.partner_settlement_create(v_org, current_date, current_date, array[v_order], '{}'::jsonb, 'rls');
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A partner is not settled before delivery with proof\n';
    update public.product_sources set settlement_timing = 'upfront' where product_id = '00000000-0000-4000-8000-0000000008c1' and org_id = v_org;
    begin
      perform public.partner_settlement_create(v_org, current_date, current_date, array[v_order], '{}'::jsonb, 'rls');
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · Up-front terms still need the owner''s reason\n';
    update public.product_sources set settlement_timing = 'after_delivery' where product_id = '00000000-0000-4000-8000-0000000008c1' and org_id = v_org;
    update public.supply_orders set status = 'placed', updated_by = 'rls' where id = v_order;
    update public.supply_orders set status = 'confirmed', updated_by = 'rls' where id = v_order;
    update public.supply_orders set status = 'out_for_delivery', updated_by = 'rls' where id = v_order;
    update public.supply_orders set status = 'delivered', updated_by = 'rls' where id = v_order;
    insert into public.supply_delivery_proofs (order_id, file_path, file_type, file_size_bytes) values (v_order, 'proofs/rls/s63.jpg', 'image/jpeg', 100);
    select s.id, s.reference into v_settlement, v_ref from public.partner_settlement_create(v_org, current_date, current_date, array[v_order], '{}'::jsonb, 'rls') s;
    begin
      perform public.partner_settlement_create(v_org, current_date, current_date, array[v_order], '{}'::jsonb, 'rls');
      refused := false;
    exception when unique_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · An order is never in two settlements\n';
    begin
      update public.partner_settlements set status = 'paid', paid_on = current_date, method = 'cash', approved_at = now() where id = v_settlement;
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A draft cannot jump to paid\n';
    begin
      update public.partner_settlements set total_cents = 1, status = 'approved', approved_at = now() where id = v_settlement;
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A total that differs from the items is refused\n';
    update public.partner_settlements set status = 'approved', approved_at = now(), approved_by = 'rls' where id = v_settlement;
    perform public.partner_settlement_pay(v_settlement, current_date, 'bank_transfer', 'RLS-TRX', 'rls');
    select count(*) into v_n from public.supply_ledger_entries where reference = v_ref and entry_type = 'supplier_payment' and amount_cents = 700000 and order_id = v_order and org_id = v_org;
    res := res || case when v_n = 1 and (select status from public.partner_settlements where id = v_settlement) = 'paid' then 'PASS' else 'FAIL' end || E' · Paying writes one supplier payment per order and marks it paid\n';
    begin
      perform public.partner_settlement_pay(v_settlement, current_date, 'bank_transfer', 'RLS-TRX', 'rls');
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A settlement is paid only once\n';
    begin
      update public.partner_settlements set status = 'void', void_reason = 'test' where id = v_settlement;
      refused := false;
    exception when check_violation then refused := true;
    end;
    res := res || case when refused then 'PASS' else 'FAIL' end || E' · A paid settlement is final\n';
    insert into public.supply_ledger_entries (entry_type, direction, amount_cents, occurred_on, order_id, org_id, created_by) values ('refund', 'out', 77000, current_date, v_order, v_org, 'rls');
    res := res || case when exists (select 1 from public.partner_settlement_items where settlement_id is null and org_id = v_org and kind = 'adjustment' and amount_cents = -77000) then 'PASS' else 'FAIL' end || E' · A refund after settlement waits as an adjustment for the next settlement\n';
    raise exception 'hl_rollback';
  exception when raise_exception then
    if sqlerrm <> 'hl_rollback' then res := res || 'FAIL · S6-3 checks stopped early: ' || sqlerrm || E'\n'; end if;
  end;
  perform set_config('hl.results', current_setting('hl.results') || res, false);
end $$;
select pg_temp.record_check('S6-3 checks left nothing behind', not exists (select 1 from public.partner_settlements s join public.organisations o on o.id = s.org_id where o.slug = 'rls-test-s63-partner') and not exists (select 1 from public.organisations where slug = 'rls-test-s63-partner'));

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
