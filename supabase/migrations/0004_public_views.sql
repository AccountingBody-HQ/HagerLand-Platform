-- 0004 · Public read views (spec 6.5).
-- Each view is owned by postgres and therefore deliberately bypasses RLS on the base tables.
-- Safety comes from the view itself: it filters to published rows and selects only safe columns
-- (never contact details, pending changes, tax or licence numbers, or internal notes).
-- Views are security barriers and read-only: visitors get SELECT and nothing else.

create view public.organisations_public with (security_barrier = true) as
select
  o.id, o.kind, o.name, o.slug, o.short_id, o.tagline, o.description, o.logo_path, o.cover_path,
  o.website, o.location_id, l.display_name as location_display, l.path as location_path,
  o.areas_served, o.year_established, o.team_size, o.licence_category, o.licence_grade,
  o.verification_level, o.verified_at, o.is_hagerland, o.is_featured, o.featured_until,
  o.social, o.opening_hours, o.published_at, o.updated_at,
  (o.phone is not null) as has_phone,
  (o.whatsapp is not null) as has_whatsapp,
  (o.telegram is not null) as has_telegram,
  (o.email is not null) as has_email,
  exists (select 1 from public.organisation_members m where m.org_id = o.id) as has_members,
  o.search_tsv
from public.organisations o
left join public.locations l on l.id = o.location_id
where o.status = 'published';
comment on view public.organisations_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only published organisations and only public-safe columns.';

create view public.developments_public with (security_barrier = true) as
select
  d.id, d.kind, d.name, d.slug, d.short_id, d.developer_org_id,
  org.name as developer_name, org.slug as developer_slug, org.verification_level as developer_verification,
  d.is_hagerland, d.summary, d.description, d.location_id, l.display_name as location_display, l.path as location_path,
  case when d.address_line is not null then d.address_line end as address_line,
  d.lat, d.lng, d.completion_status, d.expected_completion, d.completed_year, d.total_units, d.floors_label,
  d.unit_types, d.price_from_etb, d.price_to_etb, d.payment_plan, d.amenities, d.finishing_status, d.tenure,
  d.brochure_path, d.video_url, d.is_featured, d.featured_until, d.register_interest_enabled,
  d.published_at, d.updated_at, d.views_count,
  (select m.storage_path from public.media m
    where m.entity_type = 'development' and m.entity_id = d.id and m.status = 'approved' and m.kind in ('image', 'cover')
    order by m.is_cover desc, m.sort, m.created_at limit 1) as cover_path,
  d.search_tsv
from public.developments d
left join public.locations l on l.id = d.location_id
left join public.organisations org on org.id = d.developer_org_id and org.status = 'published'
where d.status = 'published';
comment on view public.developments_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only published developments and only public-safe columns.';

create view public.properties_public with (security_barrier = true) as
select
  p.id, p.short_id, p.slug, p.purpose, p.property_type, p.title, p.description,
  p.price_etb, p.price_period, p.price_negotiable, p.price_on_request, p.advance_months, p.service_charge_etb,
  p.bedrooms, p.bathrooms, p.area_m2, p.plot_area_m2, p.floors_label, p.floor_number, p.year_built,
  p.finishing_status, p.furnishing, p.tenure, p.has_title_deed, p.completion_status, p.parking_spaces, p.features,
  p.location_id, l.name as location_name, l.display_name as location_display, l.path as location_path,
  case when p.show_exact_location then p.address_line end as address_line,
  case when p.show_exact_location then p.lat else round(p.lat, 2) end as lat,
  case when p.show_exact_location then p.lng else round(p.lng, 2) end as lng,
  p.show_exact_location, p.development_id, dev.name as development_name, dev.slug as development_slug,
  p.lister_type, p.lister_org_id,
  coalesce(org.name, split_part(prof.full_name, ' ', 1), 'Private owner') as lister_name,
  org.slug as lister_org_slug, org.logo_path as lister_logo_path, org.verification_level as lister_verification,
  p.video_url, p.virtual_tour_url, p.published_at, p.updated_at, p.renewed_at,
  p.is_featured and coalesce(p.featured_until > now(), false) as is_featured,
  p.is_hagerland, p.views_count,
  (p.contact_phone is not null) as has_phone,
  (p.contact_whatsapp is not null) as has_whatsapp,
  (p.contact_telegram is not null) as has_telegram,
  (p.contact_email is not null) as has_email,
  (select m.storage_path from public.media m
    where m.entity_type = 'property' and m.entity_id = p.id and m.status = 'approved' and m.kind = 'image'
    order by m.is_cover desc, m.sort, m.created_at limit 1) as cover_path,
  (select count(*)::int from public.media m
    where m.entity_type = 'property' and m.entity_id = p.id and m.status = 'approved' and m.kind = 'image') as photo_count,
  p.search_tsv
from public.properties p
join public.locations l on l.id = p.location_id
left join public.developments dev on dev.id = p.development_id and dev.status = 'published'
left join public.organisations org on org.id = p.lister_org_id and org.status = 'published'
left join public.profiles prof on prof.id = p.lister_user_id
where p.status = 'published' and p.expires_at > now();
comment on view public.properties_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only published, unexpired listings; contact details are never included (they come from /api/contact-reveal).';

