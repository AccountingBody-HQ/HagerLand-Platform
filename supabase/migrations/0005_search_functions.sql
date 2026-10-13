-- 0005 · Search functions (spec 6.7, 13).
-- SECURITY DEFINER so anonymous visitors can search, but each function reads only the
-- *_public views, so results contain only published rows and public-safe columns.
-- Results are returned as JSON: {"total": <int>, "items": [ ... ]}.
-- Organic ordering never favours HagerLand's own records (integrity rule, spec 1.3).

create function public.tsquery_or_null(q text)
returns tsquery
language sql immutable
set search_path = public, extensions
as $$
  select case when nullif(trim(coalesce(q, '')), '') is null then null
              else websearch_to_tsquery('simple', public.f_unaccent(q)) end
$$;

create function public.search_properties(
  p_q text default null,
  p_purpose public.listing_purpose default null,
  p_types public.property_type[] default null,
  p_location_id uuid default null,
  p_price_min bigint default null,
  p_price_max bigint default null,
  p_beds_min int default null,
  p_baths_min int default null,
  p_area_min numeric default null,
  p_area_max numeric default null,
  p_finishing public.finishing_status[] default null,
  p_furnishing public.furnishing[] default null,
  p_features text[] default null,
  p_completion public.completion_status[] default null,
  p_has_title_deed boolean default null,
  p_lister_type text default null,
  p_added_within_days int default null,
  p_include_negotiable boolean default true,
  p_development_id uuid default null,
  p_lister_org_id uuid default null,
  p_exclude_id uuid default null,
  p_featured_only boolean default false,
  p_sort text default 'newest',
  p_page int default 1,
  p_page_size int default 24
)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select public.tsquery_or_null(p_q) as ts,
           greatest(1, least(coalesce(p_page_size, 24), 48)) as size,
           greatest(1, coalesce(p_page, 1)) as page
  ),
  matched as (
    select v.*, case when params.ts is null then 0
                     else ts_rank(v.search_tsv || l.search_tsv, params.ts) + similarity(v.title, p_q) end as rank
    from public.properties_public v
    join public.locations l on l.id = v.location_id
    cross join params
    where (params.ts is null or (v.search_tsv || l.search_tsv) @@ params.ts or similarity(v.title, p_q) > 0.3)
      and (p_purpose is null or v.purpose = p_purpose)
      and (p_types is null or cardinality(p_types) = 0 or v.property_type = any (p_types))
      and (p_location_id is null or v.location_id in (select public.locations_descendants(p_location_id)))
      and (p_price_min is null or v.price_etb >= p_price_min)
      and (p_price_max is null or v.price_etb <= p_price_max)
      and (p_beds_min is null or v.bedrooms >= p_beds_min)
      and (p_baths_min is null or v.bathrooms >= p_baths_min)
      and (p_area_min is null or v.area_m2 >= p_area_min)
      and (p_area_max is null or v.area_m2 <= p_area_max)
      and (p_finishing is null or cardinality(p_finishing) = 0 or v.finishing_status = any (p_finishing))
      and (p_furnishing is null or cardinality(p_furnishing) = 0 or v.furnishing = any (p_furnishing))
      and (p_features is null or v.features @> p_features)
      and (p_completion is null or cardinality(p_completion) = 0 or v.completion_status = any (p_completion))
      and (p_has_title_deed is null or v.has_title_deed = p_has_title_deed)
      and (p_lister_type is null or v.lister_type = p_lister_type)
      and (p_added_within_days is null or v.published_at >= now() - make_interval(days => p_added_within_days))
      and (coalesce(p_include_negotiable, true) or not v.price_negotiable)
      and (p_development_id is null or v.development_id = p_development_id)
      and (p_lister_org_id is null or v.lister_org_id = p_lister_org_id)
      and (p_exclude_id is null or v.id <> p_exclude_id)
      and (not coalesce(p_featured_only, false) or v.is_featured)
  ),
  ordered as (
    select m.*, count(*) over () as total_count,
           row_number() over (order by
             case when p_sort = 'relevance' then m.rank end desc nulls last,
             case when p_sort = 'price_asc' then m.price_etb end asc nulls last,
             case when p_sort = 'price_desc' then m.price_etb end desc nulls last,
             case when p_sort = 'area_desc' then m.area_m2 end desc nulls last,
             m.published_at desc, m.id) as rn
    from matched m
  )
  select jsonb_build_object(
    'total', coalesce((select max(total_count) from ordered), 0),
    'items', coalesce((
      select jsonb_agg(to_jsonb(o) - 'search_tsv' - 'rank' - 'total_count' - 'rn' order by o.rn)
      from ordered o, params
      where o.rn > (params.page - 1) * params.size and o.rn <= params.page * params.size
    ), '[]'::jsonb)
  )
