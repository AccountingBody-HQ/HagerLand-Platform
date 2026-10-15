-- LEGACY LOCKDOWN · cutover step 7 (spec 20.3, brief 25.6) · run ONLY after the new site is live on www.hagerland.com.
--
-- The old site read its tables with the public (anon) key. Once the new site is live nothing does, so this closes them:
-- it removes every remaining public read policy on the 22 legacy tables and takes back the anon / signed-in table
-- permissions. The data stays exactly as it is (nothing is dropped, deleted or truncated). The new site still uses
-- rate_limits and import_log, but only through the server's service-role key, which this does not touch.
--
-- Kept out of supabase/migrations on purpose: the numbered migrations run before the merge (cutover step 3), while the
-- old site still needs these reads.
-- Undo: supabase/legacy/cutover_legacy_lockdown_REVERSE.sql · Proof: supabase/legacy/cutover_legacy_lockdown_check.sql

drop policy if exists "Public can read active cars listings" on public.cars;
drop policy if exists "Public can read active community listings" on public.community;
drop policy if exists "Public can read active companies listings" on public.companies;
drop policy if exists "Public can read countries" on public.countries;
drop policy if exists "Public can read active delivery listings" on public.delivery;
drop policy if exists "Public can read active events listings" on public.events;
drop policy if exists "Public can read active housing listings" on public.housing;
drop policy if exists "Public can read active jobs listings" on public.jobs;
drop policy if exists "Public can read active made_in_ethiopia listings" on public.made_in_ethiopia;
drop policy if exists "Public can read active money listings" on public.money;
drop policy if exists "Public can read sole_traders" on public.sole_traders;
drop policy if exists "Public can read active tutors listings" on public.tutors;

revoke all on table
  public.admin_audit, public.agent_log, public.business_claims, public.cars, public.claimed_profiles, public.claiming_requests,
  public.community, public.companies, public.countries, public.delivery, public.directors, public.events,
  public.formation_agent_addresses, public.housing, public.import_log, public.jobs, public.listing_enquiries,
  public.made_in_ethiopia, public.money, public.rate_limits, public.sole_traders, public.tutors
from anon, authenticated;
