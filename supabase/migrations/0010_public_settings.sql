-- 0010 · More public settings so AB can fill in business details from the admin Settings screen.
-- Every value starts empty, and the website hides anything that is empty (spec Section 23).
-- Additive only: widens the list of settings the public website may read and adds empty rows.

create or replace view public.site_settings_public with (security_barrier = true) as
select s.key, s.value
from public.site_settings s
where s.key in (
  'contact_details', 'social_links', 'announcement_bar', 'homepage_featured_ids',
  'listing_expiry_days', 'min_results_for_index', 'private_owner_max_active_listings',
  'verified_business_count_min', 'quote_response_target', 'legal_last_updated',
  'legal_entity', 'free_listing_confirmed', 'developments_claims', 'delivery_area'
);
comment on view public.site_settings_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only a whitelist of public settings.';

-- Keep the view read-only for visitors (same rule as 0004).
revoke all on public.site_settings_public from public, anon, authenticated;
grant select on public.site_settings_public to anon, authenticated;

insert into public.site_settings (key, value)
values
  ('legal_entity', '{"name": "", "registration_number": "", "address": "", "governing_law": ""}'),
  ('free_listing_confirmed', 'false'),
  ('developments_claims', '[]'),
  ('delivery_area', '""'),
  ('contact_details', '{"phone": "", "whatsapp": "", "telegram": "", "email": "", "supply_email": "", "address": "", "hours": ""}')
on conflict (key) do update
  set value = case when public.site_settings.value = '{}'::jsonb then excluded.value else public.site_settings.value end;
