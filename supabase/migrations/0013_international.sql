-- 0013 · International foundation (spec 24.4) and approximate prices (spec 25.2f).
-- Additive only: new columns with defaults, new rows in locations, a new table and view,
-- and two search functions recreated with extra optional filters. Ethiopian URLs do not change.

-- ---------------------------------------------------------------------------
-- Countries on locations
-- ---------------------------------------------------------------------------
alter table public.locations add column country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$');
create index locations_country_idx on public.locations (country_code);

-- The currency a country's records use by default (spec 24.4).
create function public.country_currency(p_country text)
returns text
language sql immutable
set search_path = ''
as $$
  select case p_country
    when 'ET' then 'ETB' when 'GB' then 'GBP' when 'US' then 'USD' when 'CA' then 'CAD' when 'AE' then 'AED'
    when 'SE' then 'SEK' when 'DE' then 'EUR' when 'NO' then 'NOK' when 'NL' then 'EUR' when 'SA' then 'SAR'
    when 'IL' then 'ILS' when 'ZA' then 'ZAR' when 'KE' then 'KES' else 'USD'
  end
$$;

-- Sub-locations always belong to their parent's country.
create function public.locations_inherit_country()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    select country_code into new.country_code from public.locations where id = new.parent_id;
  end if;
  return new;
end
$$;
create trigger locations_inherit_country before insert or update of parent_id, country_code on public.locations
  for each row execute function public.locations_inherit_country();

-- Diaspora markets: country roots and key cities. Admin can add more (spec 24.4).
insert into public.locations (level, name, slug, path, country_code, sort)
values
  ('country', 'United Kingdom', 'united-kingdom', 'united-kingdom', 'GB', 1010),
  ('country', 'United States', 'united-states', 'united-states', 'US', 1020),
  ('country', 'Canada', 'canada', 'canada', 'CA', 1030),
  ('country', 'United Arab Emirates', 'united-arab-emirates', 'united-arab-emirates', 'AE', 1040),
  ('country', 'Sweden', 'sweden', 'sweden', 'SE', 1050),
  ('country', 'Germany', 'germany', 'germany', 'DE', 1060),
  ('country', 'Norway', 'norway', 'norway', 'NO', 1070),
  ('country', 'Netherlands', 'netherlands', 'netherlands', 'NL', 1080),
  ('country', 'Saudi Arabia', 'saudi-arabia', 'saudi-arabia', 'SA', 1090),
  ('country', 'Israel', 'israel', 'israel', 'IL', 1100),
  ('country', 'South Africa', 'south-africa', 'south-africa', 'ZA', 1110),
  ('country', 'Kenya', 'kenya', 'kenya', 'KE', 1120)
on conflict do nothing;

insert into public.locations (parent_id, level, name, slug, path, sort)
select p.id, 'city', c.name, c.slug, p.path || '/' || c.slug, c.sort
from (values
  ('united-kingdom', 'London', 'london', 10), ('united-kingdom', 'Birmingham', 'birmingham', 20), ('united-kingdom', 'Manchester', 'manchester', 30),
  ('united-states', 'Washington DC', 'washington-dc', 10), ('united-states', 'Seattle', 'seattle', 20), ('united-states', 'Minneapolis', 'minneapolis', 30),
  ('united-states', 'Dallas', 'dallas', 40), ('united-states', 'Atlanta', 'atlanta', 50), ('united-states', 'Los Angeles', 'los-angeles', 60),
  ('canada', 'Toronto', 'toronto', 10), ('canada', 'Calgary', 'calgary', 20),
  ('united-arab-emirates', 'Dubai', 'dubai', 10), ('united-arab-emirates', 'Abu Dhabi', 'abu-dhabi', 20),
  ('sweden', 'Stockholm', 'stockholm', 10), ('germany', 'Frankfurt', 'frankfurt', 10), ('norway', 'Oslo', 'oslo', 10),
  ('netherlands', 'Amsterdam', 'amsterdam', 10), ('saudi-arabia', 'Riyadh', 'riyadh', 10), ('saudi-arabia', 'Jeddah', 'jeddah', 20),
  ('israel', 'Tel Aviv', 'tel-aviv', 10), ('south-africa', 'Johannesburg', 'johannesburg', 10), ('kenya', 'Nairobi', 'nairobi', 10)
) as c(country, name, slug, sort)
join public.locations p on p.parent_id is null and p.slug = c.country
on conflict do nothing;

