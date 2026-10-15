-- 0031 · Knowledge & Advice (spec 26.10): area guides, market insight from live asking prices, newsletter sign-ups,
-- more guide topics and starter drafts for AB to review. Additive only (the guides topic list is widened).

-- ---------------------------------------------------------------------------
-- Guides: topics for buying, renting, selling, checklists and the glossary
-- ---------------------------------------------------------------------------
alter table public.guides drop constraint guides_topic_check;
alter table public.guides add constraint guides_topic_check
  check (topic in ('property', 'building', 'supplies', 'diaspora', 'services', 'buying', 'renting', 'selling', 'checklists', 'glossary'));

-- Starter drafts, unpublished and marked "Needs AB review". Plain, practical wording; no legal or regulatory
-- statement is presented as fact: readers are pointed to a lawyer or the relevant office where rules apply.
insert into public.guides (slug, title, summary, topic, body, faq) values
(
  'renting-a-home-a-guide-for-tenants',
  'Renting a home: a guide for tenants',
  'What to check before you rent, what to agree in writing, and how to look after the tenancy.',
  'renting',
  E'Renting goes best when both sides agree everything clearly before money changes hands.\n\n## Before you view\n- Set your budget, including any months of rent asked for in advance and any deposit\n- Decide which areas, how many rooms and what you need nearby\n\n## At the viewing\n- Check water, power, locks, windows and signs of damp or leaks\n- Ask who owns the property and whether the person you are dealing with may let it\n\n## Before you pay\n- Read the written tenancy agreement: rent, advance months, deposit, who pays which bills, repairs and how either side can end it\n- Ask a lawyer if anything is unclear; rules on tenancies can change\n- Get a receipt for every payment\n\n## During the tenancy\n- Report repairs in writing\n- Keep copies of the agreement and receipts',
  '[{"question":"How many months of rent will I be asked to pay in advance?","answer":"It varies by landlord and property. Agree it in writing before you pay, and ask for a receipt."}]'
),
(
  'buying-checklist',
  'Checklist: buying a property',
  'The steps of a purchase, in order, with what to check at each one.',
  'checklists',
  E'## 1. Prepare\n- Set your budget, including fees and taxes your lawyer tells you about\n- Decide how you will pay: savings, a loan, or a mix\n\n## 2. Find and view\n- View in person or by video; visit more than once if you can\n\n## 3. Check the property\n- Ask to see the ownership documents (title deed / carta) and the lease, and have a lawyer check them\n- Confirm who is selling and that they may sell\n\n## 4. Agree a price\n- Make an offer; nothing is agreed until a written sale agreement is signed\n\n## 5. Complete\n- Your lawyer handles the agreement and the transfer; pay only as the agreement says\n- Collect the keys and all documents',
  '[]'
),
(
  'renting-checklist',
  'Checklist: renting a home',
  'From searching to moving in, step by step.',
  'checklists',
  E'## 1. Search\n- Budget for rent, advance months and deposit\n\n## 2. View\n- Check water, power, locks and the area at different times\n\n## 3. Apply\n- Have your ID and details of your work or income ready\n\n## 4. Agree in writing\n- Rent, advance months, deposit, bills, repairs, how to end the tenancy\n\n## 5. Move in\n- Note the condition of the property with photos\n- Keep receipts for every payment',
  '[]'
),
(
  'building-checklist',
  'Checklist: building a house',
  'The main stages of a building project, from plot to handover.',
  'checklists',
  E'## 1. Plot and permits\n- Check the plot documents with a lawyer\n- Ask the local building office which permits you need\n\n## 2. Design\n- Brief an architect; agree drawings and a budget\n- Have a structural engineer design the structure\n\n## 3. Costs and contractor\n- Get a bill of quantities and compare quotes from several contractors\n- Agree scope, price and payment stages in writing\n\n## 4. Build\n- Buy materials to the specification; keep receipts\n- Inspect each stage before you pay for it\n\n## 5. Handover\n- Check everything works; list defects for the contractor to fix\n- Keep all drawings, permits and warranties',
  '[]'
),
(
  'selling-checklist',
  'Checklist: selling a property',
  'How to prepare, market and complete a sale.',
  'checklists',
  E'## 1. Prepare\n- Gather your ownership documents (title deed / carta and lease) and have a lawyer confirm what the buyer will need\n- Fix small problems and clean the property\n\n## 2. Price\n- Get a valuation and look at similar properties for sale\n\n## 3. Market\n- Good photos, a clear description and an honest price\n\n## 4. Offers\n- Compare offers on price, how the buyer will pay and timing\n- Nothing is agreed until a written sale agreement is signed\n\n## 5. Complete\n- Your lawyer handles the agreement and the transfer\n- Hand over keys only as the agreement says',
  '[]'
),
(
  'property-glossary',
  'Glossary of Ethiopian property terms',
  'Plain-English explanations of words you will meet when buying, renting or building.',
  'glossary',
  E'## Carta\nThe everyday name for the title deed: the document that records who holds rights to a property. Always have a lawyer check it.\n\n## Lease\nUrban land is generally held on a lease rather than owned outright. The lease sets the period and terms; check them with a lawyer before you buy.\n\n## G+X\nHow building height is described: G is the ground floor and X is the number of floors above it. A G+2 building has a ground floor and two floors above.\n\n## Condominium\nAn apartment in a building where each owner holds their own unit and shares the common parts with the other owners.\n\n## Finishing levels\nHow complete a new building is when it is sold: shell (structure only), semi-finished (some work left) or fully finished (ready to live in).\n\n## Advance rent\nMonths of rent paid at the start of a tenancy. The number is agreed with the landlord.',
  '[]'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Area guides: admin-written local notes and FAQs for a place (shown with its live market data)
-- ---------------------------------------------------------------------------
create table public.area_guides (
  location_id uuid primary key references public.locations (id) on delete cascade,
  notes text not null default '' check (char_length(notes) <= 4000),
  faqs jsonb not null default '[]' check (jsonb_typeof(faqs) = 'array'),
  is_published boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.area_guides for each row execute function public.set_updated_at();
alter table public.area_guides enable row level security;
revoke all on table public.area_guides from public, anon, authenticated;

create view public.area_guides_public with (security_barrier = true) as
select g.location_id, g.notes, g.faqs, g.updated_at from public.area_guides g where g.is_published;
comment on view public.area_guides_public is 'Bypasses RLS on purpose (owned by postgres): published area guides only.';
revoke all on public.area_guides_public from public, anon, authenticated;
grant select on public.area_guides_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Market insight: asking prices of live listings by place, purpose and type, refreshed by the daily job
-- ---------------------------------------------------------------------------
create table public.market_insight (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations (id) on delete cascade,
  purpose public.listing_purpose not null,
  property_type text not null check (char_length(property_type) <= 40),
  sample_count int not null check (sample_count >= 0),
  median_etb bigint not null,
  p25_etb bigint not null,
  p75_etb bigint not null,
  min_etb bigint not null,
  max_etb bigint not null,
  refreshed_at timestamptz not null default now()
);
create unique index market_insight_key on public.market_insight (coalesce(location_id, '00000000-0000-0000-0000-000000000000'::uuid), purpose, property_type);
alter table public.market_insight enable row level security;
revoke all on table public.market_insight from public, anon, authenticated;

-- Rebuilds the table from live listings with a price (not "price on request"). Each listing counts for its own
-- place and every place above it, and nationwide; per type and for all types together.
create function public.refresh_market_insight()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  delete from public.market_insight where true;
  with recursive live as (
    select p.id, p.purpose, p.property_type::text as property_type, p.price_etb, p.location_id
    from public.properties p
    where p.status = 'published' and (p.expires_at is null or p.expires_at > now())
      and p.price_etb is not null and p.price_etb > 0 and not p.price_on_request
  ), up as (
    select l.id, l.location_id as place from live l
    union
    select up.id, loc.parent_id from up join public.locations loc on loc.id = up.place where loc.parent_id is not null
  ), tagged as (
    select l.purpose, l.property_type, l.price_etb, u.place from live l join up u on u.id = l.id
    union all
    select l.purpose, l.property_type, l.price_etb, null::uuid from live l
  ), grouped as (
    select place, purpose, property_type, price_etb from tagged
    union all
    select place, purpose, 'all', price_etb from tagged
  )
  insert into public.market_insight (location_id, purpose, property_type, sample_count, median_etb, p25_etb, p75_etb, min_etb, max_etb)
  select place, purpose, property_type, count(*)::int,
         round(percentile_cont(0.5) within group (order by price_etb))::bigint,
         round(percentile_cont(0.25) within group (order by price_etb))::bigint,
         round(percentile_cont(0.75) within group (order by price_etb))::bigint,
         min(price_etb), max(price_etb)
  from grouped
  group by place, purpose, property_type;
  get diagnostics n = row_count;
  return n;
end
$$;
revoke all on function public.refresh_market_insight() from public, anon, authenticated;

insert into public.site_settings (key, value) values ('market_insight_min_sample', '5') on conflict (key) do nothing;

-- Public: only figures with at least the minimum number of listings (admin → Settings), with place names.
create view public.market_insight_public with (security_barrier = true) as
select m.location_id, l.path as location_path, l.display_name as location_name, l.level as location_level,
       m.purpose, m.property_type, m.sample_count, m.median_etb, m.p25_etb, m.p75_etb, m.min_etb, m.max_etb, m.refreshed_at
from public.market_insight m
left join public.locations l on l.id = m.location_id
where m.sample_count >= greatest(1, coalesce((select (s.value #>> '{}')::int from public.site_settings s where s.key = 'market_insight_min_sample'), 5))
  and (m.location_id is null or l.is_active);
comment on view public.market_insight_public is 'Bypasses RLS on purpose (owned by postgres): aggregated asking prices that meet the minimum sample only.';
revoke all on public.market_insight_public from public, anon, authenticated;
grant select on public.market_insight_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Newsletter sign-ups: separate, recorded consent and a one-click unsubscribe (spec 26.10, 25.4)
-- ---------------------------------------------------------------------------
create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  name text check (char_length(name) <= 120),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  consent_at timestamptz not null default now(),
  consent_text text not null check (char_length(consent_text) <= 300),
  source text check (char_length(source) <= 120),
  unsubscribe_token_hash text not null,
  unsubscribed_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);
create unique index newsletter_subscriptions_email_key on public.newsletter_subscriptions (lower(email));
create unique index newsletter_subscriptions_token_key on public.newsletter_subscriptions (unsubscribe_token_hash);
alter table public.newsletter_subscriptions enable row level security;
revoke all on table public.newsletter_subscriptions from public, anon, authenticated;

do $$ begin perform public.refresh_market_insight(); end $$;

insert into public.schema_migrations (version, name) values ('0031', 'advice') on conflict (version) do nothing;
