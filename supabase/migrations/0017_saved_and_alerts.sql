-- 0017 · Saved items, saved searches with email alerts, quote lists synced to accounts (spec 25.2a, 6.3)
-- and valuation questions for the request engine (spec 24.7). Additive only.

create table public.saved_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null check (entity_type in ('property', 'product', 'organisation', 'development')),
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);
create index saved_items_entity_idx on public.saved_items (entity_type, entity_id);

create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  vertical text not null default 'property' check (vertical in ('property')),
  name text not null check (char_length(name) between 2 and 120),
  params jsonb not null default '{}' check (jsonb_typeof(params) = 'object'),
  alert_frequency text not null default 'daily' check (alert_frequency in ('instant', 'daily', 'weekly', 'off')),
  last_sent_at timestamptz,
  unsubscribe_token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index saved_searches_user_idx on public.saved_searches (user_id);
create index saved_searches_frequency_idx on public.saved_searches (alert_frequency) where alert_frequency <> 'off';
create trigger set_updated_at before update on public.saved_searches for each row execute function public.set_updated_at();

-- A signed-in user's quote list, kept in step with the list in their browser (spec 10.5, 25.2a).
create table public.quote_lists (
  user_id uuid primary key references auth.users (id) on delete cascade,
  items jsonb not null default '[]' check (jsonb_typeof(items) = 'array'),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.quote_lists for each row execute function public.set_updated_at();

-- Owner-only, for active (not suspended) users (spec 6.5).
alter table public.saved_items enable row level security;
alter table public.saved_searches enable row level security;
alter table public.quote_lists enable row level security;
revoke all on table public.saved_items, public.saved_searches, public.quote_lists from public, anon, authenticated;
grant select, insert, delete on public.saved_items to authenticated;
-- Column grants: the alert unsubscribe token is never readable or settable by users.
grant select (id, user_id, vertical, name, params, alert_frequency, last_sent_at, created_at, updated_at) on public.saved_searches to authenticated;
grant insert (user_id, vertical, name, params, alert_frequency) on public.saved_searches to authenticated;
grant update (name, params, alert_frequency) on public.saved_searches to authenticated;
grant delete on public.saved_searches to authenticated;
grant select, insert, update on public.quote_lists to authenticated;

create policy "Users read own saved items" on public.saved_items for select to authenticated using (user_id = auth.uid());
create policy "Users save items" on public.saved_items for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
create policy "Users remove saved items" on public.saved_items for delete to authenticated using (user_id = auth.uid());

create policy "Users read own saved searches" on public.saved_searches for select to authenticated using (user_id = auth.uid());
create policy "Users create saved searches" on public.saved_searches for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
create policy "Users change own saved searches" on public.saved_searches for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());
create policy "Users delete own saved searches" on public.saved_searches for delete to authenticated using (user_id = auth.uid());

create policy "Users read own quote list" on public.quote_lists for select to authenticated using (user_id = auth.uid());
create policy "Users create own quote list" on public.quote_lists for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
create policy "Users update own quote list" on public.quote_lists for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());

-- Valuations through the request engine (spec 24.7).
update public.service_categories
set question_schema = '[{"id":"property_type","label":"Type of property","type":"select","options":["House","Apartment or condominium","Villa","Land or plot","Commercial property","Other"],"required":true},{"id":"purpose","label":"Why do you need a valuation?","type":"select","options":["Selling","Buying","Bank or mortgage","Inheritance or family matter","Insurance","Other"],"required":true},{"id":"area_m2","label":"Floor or plot area (m²), if known","type":"number"},{"id":"title_deed","label":"Is there a title deed (carta)?","type":"yesno"}]'::jsonb
where slug = 'property-valuers' and question_schema = '[]'::jsonb;

insert into public.schema_migrations (version, name) values ('0017', 'saved_and_alerts') on conflict (version) do nothing;
