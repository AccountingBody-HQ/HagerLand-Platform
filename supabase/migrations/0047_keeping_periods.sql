-- 0047 · F-5 keeping periods (decision D3): what the daily clean-up needs to clear personal details after 24 months.
--   - personal_data_deleted_at (empty, no default) on the nine tables whose personal details are cleared: enquiries,
--     service_requests, quote_requests, property_care_requests, managed_properties, build_projects,
--     partner_applications, claims, trade_accounts. Set by the clean-up when it clears a row; never filled in here.
--   - managed_properties.ended_at and a trigger: when a managed property's status changes TO 'ended' it records the
--     moment; when it changes away from 'ended' it clears it. It acts only on such a change: existing rows are untouched.
--   - Indexes for the clean-up's daily reads.
-- Additive only: new empty columns, one new function and trigger, new indexes. No existing row, column rule, policy or
-- grant changes; row level security stays on; nothing is granted to visitors or signed-in users; no setting is added
-- (the existing shared switch jobs_data_cleanup_mode drives the clean-up). No legacy table (including the old site's
-- "jobs") is touched. Safe to run again.
begin;

alter table public.enquiries add column if not exists personal_data_deleted_at timestamptz;
alter table public.service_requests add column if not exists personal_data_deleted_at timestamptz;
alter table public.quote_requests add column if not exists personal_data_deleted_at timestamptz;
alter table public.property_care_requests add column if not exists personal_data_deleted_at timestamptz;
alter table public.managed_properties add column if not exists personal_data_deleted_at timestamptz;
alter table public.build_projects add column if not exists personal_data_deleted_at timestamptz;
alter table public.partner_applications add column if not exists personal_data_deleted_at timestamptz;
alter table public.claims add column if not exists personal_data_deleted_at timestamptz;
alter table public.trade_accounts add column if not exists personal_data_deleted_at timestamptz;
alter table public.managed_properties add column if not exists ended_at timestamptz;

-- When a managed property's management ends (and if it starts again).
create or replace function public.managed_properties_set_ended_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'ended' then
      new.ended_at := now();
    elsif old.status = 'ended' then
      new.ended_at := null;
    end if;
  end if;
  return new;
end
$$;
revoke all on function public.managed_properties_set_ended_at() from public, anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'managed_properties_set_ended_at' and tgrelid = 'public.managed_properties'::regclass) then
    create trigger managed_properties_set_ended_at before update of status on public.managed_properties
      for each row execute function public.managed_properties_set_ended_at();
  end if;
end
$$;

-- The clean-up's daily reads: rows not cleared yet, by their activity date.
create index if not exists enquiries_retention_idx on public.enquiries (updated_at) where personal_data_deleted_at is null;
create index if not exists service_requests_retention_idx on public.service_requests (updated_at) where personal_data_deleted_at is null;
create index if not exists quote_requests_retention_idx on public.quote_requests (updated_at) where personal_data_deleted_at is null;
create index if not exists property_care_requests_retention_idx on public.property_care_requests (updated_at) where personal_data_deleted_at is null;
create index if not exists managed_properties_retention_idx on public.managed_properties (ended_at) where personal_data_deleted_at is null;
create index if not exists build_projects_retention_idx on public.build_projects (updated_at) where personal_data_deleted_at is null;
create index if not exists partner_applications_retention_idx on public.partner_applications (updated_at) where personal_data_deleted_at is null;
create index if not exists claims_retention_idx on public.claims (updated_at) where personal_data_deleted_at is null;
create index if not exists trade_accounts_retention_idx on public.trade_accounts (updated_at) where personal_data_deleted_at is null;
create index if not exists errors_last_seen_idx on public.errors (last_seen_at);
create index if not exists supply_contacts_retention_idx on public.supply_contacts (last_contacted_at, created_at);

insert into public.schema_migrations (version, name) values ('0047', 'keeping_periods') on conflict (version) do nothing;

commit;
