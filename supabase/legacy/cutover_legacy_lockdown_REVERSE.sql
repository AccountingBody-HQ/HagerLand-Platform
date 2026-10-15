-- UNDO for cutover_legacy_lockdown.sql (use only if the cutover is rolled back to the old site).
-- Puts back the read policies and table permissions exactly as they were after the 13 Oct 2026 hotfix
-- (docs/legacy-schema-snapshot.md). It does not re-create the seven open policies removed by that hotfix.

grant all on table
  public.admin_audit, public.agent_log, public.business_claims, public.cars, public.claimed_profiles, public.claiming_requests,
  public.community, public.companies, public.countries, public.delivery, public.directors, public.events,
  public.formation_agent_addresses, public.housing, public.import_log, public.jobs, public.listing_enquiries,
  public.made_in_ethiopia, public.money, public.rate_limits, public.sole_traders, public.tutors
to anon, authenticated;

create policy "Public can read active cars listings" on public.cars as permissive for select to public using (status = 'active'::text);
create policy "Public can read active community listings" on public.community as permissive for select to public using (status = 'active'::text);
create policy "Public can read active companies listings" on public.companies as permissive for select to public using (status = 'active'::text);
create policy "Public can read countries" on public.countries as permissive for select to anon using (true);
create policy "Public can read active delivery listings" on public.delivery as permissive for select to public using (status = 'active'::text);
create policy "Public can read active events listings" on public.events as permissive for select to public using (status = 'active'::text);
create policy "Public can read active housing listings" on public.housing as permissive for select to public using (status = 'active'::text);
create policy "Public can read active jobs listings" on public.jobs as permissive for select to public using (status = 'active'::text);
create policy "Public can read active made_in_ethiopia listings" on public.made_in_ethiopia as permissive for select to public using (status = 'active'::text);
create policy "Public can read active money listings" on public.money as permissive for select to public using (status = 'active'::text);
create policy "Public can read sole_traders" on public.sole_traders as permissive for select to anon using (true);
create policy "Public can read active tutors listings" on public.tutors as permissive for select to public using (status = 'active'::text);
