-- 0039 · Imports compliance (Google Places data). Google's terms allow storing a place ID indefinitely and latitude/
-- longitude for up to 30 days; other Places content may not be stored, and content may not be created from it. From
-- this release the Imports tool stores only the place ID; staff confirm each business's details with the business.
--   - org_field_sources: where each organisation field came from (Google, confirmed with the business, or edited by
--     HagerLand), when it was fetched or confirmed, and when Google data was cleared. One current row per field;
--     older rows are kept as history.
--   - import_cleanup_runs: an append-only log of each clean-up run (dry run or live) with counts and details.
--   - site_settings 'imports_cleanup_mode' = "dry_run" (added only if absent). Live clean-up needs the owner to switch it.
--   - An imported organisation cannot be published while its name is not confirmed or any of its displayed details is
--     still unconfirmed Google data (database backstop; the admin screens say why first).
--   - Backfill: one current row per stored field of every organisation imported from Google (source 'import' with a
--     place ID). The fetch time is the organisation's creation time (the import). A field changed later by HagerLand
--     (from the audit log) is recorded as edited by HagerLand.
-- Additive: no existing organisation or other row is changed, nothing is dropped, no legacy table is touched.
begin;

create table if not exists public.org_field_sources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  field text not null check (field in ('name', 'phone', 'address_line', 'website', 'description', 'lat_lng')),
  source text not null check (source in ('google_places', 'confirmed_with_business', 'edited_by_hagerland')),
  place_id text check (char_length(place_id) <= 300),
  fetched_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by text check (char_length(confirmed_by) <= 120),
  confirm_method text check (confirm_method in ('phone', 'whatsapp', 'telegram', 'visit', 'email')),
  note text check (char_length(note) <= 500),
  cleared_at timestamptz,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  check (source <> 'google_places' or fetched_at is not null)
);
create unique index if not exists org_field_sources_current_idx on public.org_field_sources (org_id, field) where is_current;
create index if not exists org_field_sources_google_idx on public.org_field_sources (fetched_at) where is_current and source = 'google_places' and cleared_at is null;

create table if not exists public.import_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('dry_run', 'live')),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  counts jsonb not null default '{}'::jsonb,
  details jsonb not null default '[]'::jsonb,
  run_by text not null check (char_length(run_by) <= 120)
);
create index if not exists import_cleanup_runs_started_idx on public.import_cleanup_runs (started_at desc);

-- The run log is append-only (same function as the supply timeline and ledger, 0037).
create or replace trigger import_cleanup_runs_append_only before update or delete on public.import_cleanup_runs
  for each row execute function public.supply_append_only();
create or replace trigger import_cleanup_runs_no_truncate before truncate on public.import_cleanup_runs
  for each statement execute function public.supply_append_only();

-- Server only: RLS on, no policies, no grants to visitors or signed-in users.
alter table public.org_field_sources enable row level security;
alter table public.import_cleanup_runs enable row level security;
revoke all on public.org_field_sources, public.import_cleanup_runs from public, anon, authenticated;

-- Dry run until the owner switches it on (site_settings_public lists its keys, so this one is never public).
insert into public.site_settings (key, value) values ('imports_cleanup_mode', '"dry_run"'::jsonb) on conflict (key) do nothing;

-- Publishing an imported organisation needs its details confirmed with the business.
create or replace function public.organisations_import_publish_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' and new.source = 'import' then
    if not exists (select 1 from public.org_field_sources s where s.org_id = new.id and s.field = 'name' and s.is_current and s.source <> 'google_places')
       or exists (select 1 from public.org_field_sources s where s.org_id = new.id and s.is_current and s.source = 'google_places' and s.cleared_at is null
                    and s.field in ('name', 'phone', 'address_line', 'website', 'description')) then
      raise exception 'This imported business has details that are not confirmed with the business yet. Use “Confirm with the business” first.' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create or replace trigger organisations_import_publish_guard before update of status on public.organisations
  for each row execute function public.organisations_import_publish_guard();
revoke all on function public.organisations_import_publish_guard() from public, anon, authenticated;

-- Backfill: every stored field of every organisation imported from Google, once (safe to run again).
with imported as (
  select o.id, o.google_place_id, o.created_at,
    array_remove(array[
      'name',
      case when o.phone is not null then 'phone' end,
      case when o.address_line is not null then 'address_line' end,
      case when o.website is not null then 'website' end,
      case when o.description is not null then 'description' end,
      case when o.lat is not null or o.lng is not null then 'lat_lng' end
    ], null) as fields
  from public.organisations o
  where o.source = 'import' and o.google_place_id is not null
),
fields as (
  select i.id as org_id, i.google_place_id, i.created_at, f.field
  from imported i cross join lateral unnest(i.fields) as f(field)
),
edited as (
  -- The latest edit of that field by HagerLand after the import (admin edit form, or the description in import review).
  select distinct on (f.org_id, f.field) f.org_id, f.field, a.created_at, a.actor
  from fields f
  join public.audit_log a on a.entity_type = 'organisation' and a.entity_id = f.org_id and a.action = 'organisation.edit' and a.created_at >= f.created_at
  where a.diff ? f.field
  order by f.org_id, f.field, a.created_at desc
)
insert into public.org_field_sources (org_id, field, source, place_id, fetched_at, confirmed_at, confirmed_by, note)
select f.org_id, f.field,
  case when e.org_id is null then 'google_places' else 'edited_by_hagerland' end,
  f.google_place_id, f.created_at, e.created_at, left(e.actor, 120),
  case when e.org_id is null then 'Backfill 0039: stored by the Imports tool; fetch time = import time'
       else 'Backfill 0039: changed by HagerLand after the import (audit log)' end
from fields f
left join edited e on e.org_id = f.org_id and e.field = f.field
where not exists (select 1 from public.org_field_sources s where s.org_id = f.org_id and s.field = f.field and s.is_current);

insert into public.schema_migrations (version, name) values ('0039', 'imports_compliance') on conflict (version) do nothing;

commit;