$$;

create function public.search_products(
  p_q text default null,
  p_category_id uuid default null,
  p_brand_ids uuid[] default null,
  p_price_min bigint default null,
  p_price_max bigint default null,
  p_stock_statuses public.stock_status[] default null,
  p_seller_org_id uuid default null,
  p_units text[] default null,
  p_exclude_id uuid default null,
  p_sort text default 'popular',
  p_page int default 1,
  p_page_size int default 24
)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select public.tsquery_or_null(p_q) as ts,
           greatest(1, least(coalesce(p_page_size, 24), 48)) as size,
           greatest(1, coalesce(p_page, 1)) as page
  ),
  matched as (
    select v.*, case when params.ts is null then 0 else ts_rank(v.search_tsv, params.ts) + similarity(v.name, p_q) end as rank
    from public.products_public v
    cross join params
    where (params.ts is null or v.search_tsv @@ params.ts or similarity(v.name, p_q) > 0.3)
      and (p_category_id is null or v.category_id in (select public.category_descendants('product_categories', p_category_id)))
      and (p_brand_ids is null or cardinality(p_brand_ids) = 0 or v.brand_id = any (p_brand_ids))
      and (p_price_min is null or v.price_etb_cents >= p_price_min)
      and (p_price_max is null or v.price_etb_cents <= p_price_max)
      and (p_stock_statuses is null or cardinality(p_stock_statuses) = 0 or v.stock_status = any (p_stock_statuses))
      and (p_seller_org_id is null or v.seller_org_id = p_seller_org_id)
      and (p_units is null or cardinality(p_units) = 0 or v.unit = any (p_units))
      and (p_exclude_id is null or v.id <> p_exclude_id)
  ),
  ordered as (
    select m.*, count(*) over () as total_count,
           row_number() over (order by
             case when p_sort = 'relevance' then m.rank end desc nulls last,
             case when p_sort = 'popular' then m.is_featured end desc nulls last,
             case when p_sort = 'price_asc' then m.price_etb_cents end asc nulls last,
             case when p_sort = 'price_desc' then m.price_etb_cents end desc nulls last,
             case when p_sort = 'newest' then m.published_at end desc nulls last,
             m.name, m.id) as rn
    from matched m
  )
  select jsonb_build_object(
    'total', coalesce((select max(total_count) from ordered), 0),
    'items', coalesce((
      select jsonb_agg(to_jsonb(o) - 'search_tsv' - 'rank' - 'total_count' - 'rn' order by o.rn)
      from ordered o, params
      where o.rn > (params.page - 1) * params.size and o.rn <= params.page * params.size
    ), '[]'::jsonb)
  )
$$;

-- Organisations: verified businesses get a small, documented ranking boost (spec 13).
create function public.search_organisations(
  p_q text default null,
  p_kinds public.org_kind[] default null,
  p_service_id uuid default null,
  p_product_category_id uuid default null,
  p_location_id uuid default null,
  p_verified_only boolean default false,
  p_has_portfolio boolean default false,
  p_licence_grade text default null,
  p_exclude_id uuid default null,
  p_sort text default 'verified',
  p_page int default 1,
  p_page_size int default 24
)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select public.tsquery_or_null(p_q) as ts,
           greatest(1, least(coalesce(p_page_size, 24), 48)) as size,
           greatest(1, coalesce(p_page, 1)) as page,
           case when p_location_id is null then null
                else array(select public.locations_descendants(p_location_id)) end as locs
  ),
  matched as (
    select v.*,
      (case when params.ts is null then 0 else ts_rank(v.search_tsv, params.ts) + similarity(v.name, p_q) end)
        + case when v.verification_level = 'verified' then 0.1 else 0 end as rank,
      (select count(*)::int from public.portfolio_public pp where pp.org_id = v.id) as portfolio_count,
      (select count(*)::int from public.properties_public pr where pr.lister_org_id = v.id) as listings_count,
      (select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'slug', s.slug) order by s.name), '[]'::jsonb)
         from public.organisation_services_public s where s.org_id = v.id) as services
    from public.organisations_public v
    cross join params
    where (params.ts is null or v.search_tsv @@ params.ts or similarity(v.name, p_q) > 0.3)
      and (p_kinds is null or cardinality(p_kinds) = 0 or v.kind = any (p_kinds))
      and (p_service_id is null or exists (
        select 1 from public.organisation_services os
        where os.org_id = v.id and os.service_id in (select public.category_descendants('service_categories', p_service_id))))
      and (p_product_category_id is null or exists (
        select 1 from public.org_product_categories opc
        where opc.org_id = v.id and opc.product_category_id in (select public.category_descendants('product_categories', p_product_category_id))))
      and (params.locs is null or v.location_id = any (params.locs) or v.areas_served && params.locs)
      and (not coalesce(p_verified_only, false) or v.verification_level = 'verified')
      and (not coalesce(p_has_portfolio, false) or exists (select 1 from public.portfolio_public pp where pp.org_id = v.id))
      and (p_licence_grade is null or v.licence_grade = p_licence_grade)
      and (p_exclude_id is null or v.id <> p_exclude_id)
  ),
  ordered as (
    select m.*, count(*) over () as total_count,
           row_number() over (order by
             case when p_sort = 'relevance' then m.rank end desc nulls last,
             case when p_sort in ('verified', 'listings') then
               case m.verification_level when 'verified' then 2 when 'claimed' then 1 else 0 end end desc nulls last,
             case when p_sort = 'listings' then m.listings_count end desc nulls last,
             case when p_sort = 'projects' then m.portfolio_count end desc nulls last,
             case when p_sort = 'newest' then m.published_at end desc nulls last,
             m.name, m.id) as rn
    from matched m
  )
  select jsonb_build_object(
    'total', coalesce((select max(total_count) from ordered), 0),
    'items', coalesce((
      select jsonb_agg(to_jsonb(o) - 'search_tsv' - 'rank' - 'total_count' - 'rn' order by o.rn)
      from ordered o, params
      where o.rn > (params.page - 1) * params.size and o.rn <= params.page * params.size
    ), '[]'::jsonb)
  )
