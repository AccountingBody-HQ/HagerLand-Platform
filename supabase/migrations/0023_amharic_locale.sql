-- 0023 · Amharic locale switch (spec 25.2m). OFF by default: /am pages stay unavailable until AB switches them on
-- in admin → Settings after a native speaker has reviewed the translation. Additive only.

insert into public.site_settings (key, value) values ('amharic_enabled', 'false') on conflict (key) do nothing;

create or replace view public.site_settings_public with (security_barrier = true) as
select s.key, s.value
from public.site_settings s
where s.key in (
  'contact_details', 'social_links', 'announcement_bar', 'homepage_featured_ids',
  'listing_expiry_days', 'min_results_for_index', 'private_owner_max_active_listings',
  'verified_business_count_min', 'quote_response_target', 'legal_last_updated',
  'legal_entity', 'free_listing_confirmed', 'developments_claims', 'delivery_area',
  'property_care_pricing', 'amharic_enabled'
);
comment on view public.site_settings_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only a whitelist of public settings.';
revoke all on public.site_settings_public from public, anon, authenticated;
grant select on public.site_settings_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0023', 'amharic_locale') on conflict (version) do nothing;