create view public.products_public with (security_barrier = true) as
select
  pr.id, pr.short_id, pr.slug, pr.name, pr.category_id, c.name as category_name, c.slug as category_slug,
  c.parent_id as category_parent_id, pr.brand_id, b.name as brand_name, b.slug as brand_slug,
  pr.seller_org_id, org.name as seller_name, org.slug as seller_slug, org.is_hagerland as seller_is_hagerland,
  pr.sku, pr.model_number, pr.summary, pr.description, pr.specs, pr.unit, pr.pack_size, pr.min_order_qty,
  pr.price_type, pr.price_etb_cents, pr.price_updated_at, pr.stock_status, pr.lead_time_days,
  pr.country_of_origin, pr.warranty, pr.delivery_available,
  pr.is_featured and coalesce(pr.featured_until > now(), false) as is_featured,
  pr.published_at, pr.updated_at,
  (select m.storage_path from public.media m
    where m.entity_type = 'product' and m.entity_id = pr.id and m.status = 'approved' and m.kind = 'image'
    order by m.is_cover desc, m.sort, m.created_at limit 1) as image_path,
  pr.search_tsv
from public.products pr
join public.product_categories c on c.id = pr.category_id and c.is_active
join public.organisations org on org.id = pr.seller_org_id and org.status = 'published'
left join public.brands b on b.id = pr.brand_id and b.is_active
where pr.status = 'published';
comment on view public.products_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only published products from published sellers; trade prices excluded.';

create view public.portfolio_public with (security_barrier = true) as
select
  pp.id, pp.org_id, pp.title, pp.description, pp.location_id, l.display_name as location_display,
  pp.year, pp.project_value_band, pp.development_id, pp.cover_path, pp.sort, pp.updated_at
from public.portfolio_projects pp
join public.organisations o on o.id = pp.org_id and o.status = 'published'
left join public.locations l on l.id = pp.location_id
where pp.status = 'published';
comment on view public.portfolio_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only published portfolio projects of published organisations.';

create view public.media_public with (security_barrier = true) as
select m.id, m.entity_type, m.entity_id, m.kind, m.storage_path, m.thumb_path, m.width, m.height, m.alt, m.sort, m.is_cover
from public.media m
where m.status = 'approved'
  and m.kind <> 'document'
  and case m.entity_type
    when 'property' then exists (select 1 from public.properties p where p.id = m.entity_id and p.status = 'published' and p.expires_at > now())
    when 'development' then exists (select 1 from public.developments d where d.id = m.entity_id and d.status = 'published')
    when 'organisation' then exists (select 1 from public.organisations o where o.id = m.entity_id and o.status = 'published')
    when 'portfolio' then exists (select 1 from public.portfolio_projects pp join public.organisations o on o.id = pp.org_id
      where pp.id = m.entity_id and pp.status = 'published' and o.status = 'published')
    when 'product' then exists (select 1 from public.products pr where pr.id = m.entity_id and pr.status = 'published')
    else false
  end;
comment on view public.media_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only approved images whose parent record is public.';

create view public.site_settings_public with (security_barrier = true) as
select s.key, s.value
from public.site_settings s
where s.key in (
  'contact_details', 'social_links', 'announcement_bar', 'homepage_featured_ids',
  'listing_expiry_days', 'min_results_for_index', 'private_owner_max_active_listings',
  'verified_business_count_min', 'quote_response_target', 'legal_last_updated'
);
comment on view public.site_settings_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only a whitelist of public settings.';

-- Org service and supply-category links for published organisations (used by profile pages).
create view public.organisation_services_public with (security_barrier = true) as
select os.org_id, sc.id as service_id, sc.name, sc.slug, sc.parent_id
from public.organisation_services os
join public.organisations o on o.id = os.org_id and o.status = 'published'
join public.service_categories sc on sc.id = os.service_id and sc.is_active;
comment on view public.organisation_services_public is
  'Bypasses RLS on purpose (owned by postgres): services offered by published organisations.';

create view public.org_product_categories_public with (security_barrier = true) as
select opc.org_id, pc.id as product_category_id, pc.name, pc.slug, pc.parent_id
from public.org_product_categories opc
join public.organisations o on o.id = opc.org_id and o.status = 'published'
join public.product_categories pc on pc.id = opc.product_category_id and pc.is_active;
comment on view public.org_product_categories_public is
  'Bypasses RLS on purpose (owned by postgres): product categories supplied by published organisations.';

-- Supabase's default privileges grant ALL on new views to anon and authenticated, and simple
-- views (site_settings_public, media_public) are auto-updatable. Remove everything first so the
-- views are strictly read-only, then grant SELECT alone.
revoke all on
  public.organisations_public, public.developments_public, public.properties_public, public.products_public,
  public.portfolio_public, public.media_public, public.site_settings_public,
  public.organisation_services_public, public.org_product_categories_public
from public, anon, authenticated;

grant select on
  public.organisations_public, public.developments_public, public.properties_public, public.products_public,
  public.portfolio_public, public.media_public, public.site_settings_public,
  public.organisation_services_public, public.org_product_categories_public
to anon, authenticated;

-- Minimal facts about a listing that is no longer live, so its old URL can show
-- "This property is no longer available" with similar listings (spec 8.3).
create function public.property_unavailable(p_short_id text)
returns table (
  short_id text, purpose public.listing_purpose, property_type public.property_type, title text,
  location_id uuid, location_display text, location_path text, bedrooms smallint
)
language sql stable
security definer
set search_path = ''
as $$
  select p.short_id, p.purpose, p.property_type, p.title, p.location_id, l.display_name, l.path, p.bedrooms
  from public.properties p
  join public.locations l on l.id = p.location_id
  where p.short_id = p_short_id
    and (p.status = 'expired' or (p.status = 'published' and p.expires_at <= now()))
$$;
grant execute on function public.property_unavailable(text) to anon, authenticated;