-- Property listings and developments stay Ethiopia-only in this phase (spec 24.4).
create function public.require_ethiopian_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.location_id is not null and (select country_code from public.locations where id = new.location_id) <> 'ET' then
    raise exception 'Property listings and developments must be in Ethiopia' using errcode = '23514';
  end if;
  return new;
end
$$;
create trigger require_ethiopian_location before insert or update of location_id on public.properties
  for each row execute function public.require_ethiopian_location();
create trigger require_ethiopian_location before insert or update of location_id on public.developments
  for each row execute function public.require_ethiopian_location();

-- ---------------------------------------------------------------------------
-- Organisations: country, currency, serving the Ethiopian community abroad
-- ---------------------------------------------------------------------------
alter table public.organisations
  add column country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  add column currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  add column serves_diaspora boolean not null default false;
create index organisations_country_idx on public.organisations (country_code);

-- Country follows the organisation's main location; currency follows the country.
create function public.organisations_sync_country()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.location_id is not null then
    select country_code into new.country_code from public.locations where id = new.location_id;
  end if;
  if tg_op = 'INSERT' or new.country_code is distinct from old.country_code then
    new.currency := public.country_currency(new.country_code);
  end if;
  return new;
end
$$;
create trigger organisations_sync_country before insert or update of location_id, country_code on public.organisations
  for each row execute function public.organisations_sync_country();

-- Public view gains the three new columns (appended, so existing columns keep their order).
create or replace view public.organisations_public with (security_barrier = true) as
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
  o.search_tsv,
  o.country_code, o.currency, o.serves_diaspora
from public.organisations o
left join public.locations l on l.id = o.location_id
where o.status = 'published';
comment on view public.organisations_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only published organisations and only public-safe columns.';
revoke all on public.organisations_public from public, anon, authenticated;
grant select on public.organisations_public to anon, authenticated;

-- Organisation search gains country and "serves the community abroad" filters.
drop function public.search_organisations(text, public.org_kind[], uuid, uuid, uuid, boolean, boolean, text, uuid, text, int, int);
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
  p_page_size int default 24,
  p_country_code text default null,
  p_serves_diaspora boolean default null
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
      and (p_country_code is null or v.country_code = p_country_code)
      and (p_serves_diaspora is null or v.serves_diaspora = p_serves_diaspora)
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

grant execute on function public.search_organisations(text, public.org_kind[], uuid, uuid, uuid, boolean, boolean, text, uuid, text, int, int, text, boolean) to anon, authenticated;

-- Location search: Ethiopia only unless asked otherwise ('ET' default, 'all', or a country code).
drop function public.search_locations(text, int);
create function public.search_locations(p_q text, p_limit int default 10, p_scope text default 'ET')
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'name', x.name, 'name_am', x.name_am, 'level', x.level,
      'display_name', x.display_name, 'path', x.path, 'country_code', x.country_code) order by x.score desc, x.name), '[]'::jsonb)
  from (
    select l.*, greatest(similarity(l.name, p_q), similarity(l.display_name, p_q))
      + case when l.name ilike p_q || '%' then 1 else 0 end as score
    from public.locations l
    where l.is_active
      and (coalesce(p_scope, 'ET') = 'all' or l.country_code = coalesce(p_scope, 'ET'))
      and nullif(trim(coalesce(p_q, '')), '') is not null
      and (l.name ilike '%' || p_q || '%' or l.name_am ilike '%' || p_q || '%' or similarity(l.name, p_q) > 0.25
           or l.search_tsv @@ public.tsquery_or_null(p_q))
    order by score desc, l.name
    limit greatest(1, least(coalesce(p_limit, 10), 25))
  ) x
$$;
grant execute on function public.search_locations(text, int, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Exchange rates for approximate prices (spec 25.2f). ETB stays the price of record.
-- ---------------------------------------------------------------------------
create table public.exchange_rates (
  currency text primary key check (currency in ('GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  etb_per_unit numeric(14, 4) not null check (etb_per_unit > 0),
  updated_at timestamptz not null default now()
);
alter table public.exchange_rates enable row level security;
revoke all on table public.exchange_rates from public, anon, authenticated;
create trigger set_updated_at before update on public.exchange_rates for each row execute function public.set_updated_at();

create view public.exchange_rates_public with (security_barrier = true) as
select r.currency, r.etb_per_unit, r.updated_at from public.exchange_rates r;
comment on view public.exchange_rates_public is
  'Bypasses RLS on purpose (owned by postgres): admin-set exchange rates for approximate prices, read-only.';
revoke all on public.exchange_rates_public from public, anon, authenticated;
grant select on public.exchange_rates_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0013', 'international') on conflict (version) do nothing;
