-- 0027 · Pillar registry with operating modes and stage gates (spec Section 26.1–26.3).
-- Additive only: new tables, a view, functions and new settings. Two existing registry columns are added to
-- `verticals` (which pillar controls it) and the vertical statuses of pillar-controlled areas are derived from the
-- pillar modes from now on. No legacy table or data is touched.

-- ---------------------------------------------------------------------------
-- Pillars: the ten business pillars of the property ecosystem, each with three independent modes
-- ---------------------------------------------------------------------------
create table public.pillars (
  key text primary key check (key ~ '^[a-z]+(-[a-z]+)*$'),
  number smallint not null unique check (number between 1 and 10),
  name text not null check (char_length(name) between 2 and 60),
  nav_label text not null check (char_length(nav_label) between 2 and 40),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  tagline text not null default '' check (char_length(tagline) <= 120),
  description text not null default '' check (char_length(description) <= 1200),
  icon text not null default 'circle',
  direct_enabled boolean not null default false,
  aggregate_enabled boolean not null default false,
  interest_enabled boolean not null default false,
  direct_owner text check (char_length(direct_owner) <= 120),
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.pillars for each row execute function public.set_updated_at();

-- Sub-services with their own switches (estate agency, owner portal, Our Developments).
create table public.pillar_services (
  key text primary key check (key ~ '^[a-z]+(-[a-z]+)*$'),
  pillar_key text not null references public.pillars (key) on update cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  direct_enabled boolean not null default false,
  aggregate_enabled boolean not null default false,
  interest_enabled boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
create index pillar_services_pillar_idx on public.pillar_services (pillar_key);
create trigger set_updated_at before update on public.pillar_services for each row execute function public.set_updated_at();

-- Stage-gate checklists completed before Direct or Aggregate is switched on (spec 26.3).
create table public.pillar_gate_checks (
  id uuid primary key default gen_random_uuid(),
  pillar_key text not null references public.pillars (key) on update cascade,
  service_key text references public.pillar_services (key) on update cascade,
  mode text not null check (mode in ('direct', 'aggregate')),
  capability_confirmed boolean not null,
  owner_name text not null check (char_length(owner_name) between 2 and 120),
  providers_required int not null default 0 check (providers_required >= 0),
  providers_active int not null default 0 check (providers_active >= 0),
  regulatory_confirmed boolean not null,
  regulatory_note text not null check (char_length(regulatory_note) between 2 and 500),
  regulatory_date date not null,
  terms_pricing_set boolean not null,
  terms_note text check (char_length(terms_note) <= 500),
  actor text not null check (char_length(actor) <= 80),
  created_at timestamptz not null default now()
);
create index pillar_gate_checks_lookup_idx on public.pillar_gate_checks (pillar_key, service_key, mode, created_at desc);

-- Pillars a provider serves (chosen at onboarding, spec 26.12).
create table public.organisation_pillars (
  org_id uuid not null references public.organisations (id) on delete cascade,
  pillar_key text not null references public.pillars (key) on update cascade,
  created_at timestamptz not null default now(),
  primary key (org_id, pillar_key)
);
create index organisation_pillars_pillar_idx on public.organisation_pillars (pillar_key);

insert into public.pillars (key, number, name, nav_label, slug, tagline, icon, direct_enabled, aggregate_enabled, interest_enabled, description) values
  ('buy', 1, 'Buy & Sell Property', 'Buy', 'buy', 'Listings, agency, transactions', 'house', true, true, false,
   'Homes, land and commercial property for sale, new developments, and HagerLand''s own estate agency: sell with us, buyer representation, property sourcing and valuations.'),
  ('rent', 2, 'Rent & Let Property', 'Rent', 'rent', 'Landlords, tenants, lettings', 'key-round', true, true, false,
   'Places to rent across Ethiopia, letting with HagerLand, tenant applications and tenancies, and services for landlords and tenants.'),
  ('build', 3, 'Build & Develop Property', 'Build', 'build', 'Construction, renovation, development', 'hard-hat', false, true, true,
   'Architects, engineers and contractors, building quotes, a build-cost estimator and new developments, with one brief for your whole project.'),
  ('maintain', 4, 'Repair & Maintain Property', 'Maintain', 'maintain', 'Trades, repairs, upkeep', 'wrench', true, true, false,
   'Repairs, servicing and emergency help. HagerLand coordinates every request and can send its own team or trusted tradespeople.'),
  ('manage', 5, 'Manage Property', 'Manage', 'manage', 'Management, tenants, diaspora care', 'users', true, true, false,
   'HagerLand Property Care looks after property for owners, including owners abroad, alongside trusted third-party property managers.'),
  ('finance', 6, 'Property Finance', 'Finance', 'finance', 'Mortgages, construction and development finance', 'landmark', false, false, true,
   'Mortgages, construction and development finance, introduced through approved, licensed partners.'),
  ('insurance', 7, 'Property Insurance', 'Insurance', 'insurance', 'Home, landlord, commercial cover', 'shield-check', false, false, true,
   'Home, landlord, building and construction insurance, introduced through approved, licensed partners.'),
  ('advice', 8, 'Knowledge & Advice', 'Advice & guides', 'advice', 'Guides, awareness, market insight', 'book-open', true, false, false,
   'Guides, area guides, market insight from live asking prices, process checklists and a glossary of Ethiopian property terms.'),
  ('supplies', 9, 'Building & Construction Supplies', 'Supplies', 'supplies', 'Materials, tools, equipment', 'boxes', true, true, false,
   'HagerLand Supply quotes for materials, tools and equipment, plus a marketplace of suppliers, Special Buys and trade accounts.'),
  ('jobs', 10, 'Jobs, Recruitment & Staffing', 'Jobs', 'jobs', 'Talent, labour, hiring', 'briefcase', true, true, true,
   'A job board for construction and property, HagerLand recruitment and placement, and registers for candidates and employers.');

insert into public.pillar_services (key, pillar_key, name, description, direct_enabled, aggregate_enabled, interest_enabled, sort) values
  ('estate-agency', 'buy', 'HagerLand estate agency', 'Valuations, viewings, offers, lettings and tenancies run by HagerLand (sales follow Buy & Sell, lettings follow Rent & Let).', true, false, false, 10),
  ('owner-portal', 'manage', 'Owner portal', 'Signed-in owners of managed properties see inspections, statements, maintenance and documents.', true, false, false, 20),
  ('our-developments', 'build', 'Our Developments', 'Homes HagerLand intends to develop.', false, false, true, 30);

-- ---------------------------------------------------------------------------
-- Mode → visibility (spec 26.3): visible if any mode is on; only Interest → coming soon; nothing → hidden
-- ---------------------------------------------------------------------------
create function public.mode_status(p_direct boolean, p_aggregate boolean, p_interest boolean)
returns public.vertical_status
language sql
immutable
set search_path = ''
as $$
  select case
    when p_direct or p_aggregate then 'live'::public.vertical_status
    when p_interest then 'coming_soon'::public.vertical_status
    else 'hidden'::public.vertical_status
  end
$$;

-- Which pillar (or sub-service) controls an existing vertical. Layers (professionals, diaspora) stay manual.
alter table public.verticals
  add column controlled_by_pillar text references public.pillars (key) on update cascade,
  add column controlled_by_service text references public.pillar_services (key) on update cascade;

update public.verticals set controlled_by_pillar = case key
  when 'building-supplies' then 'supplies'
  when 'contractors' then 'build'
  when 'repairs-maintenance' then 'maintain'
  when 'finance' then 'finance'
  when 'insurance' then 'insurance'
  when 'jobs' then 'jobs'
  else null end;
update public.verticals set controlled_by_service = 'our-developments' where key = 'our-developments';

-- Vertical statuses follow the pillar modes. Property follows the more visible of Buy and Rent.
create function public.sync_verticals_from_pillars()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rank_buy int;
  rank_rent int;
begin
  update public.verticals v
  set status = public.mode_status(p.direct_enabled, p.aggregate_enabled, p.interest_enabled)
  from public.pillars p
  where v.controlled_by_pillar = p.key
    and v.status is distinct from public.mode_status(p.direct_enabled, p.aggregate_enabled, p.interest_enabled);

  update public.verticals v
  set status = public.mode_status(s.direct_enabled, s.aggregate_enabled, s.interest_enabled)
  from public.pillar_services s
  where v.controlled_by_service = s.key
    and v.status is distinct from public.mode_status(s.direct_enabled, s.aggregate_enabled, s.interest_enabled);

  select case public.mode_status(direct_enabled, aggregate_enabled, interest_enabled) when 'live' then 2 when 'coming_soon' then 1 else 0 end
    into rank_buy from public.pillars where key = 'buy';
  select case public.mode_status(direct_enabled, aggregate_enabled, interest_enabled) when 'live' then 2 when 'coming_soon' then 1 else 0 end
    into rank_rent from public.pillars where key = 'rent';
  update public.verticals
  set status = (case greatest(coalesce(rank_buy, 0), coalesce(rank_rent, 0)) when 2 then 'live' when 1 then 'coming_soon' else 'hidden' end)::public.vertical_status
  where key = 'property'
    and status is distinct from (case greatest(coalesce(rank_buy, 0), coalesce(rank_rent, 0)) when 2 then 'live' when 1 then 'coming_soon' else 'hidden' end)::public.vertical_status;
end
$$;
revoke all on function public.sync_verticals_from_pillars() from public, anon, authenticated;

create function public.pillars_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_verticals_from_pillars();
  return null;
end
$$;
create trigger pillars_sync_verticals after insert or update of direct_enabled, aggregate_enabled, interest_enabled on public.pillars
  for each statement execute function public.pillars_after_change();
create trigger pillar_services_sync_verticals after insert or update of direct_enabled, aggregate_enabled, interest_enabled on public.pillar_services
  for each statement execute function public.pillars_after_change();

-- Switching Direct or Aggregate ON needs a stage-gate checklist completed in the last 15 minutes (spec 26.3).
-- Switching any mode off needs no gate.
create function public.require_stage_gate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  svc text := case when tg_table_name = 'pillar_services' then new.key end;
  pil text := coalesce(to_jsonb(new) ->> 'pillar_key', new.key);
begin
  if new.direct_enabled and not old.direct_enabled and not exists (
    select 1 from public.pillar_gate_checks g
    where g.pillar_key = pil and g.service_key is not distinct from svc and g.mode = 'direct'
      and g.capability_confirmed and g.regulatory_confirmed and g.created_at > now() - interval '15 minutes'
  ) then
    raise exception 'Complete the stage-gate checklist before switching Direct on' using errcode = '42501';
  end if;
  if new.aggregate_enabled and not old.aggregate_enabled and not exists (
    select 1 from public.pillar_gate_checks g
    where g.pillar_key = pil and g.service_key is not distinct from svc and g.mode = 'aggregate'
      and g.capability_confirmed and g.regulatory_confirmed and g.providers_active >= g.providers_required
      and g.created_at > now() - interval '15 minutes'
  ) then
    raise exception 'Complete the stage-gate checklist before switching Aggregate on' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger pillars_require_gate before update on public.pillars for each row execute function public.require_stage_gate();
create trigger pillar_services_require_gate before update on public.pillar_services for each row execute function public.require_stage_gate();

-- Verified, published providers or partners active in a pillar (the Aggregate gate counts these).
create function public.pillar_active_providers(p_pillar text)
returns int
language sql
stable
set search_path = ''
as $$
  select count(*)::int from public.organisations o
  where o.status = 'published' and o.verification_level = 'verified' and not o.is_hagerland
    and (
      exists (select 1 from public.organisation_pillars op where op.org_id = o.id and op.pillar_key = p_pillar)
      or case p_pillar
        when 'buy' then o.kind = 'agency'
        when 'rent' then o.kind = 'agency'
        when 'build' then o.kind in ('contractor', 'professional_firm', 'developer')
        when 'maintain' then exists (select 1 from public.organisation_services os join public.service_categories c on c.id = os.service_id where os.org_id = o.id and c.vertical_key = 'repairs-maintenance')
        when 'manage' then exists (select 1 from public.organisation_services os join public.service_categories c on c.id = os.service_id where os.org_id = o.id and c.slug in ('property-management', 'property-management-support'))
        when 'finance' then o.kind in ('lender', 'broker')
        when 'insurance' then o.kind in ('insurer', 'broker')
        when 'supplies' then o.kind in ('supplier', 'manufacturer')
        when 'jobs' then exists (select 1 from public.job_posts j where j.employer_org_id = o.id and j.status = 'published')
        when 'advice' then exists (select 1 from public.organisation_services os join public.service_categories c on c.id = os.service_id where os.org_id = o.id and c.vertical_key = 'professionals')
        else false
      end
    )
$$;
revoke all on function public.pillar_active_providers(text) from public, anon, authenticated;

-- The pillar each existing vertical's demand belongs to (demand dashboard, spec 26.13).
create function public.vertical_pillar(p_vertical text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_vertical
    when 'property' then 'buy'
    when 'building-supplies' then 'supplies'
    when 'professionals' then 'build'
    when 'contractors' then 'build'
    when 'our-developments' then 'build'
    when 'repairs-maintenance' then 'maintain'
    when 'diaspora' then 'manage'
    when 'finance' then 'finance'
    when 'insurance' then 'insurance'
    when 'jobs' then 'jobs'
    else null end
$$;

-- Interest registered on a pillar hub records the pillar too (the vertical stays for older pages).
alter table public.interest_registrations add column pillar_key text references public.pillars (key) on update cascade;
create index interest_registrations_pillar_idx on public.interest_registrations (pillar_key, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: base tables are service-role only; visitors read a safe view
-- ---------------------------------------------------------------------------
alter table public.pillars enable row level security;
alter table public.pillar_services enable row level security;
alter table public.pillar_gate_checks enable row level security;
alter table public.organisation_pillars enable row level security;
revoke all on table public.pillars, public.pillar_services, public.pillar_gate_checks, public.organisation_pillars from public, anon, authenticated;

-- Members of an organisation choose the pillars it serves.
grant select, insert, delete on public.organisation_pillars to authenticated;
create policy organisation_pillars_member_select on public.organisation_pillars for select to authenticated
  using (public.is_org_member(org_id));
create policy organisation_pillars_member_insert on public.organisation_pillars for insert to authenticated
  with check (public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));
create policy organisation_pillars_member_delete on public.organisation_pillars for delete to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));

create view public.pillars_public with (security_barrier = true) as
select p.key, p.number, p.name, p.nav_label, p.slug, p.tagline, p.description, p.icon,
       p.direct_enabled, p.aggregate_enabled, p.interest_enabled, p.seo_title, p.seo_description,
       public.mode_status(p.direct_enabled, p.aggregate_enabled, p.interest_enabled) as status,
       coalesce((select jsonb_agg(jsonb_build_object('key', s.key, 'name', s.name, 'direct', s.direct_enabled, 'aggregate', s.aggregate_enabled, 'interest', s.interest_enabled) order by s.sort)
                 from public.pillar_services s where s.pillar_key = p.key), '[]'::jsonb) as services
from public.pillars p
where p.direct_enabled or p.aggregate_enabled or p.interest_enabled;
comment on view public.pillars_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only visible pillars and their mode switches, read-only.';
revoke all on public.pillars_public from public, anon, authenticated;
grant select on public.pillars_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Settings (spec 26.1, 26.3, 26.5): licence and approval references, the Aggregate gate minimum,
-- the published agency fee schedule (empty = "fees agreed in writing")
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('licences', '{"estate_agency": {"number": "", "authority": "", "holder": "", "date": ""}, "property_management": {"number": "", "authority": "", "holder": "", "date": ""}, "recruitment": {"number": "", "authority": "", "holder": "", "date": ""}, "finance": {"number": "", "authority": "", "holder": "", "date": ""}, "insurance": {"number": "", "authority": "", "holder": "", "date": ""}}'),
  ('stage_gate_min_providers', '3'),
  ('agency_fee_schedule', '""'),
  ('regulatory_clearance_note', '"Regulatory clearance confirmed by AB, 15 Oct 2026"')
on conflict (key) do nothing;

create or replace view public.site_settings_public with (security_barrier = true) as
select s.key, s.value
from public.site_settings s
where s.key in (
  'contact_details', 'social_links', 'announcement_bar', 'homepage_featured_ids',
  'listing_expiry_days', 'min_results_for_index', 'private_owner_max_active_listings',
  'verified_business_count_min', 'quote_response_target', 'legal_last_updated',
  'legal_entity', 'free_listing_confirmed', 'developments_claims', 'delivery_area',
  'property_care_pricing', 'amharic_enabled', 'licences', 'agency_fee_schedule'
);
comment on view public.site_settings_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only a whitelist of public settings.';
revoke all on public.site_settings_public from public, anon, authenticated;
grant select on public.site_settings_public to anon, authenticated;

-- Apply the launch defaults to the pillar-controlled verticals (Jobs becomes live: recruitment is approved).
do $$ begin perform public.sync_verticals_from_pillars(); end $$;

insert into public.schema_migrations (version, name) values ('0027', 'pillars') on conflict (version) do nothing;
