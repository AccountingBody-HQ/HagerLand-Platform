-- 0034 · Supply partners (docs/HAGERLAND_SUPPLY_INTELLIGENCE_BLUEPRINT.md, Phase 1a): HagerLand's private record of each
-- supplier organisation (roles, relationship status, source, verification evidence) and the people to contact there.
-- HagerLand only: no grants, no policies, no views. The server reads and writes with the service role.
-- Additive only; safe to run again (nothing is created twice).

create table if not exists public.supply_partners (
  org_id uuid primary key references public.organisations (id) on delete cascade,
  roles text[] not null default '{}'
    check (roles <@ array['importer', 'distributor', 'manufacturer', 'wholesaler', 'retail_shop', 'contractor']::text[]),
  relationship_status text not null default 'discovered'
    check (relationship_status in ('discovered', 'contacted', 'interested', 'terms_agreed', 'active', 'inactive', 'declined', 'do_not_contact', 'needs_reverification')),
  status_changed_at timestamptz,
  -- Other spellings and trading names (Amharic and English), searchable in admin.
  aka text[] not null default '{}' check (cardinality(aka) <= 20),
  source text check (source in ('direct_call', 'site_visit', 'partner_submitted', 'price_list_photo', 'business_website', 'import_google', 'self_signup', 'referral', 'other')),
  source_note text check (char_length(source_note) <= 500),
  captured_at timestamptz,
  captured_by text check (char_length(captured_by) <= 120),
  confidence text check (confidence in ('low', 'medium', 'high')),
  licence_seen_at timestamptz,
  tin_checked_at timestamptz,
  site_visit_at timestamptz,
  verified_by text check (char_length(verified_by) <= 120),
  -- Paths in the private documents bucket; served only through short-lived signed links after an admin check.
  evidence_paths text[] not null default '{}' check (cardinality(evidence_paths) <= 20),
  reverify_by date,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supply_partners_status_idx on public.supply_partners (relationship_status);
create index if not exists supply_partners_reverify_idx on public.supply_partners (reverify_by);
create index if not exists supply_partners_roles_idx on public.supply_partners using gin (roles);
create or replace trigger set_updated_at before update on public.supply_partners for each row execute function public.set_updated_at();

create table if not exists public.supply_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid references public.org_branches (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  role text check (char_length(role) <= 80),
  phone text check (char_length(phone) <= 32),
  -- E.164 (+2519…, +2517…, +25111…), set by the server for matching duplicates and searching.
  phone_normalised text check (phone_normalised ~ '^\+[0-9]{8,15}$'),
  whatsapp text check (char_length(whatsapp) <= 32),
  telegram text check (char_length(telegram) <= 64),
  preferred_channel text check (preferred_channel in ('phone', 'whatsapp', 'telegram', 'email', 'in_person')),
  email text check (char_length(email) <= 254),
  consent_basis text check (consent_basis in ('business_provided', 'verbal_consent', 'written_consent', 'public_business_listing', 'other')),
  consent_note text check (char_length(consent_note) <= 500),
  do_not_contact boolean not null default false,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supply_contacts_org_idx on public.supply_contacts (org_id);
create index if not exists supply_contacts_phone_idx on public.supply_contacts (phone_normalised) where phone_normalised is not null;
create or replace trigger set_updated_at before update on public.supply_contacts for each row execute function public.set_updated_at();

-- Service role only: no anon or signed-in access at all (as deals, 0014, and partner_applications, 0011).
alter table public.supply_partners enable row level security;
alter table public.supply_contacts enable row level security;
revoke all on table public.supply_partners, public.supply_contacts from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0034', 'supply_partners') on conflict (version) do nothing;