$$;

create function public.search_developments(
  p_q text default null,
  p_location_id uuid default null,
  p_completion public.completion_status[] default null,
  p_price_min bigint default null,
  p_price_max bigint default null,
  p_is_hagerland boolean default null,
  p_developer_org_id uuid default null,
  p_kinds public.development_kind[] default null,
  p_exclude_id uuid default null,
  p_sort text default 'newest',
  p_page int default 1,
  p_page_size int default 24
)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  with params as (
    select public.tsquery_or_null(p_q) as ts,
           greatest(1, least(coalesce(p_page_size, 24), 48)) as size,
           greatest(1, coalesce(p_page, 1)) as page
  ),
  matched as (
    select v.*,
      case when params.ts is null then 0 else ts_rank(v.search_tsv || coalesce(l.search_tsv, ''::tsvector), params.ts) + similarity(v.name, p_q) end as rank,
      (select count(*)::int from public.properties_public pr where pr.development_id = v.id) as listings_count
    from public.developments_public v
    left join public.locations l on l.id = v.location_id
    cross join params
    where (params.ts is null or (v.search_tsv || coalesce(l.search_tsv, ''::tsvector)) @@ params.ts or similarity(v.name, p_q) > 0.3)
      and (p_location_id is null or v.location_id in (select public.locations_descendants(p_location_id)))
      and (p_completion is null or cardinality(p_completion) = 0 or v.completion_status = any (p_completion))
      and (p_price_min is null or v.price_from_etb >= p_price_min)
      and (p_price_max is null or v.price_from_etb <= p_price_max)
      and (p_is_hagerland is null or v.is_hagerland = p_is_hagerland)
      and (p_developer_org_id is null or v.developer_org_id = p_developer_org_id)
      and (p_kinds is null or cardinality(p_kinds) = 0 or v.kind = any (p_kinds))
      and (p_exclude_id is null or v.id <> p_exclude_id)
  ),
  ordered as (
    select m.*, count(*) over () as total_count,
           row_number() over (order by
             case when p_sort = 'relevance' then m.rank end desc nulls last,
             case when p_sort = 'price_asc' then m.price_from_etb end asc nulls last,
             case when p_sort = 'completion' then m.expected_completion end asc nulls last,
             m.published_at desc, m.id) as rn
    from matched m
  )
  select jsonb_build_object(
    'total', coalesce((select max(total_count) from ordered), 0),
    'items', coalesce((
      select jsonb_agg(to_jsonb(o) - 'search_tsv' - 'rank' - 'total_count' - 'rn' order by o.rn)
      from ordered o, params
      where o.rn > (params.page - 1) * params.size and o.rn <= params.page * params.size
    ), '[]'::jsonb)
  )
$$;

create function public.search_locations(p_q text, p_limit int default 10)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'name', x.name, 'name_am', x.name_am, 'level', x.level,
      'display_name', x.display_name, 'path', x.path) order by x.score desc, x.name), '[]'::jsonb)
  from (
    select l.*, greatest(similarity(l.name, p_q), similarity(l.display_name, p_q))
      + case when l.name ilike p_q || '%' then 1 else 0 end as score
    from public.locations l
    where l.is_active
      and nullif(trim(coalesce(p_q, '')), '') is not null
      and (l.name ilike '%' || p_q || '%' or l.name_am ilike '%' || p_q || '%' or similarity(l.name, p_q) > 0.25
           or l.search_tsv @@ public.tsquery_or_null(p_q))
    order by score desc, l.name
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  ) x
$$;

