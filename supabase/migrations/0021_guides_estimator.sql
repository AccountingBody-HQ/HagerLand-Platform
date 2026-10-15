-- 0021 · Guides content hub (spec 25.2g) and build-cost estimator rates (spec 25.2h). Additive only.

-- ---------------------------------------------------------------------------
-- Guides: written and published by HagerLand from admin. Nothing is public until published.
-- ---------------------------------------------------------------------------
create table public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 5 and 160),
  summary text not null default '' check (char_length(summary) <= 400),
  topic text not null default 'property' check (topic in ('property', 'building', 'supplies', 'diaspora', 'services')),
  body text not null default '' check (char_length(body) <= 60000),
  faq jsonb not null default '[]' check (jsonb_typeof(faq) = 'array'),
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  -- Drafts prepared for AB carry this flag until AB has checked the content; they cannot be published while it is set.
  needs_review boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guides_reviewed_before_publishing check (status <> 'published' or not needs_review)
);
create index guides_status_idx on public.guides (status, published_at desc);
create trigger set_updated_at before update on public.guides for each row execute function public.set_updated_at();

alter table public.guides enable row level security;
revoke all on table public.guides from public, anon, authenticated;

create view public.guides_public with (security_barrier = true) as
select id, slug, title, summary, topic, body, faq, seo_title, seo_description, published_at, updated_at
from public.guides
where status = 'published';
comment on view public.guides_public is 'Bypasses RLS on purpose (owned by postgres): published guides only.';
revoke all on public.guides_public from public, anon, authenticated;
grant select on public.guides_public to anon, authenticated;

-- Starter guides: unpublished drafts for AB to review, edit and publish (or delete). They make no legal or regulatory claims.
insert into public.guides (slug, title, summary, topic, body, faq) values
(
  'how-to-prepare-a-materials-list',
  'How to prepare a materials list for a quote',
  'What to include in a materials list so suppliers can give you a clear, comparable price with delivery.',
  'supplies',
  E'A clear materials list gets you faster, more accurate quotes, and makes it easy to compare suppliers.\n\n## Start from your drawings\nIf you have a bill of quantities from your engineer or quantity surveyor, use it. If not, list the materials stage by stage: foundations, structure, walls, roof, finishes, plumbing and electrical.\n\n## For each item, give\n- The material and its specification (for example the cement grade or the rebar diameter)\n- The quantity and the unit (bags, tonnes, pieces, square metres)\n- Any brand you prefer, or "any equivalent"\n- When you need it\n\n## Say where and when to deliver\nGive the site location and any access limits, such as narrow roads or delivery hours.\n\n## Ask for the same things from every supplier\nAsk each supplier to quote the same list, to say whether delivery is included, and how long the price is valid.',
  '[{"question":"Can I send a photo of a handwritten list?","answer":"Yes. Upload it with your quote request and we will type it up."},{"question":"Do I need exact quantities?","answer":"Approximate quantities are fine for a first quote. Final quantities should come from your engineer or quantity surveyor."}]'
),
(
  'questions-to-ask-a-contractor',
  'Questions to ask a contractor before you sign',
  'Practical questions that help you compare contractors and avoid misunderstandings on site.',
  'building',
  E'Choosing a contractor is one of the biggest decisions in a building project. These questions help you compare like with like.\n\n## About their experience\n- Which similar projects have you completed, and can I visit one?\n- Can I speak to two previous clients?\n- Which licence do you hold, and can I see it?\n\n## About the price\n- What exactly is included, and what is excluded?\n- Who buys the materials, and at what price?\n- How will changes and extra work be priced and agreed?\n\n## About the work\n- Who will manage the site day to day?\n- What is the programme, and what happens if it slips?\n- How will payments be linked to finished stages?\n\nGet the answers in writing, and agree the scope, price and payment stages before any money changes hands.',
  '[{"question":"Should I always choose the cheapest quote?","answer":"Not necessarily. Compare what each quote includes, the contractor''s track record and the payment terms, not only the total."}]'
),
(
  'property-viewing-checklist',
  'Property viewing checklist',
  'What to look at, and what to ask, when you view a house or apartment.',
  'property',
  E'A viewing is your chance to check the property and ask questions before you make an offer or sign a lease.\n\n## Outside\n- Cracks in walls, signs of damp and the condition of the roof\n- Access roads, parking and the neighbourhood at different times of day\n\n## Inside\n- Water pressure, electricity and signs of leaks\n- Doors, windows and locks\n- Natural light and ventilation\n\n## Questions to ask\n- Who owns the property, and can I see the documents?\n- What is included in the price or rent?\n- Are there any service charges or shared costs?\n\nNever pay a deposit before you have seen the property and checked who you are dealing with.',
  '[{"question":"Can someone view a property for me if I live abroad?","answer":"Yes. You can ask a trusted person, or use HagerLand''s services for buyers abroad where available."}]'
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Build-cost estimator: rates per m² entered by HagerLand. The estimator stays hidden until there is at least one rate.
-- ---------------------------------------------------------------------------
create table public.build_cost_rates (
  id uuid primary key default gen_random_uuid(),
  location_id uuid references public.locations (id) on delete cascade,
  finish text not null check (finish in ('basic', 'standard', 'premium')),
  rate_etb_per_m2 bigint not null check (rate_etb_per_m2 > 0),
  notes text check (char_length(notes) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint build_cost_rates_unique unique nulls not distinct (location_id, finish)
);
create trigger set_updated_at before update on public.build_cost_rates for each row execute function public.set_updated_at();
alter table public.build_cost_rates enable row level security;
revoke all on table public.build_cost_rates from public, anon, authenticated;

create view public.build_cost_rates_public with (security_barrier = true) as
select r.id, r.location_id, l.name as location_name, l.display_name as location_display, l.path as location_path, r.finish, r.rate_etb_per_m2, r.updated_at
from public.build_cost_rates r
left join public.locations l on l.id = r.location_id;
comment on view public.build_cost_rates_public is 'Bypasses RLS on purpose (owned by postgres): the indicative rates shown in the build-cost estimator.';
revoke all on public.build_cost_rates_public from public, anon, authenticated;
grant select on public.build_cost_rates_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0021', 'guides_estimator') on conflict (version) do nothing;
