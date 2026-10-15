-- 0014 · Service request engine (spec 24.5) and deals ledger (spec 25.2k).
-- Additive only: new tables, two new columns on service_categories, a provider view and RLS.
-- Materials quote_requests are unchanged.

-- ---------------------------------------------------------------------------
-- Service categories: which vertical they belong to and their request questions
-- ---------------------------------------------------------------------------
alter table public.service_categories
  add column vertical_key text references public.verticals (key) on update cascade,
  add column question_schema jsonb not null default '[]' check (jsonb_typeof(question_schema) = 'array'),
  add column allows_emergency boolean not null default false;

-- Existing groups belong to the professionals or contractors verticals (by group slug).
update public.service_categories c
set vertical_key = case
  when coalesce((select p.slug from public.service_categories p where p.id = c.parent_id), c.slug) in ('design-consultancy', 'property-services') then 'professionals'
  else 'contractors'
end
where c.vertical_key is null;

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLS'),
  vertical_key text not null references public.verticals (key) on update cascade,
  service_category_id uuid references public.service_categories (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  details text not null default '' check (char_length(details) <= 4000),
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  urgency text not null default 'flexible' check (urgency in ('emergency', 'within_week', 'flexible')),
  budget_band text check (char_length(budget_band) <= 60),
  location_id uuid references public.locations (id),
  location_text text check (char_length(location_text) <= 200),
  country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'telegram', 'email')),
  requester_user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) <= 32),
  email text check (char_length(email) <= 254),
  attachment_paths text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'triaged', 'matched', 'quoted', 'won', 'lost', 'cancelled')),
  closed_reason text check (closed_reason in ('customer_cancelled', 'no_provider', 'all_declined', 'chose_other', 'duplicate', 'spam', 'completed', 'other')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  access_token_hash text,
  access_token_expires_at timestamptz,
  triaged_at timestamptz,
  matched_at timestamptz,
  closed_at timestamptz,
  admin_alerted_at timestamptz,
  source text not null default 'web' check (char_length(source) <= 40),
  source_url text check (char_length(source_url) <= 500),
  utm jsonb,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_requests_status_idx on public.service_requests (status, created_at desc);
create index service_requests_vertical_idx on public.service_requests (vertical_key, created_at desc);
create index service_requests_requester_idx on public.service_requests (requester_user_id);
create index service_requests_urgency_idx on public.service_requests (urgency) where status in ('submitted', 'triaged', 'matched');
create unique index service_requests_token_key on public.service_requests (access_token_hash) where access_token_hash is not null;
create trigger set_updated_at before update on public.service_requests for each row execute function public.set_updated_at();

-- Request country and currency follow the chosen location when there is one.
create function public.service_requests_sync_country()
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
create trigger service_requests_sync_country before insert or update of location_id, country_code on public.service_requests
  for each row execute function public.service_requests_sync_country();

-- ---------------------------------------------------------------------------
-- Matches: up to three providers per request
-- ---------------------------------------------------------------------------
create table public.service_request_matches (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  status text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'quoted', 'won', 'lost', 'withdrawn')),
  offered_at timestamptz not null default now(),
  responded_at timestamptz,
  declined_reason text check (char_length(declined_reason) <= 300),
  quote_amount_minor bigint check (quote_amount_minor >= 0),
  quote_currency text check (quote_currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  quote_message text check (char_length(quote_message) <= 2000),
  quote_document_path text,
  quote_valid_until date,
  quoted_at timestamptz,
  reminder_sent_at timestamptz,
  -- Commercial fields: HagerLand only (no grants to signed-in users).
  lead_fee_minor bigint check (lead_fee_minor >= 0),
  commission_rate numeric(5, 2) check (commission_rate between 0 and 100),
  commission_minor bigint check (commission_minor >= 0),
  invoiced boolean not null default false,
  invoiced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, org_id),
  constraint matches_quote_complete check (status <> 'quoted' or (quote_amount_minor is not null and quote_currency is not null))
);
create index service_request_matches_org_idx on public.service_request_matches (org_id, status);
create index service_request_matches_request_idx on public.service_request_matches (request_id);
create trigger set_updated_at before update on public.service_request_matches for each row execute function public.set_updated_at();

-- Providers may only move a match offered → accepted/declined and accepted → quoted (or update a quote).
create function public.protect_match_transitions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_end_user() then
    return new;
  end if;
  if new.request_id is distinct from old.request_id or new.org_id is distinct from old.org_id then
    raise exception 'A match cannot be moved' using errcode = '42501';
  end if;
  if not (
    (old.status = 'offered' and new.status in ('offered', 'accepted', 'declined'))
    or (old.status = 'accepted' and new.status in ('accepted', 'quoted'))
    or (old.status = 'quoted' and new.status = 'quoted')
  ) then
    raise exception 'This change can only be made by HagerLand' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger protect_match_transitions before update on public.service_request_matches
  for each row execute function public.protect_match_transitions();