-- Grouped results for the header typeahead and /search (spec 13).
create function public.search_all(p_q text, p_limit int default 4)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'properties', public.search_properties(p_q => p_q, p_sort => 'relevance', p_page_size => p_limit),
    'developments', public.search_developments(p_q => p_q, p_sort => 'relevance', p_page_size => p_limit),
    'products', public.search_products(p_q => p_q, p_sort => 'relevance', p_page_size => p_limit),
    'organisations', public.search_organisations(p_q => p_q, p_sort => 'relevance', p_page_size => p_limit),
    'locations', public.search_locations(p_q, p_limit),
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'slug', s.slug))
      from (select name, slug from public.service_categories
            where is_active and parent_id is not null and (name ilike '%' || p_q || '%' or similarity(name, p_q) > 0.3)
            order by similarity(name, p_q) desc limit p_limit) s), '[]'::jsonb),
    'product_categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', c.name, 'slug', c.slug, 'parent_slug', c.parent_slug))
      from (select pc.name, pc.slug, parent.slug as parent_slug from public.product_categories pc
            left join public.product_categories parent on parent.id = pc.parent_id
            where pc.is_active and (pc.name ilike '%' || p_q || '%' or similarity(pc.name, p_q) > 0.3)
            order by similarity(pc.name, p_q) desc limit p_limit) c), '[]'::jsonb)
  )
$$;

-- Live listing counts for "Popular locations" (only locations with at least one listing).
create function public.popular_locations(p_purpose public.listing_purpose default null, p_limit int default 8)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(to_jsonb(top) order by top.count desc, top.name), '[]'::jsonb)
  from (
    select x.*
    from (
      select l.id, l.name, l.display_name, l.path, l.level,
        (select count(*)::int from public.properties_public v
          where v.location_id in (select public.locations_descendants(l.id)) and (p_purpose is null or v.purpose = p_purpose)) as count
      from public.locations l
      where l.is_active and l.level in ('sub_city', 'city', 'area')
    ) x
    where x.count > 0
    order by x.count desc, x.name
    limit greatest(1, least(coalesce(p_limit, 8), 50))
  ) top
$$;

-- Facts for a location landing page: count, price range, common types and child areas.
create function public.location_summary(p_location_id uuid, p_purpose public.listing_purpose)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  with scope as (
    select v.* from public.properties_public v
    where v.purpose = p_purpose and v.location_id in (select public.locations_descendants(p_location_id))
  )
  select jsonb_build_object(
    'count', (select count(*) from scope),
    'price_min', (select min(price_etb) from scope),
    'price_max', (select max(price_etb) from scope),
    'top_types', coalesce((select jsonb_agg(t.property_type order by t.n desc)
      from (select property_type, count(*) as n from scope group by property_type order by n desc limit 3) t), '[]'::jsonb),
    'children', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'path', c.path, 'count', c.n) order by c.n desc, c.name)
      from (select l.id, l.name, l.path,
              (select count(*)::int from scope s where s.location_id in (select public.locations_descendants(l.id))) as n
            from public.locations l where l.parent_id = p_location_id and l.is_active) c), '[]'::jsonb)
  )
$$;

-- Organisation counts per location for professional landing pages and sitemaps.
create function public.service_location_count(p_service_id uuid, p_location_id uuid)
returns int
language sql stable
security definer
set search_path = public, extensions
as $$
  select coalesce((public.search_organisations(p_service_id => p_service_id, p_location_id => p_location_id, p_page_size => 1) ->> 'total')::int, 0)
$$;

grant execute on function
  public.search_properties(text, public.listing_purpose, public.property_type[], uuid, bigint, bigint, int, int, numeric, numeric,
    public.finishing_status[], public.furnishing[], text[], public.completion_status[], boolean, text, int, boolean, uuid, uuid, uuid, boolean, text, int, int),
  public.search_products(text, uuid, uuid[], bigint, bigint, public.stock_status[], uuid, text[], uuid, text, int, int),
  public.search_organisations(text, public.org_kind[], uuid, uuid, uuid, boolean, boolean, text, uuid, text, int, int),
  public.search_developments(text, uuid, public.completion_status[], bigint, bigint, boolean, uuid, public.development_kind[], uuid, text, int, int),
  public.search_locations(text, int),
  public.search_all(text, int),
  public.popular_locations(public.listing_purpose, int),
  public.location_summary(uuid, public.listing_purpose),
  public.service_location_count(uuid, uuid)
to anon, authenticated;
