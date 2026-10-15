-- UNDO for 2026-10-13_drop_open_read_policies.sql
-- Recreates the seven open read policies exactly as they were (SELECT, PERMISSIVE,
-- role anon, USING true). Running this re-opens the security hole: use only if the
-- live site breaks after the hotfix.

create policy "Public can read cars" on public.cars as permissive for select to anon using (true);
create policy "Public can read community" on public.community as permissive for select to anon using (true);
create policy "Public can read companies" on public.companies as permissive for select to anon using (true);
create policy "Public can read events" on public.events as permissive for select to anon using (true);
create policy "Public can read housing" on public.housing as permissive for select to anon using (true);
create policy "Public can read jobs" on public.jobs as permissive for select to anon using (true);
create policy "Public can read tutors" on public.tutors as permissive for select to anon using (true);