-- ---------------------------------------------------------------------------
-- Deals and commission ledger (spec 25.2k): HagerLand only
-- ---------------------------------------------------------------------------
create table public.deals (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLD'),
  source_type text not null check (source_type in ('enquiry', 'service_request', 'quote_request', 'property_care', 'manual')),
  source_id uuid,
  match_id uuid references public.service_request_matches (id) on delete set null,
  org_id uuid references public.organisations (id) on delete set null,
  title text not null check (char_length(title) between 2 and 200),
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  value_minor bigint check (value_minor >= 0),
  commission_minor bigint check (commission_minor >= 0),
  lead_fee_minor bigint check (lead_fee_minor >= 0),
  status text not null default 'open' check (status in ('open', 'won', 'lost', 'invoiced', 'paid')),
  closed_at timestamptz,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deals_status_idx on public.deals (status, created_at desc);
create index deals_source_idx on public.deals (source_type, source_id);
create trigger set_updated_at before update on public.deals for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.service_requests enable row level security;
alter table public.service_request_matches enable row level security;
alter table public.deals enable row level security;
revoke all on table public.service_requests, public.service_request_matches, public.deals from public, anon, authenticated;

-- Requesters read their own requests (never admin notes or the guest link hash). Inserts go through the server.
grant select (id, reference, vertical_key, service_category_id, title, details, answers, urgency, budget_band, location_id,
  location_text, country_code, currency, preferred_contact, requester_user_id, name, phone, email, attachment_paths, status,
  closed_reason, triaged_at, matched_at, closed_at, created_at, updated_at)
  on public.service_requests to authenticated;
create policy "Requesters read own service requests" on public.service_requests
  for select to authenticated using (requester_user_id = auth.uid());

-- Matches: providers (org members) read and answer their own; requesters see quotes on their requests.
grant select (id, request_id, org_id, status, offered_at, responded_at, declined_reason, quote_amount_minor, quote_currency,
  quote_message, quote_document_path, quote_valid_until, quoted_at, created_at, updated_at)
  on public.service_request_matches to authenticated;
grant update (status, responded_at, declined_reason, quote_amount_minor, quote_currency, quote_message, quote_document_path, quote_valid_until, quoted_at)
  on public.service_request_matches to authenticated;
create policy "Providers read their matches" on public.service_request_matches
  for select to authenticated using (public.is_org_member(org_id));
create policy "Requesters read quotes on their requests" on public.service_request_matches
  for select to authenticated using (
    status in ('quoted', 'won', 'lost')
    and exists (select 1 from public.service_requests r where r.id = request_id and r.requester_user_id = auth.uid())
  );
create policy "Providers answer their matches" on public.service_request_matches
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_active_user() and public.is_org_member(org_id));

-- What a provider sees of a request offered to them: contact details only once they have accepted.
create view public.service_requests_for_provider with (security_barrier = true) as
select
  m.id as match_id, m.org_id, m.status as match_status, m.offered_at, m.responded_at, m.quote_amount_minor, m.quote_currency,
  m.quote_message, m.quote_valid_until, m.quoted_at,
  r.id as request_id, r.reference, r.vertical_key, r.service_category_id, sc.name as service_name, r.title, r.details, r.answers,
  r.urgency, r.budget_band, r.location_id, l.display_name as location_display, r.location_text, r.country_code, r.currency,
  r.status as request_status, r.created_at,
  case when m.status in ('accepted', 'quoted', 'won') then r.name end as requester_name,
  case when m.status in ('accepted', 'quoted', 'won') then r.phone end as requester_phone,
  case when m.status in ('accepted', 'quoted', 'won') then r.email end as requester_email,
  case when m.status in ('accepted', 'quoted', 'won') then r.preferred_contact end as preferred_contact,
  cardinality(r.attachment_paths) as attachment_count
from public.service_request_matches m
join public.service_requests r on r.id = m.request_id
left join public.service_categories sc on sc.id = r.service_category_id
left join public.locations l on l.id = r.location_id
where public.is_org_member(m.org_id) and m.status <> 'withdrawn';
comment on view public.service_requests_for_provider is
  'Bypasses RLS on purpose (owned by postgres): each signed-in provider sees only requests offered to their organisations; requester contact details appear only after they accept.';
revoke all on public.service_requests_for_provider from public, anon, authenticated;
grant select on public.service_requests_for_provider to authenticated;

insert into public.schema_migrations (version, name) values ('0014', 'service_requests') on conflict (version) do nothing;
