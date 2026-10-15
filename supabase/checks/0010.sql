-- expect: t
select (select count(*) from public.site_settings_public where key in ('legal_entity', 'free_listing_confirmed', 'developments_claims', 'delivery_area')) = 4;
