-- Read-only check for migration 0039 (imports compliance, Google Places data). Run it in the Supabase SQL editor
-- right after the migration. Every row should say PASS; rows marked "(count)" report numbers for your records. It
-- changes nothing.

with cols as (
  select table_name, column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name in ('org_field_sources', 'import_cleanup_runs')
),
trig as (
  select c.relname as tbl, t.tgname from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal
),
applied as (select applied_at from public.schema_migrations where version = '0039'),
imported as (select o.* from public.organisations o where o.source = 'import' and o.google_place_id is not null)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, 'new table org_field_sources (where each organisation field came from) exists with its columns' as check_name,
         (select count(*) from cols where table_name = 'org_field_sources' and column_name in ('org_id', 'field', 'source', 'place_id', 'fetched_at', 'confirmed_at', 'confirmed_by', 'confirm_method', 'note', 'cleared_at', 'is_current')) = 11 as ok,
         (select count(*)::text || ' columns' from cols where table_name = 'org_field_sources') as detail
  union all
  select 2, 'one current record per organisation and field (unique index)',
         exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'org_field_sources_current_idx' and indexdef like '%UNIQUE%' and indexdef like '%is_current%'), ''
  union all
  select 3, 'new table import_cleanup_runs (clean-up run log) exists with its columns',
         (select count(*) from cols where table_name = 'import_cleanup_runs' and column_name in ('mode', 'started_at', 'finished_at', 'counts', 'details', 'run_by')) = 6,
         (select count(*)::text || ' columns' from cols where table_name = 'import_cleanup_runs')
  union all
  select 4, 'row level security is on for both new tables',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('org_field_sources', 'import_cleanup_runs') and c.relrowsecurity) = 2, ''
  union all
  select 5, 'visitors and signed-in users have no access to the new tables (server only)',
         not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('org_field_sources', 'import_cleanup_runs') and grantee in ('anon', 'authenticated', 'PUBLIC')),
         coalesce((select string_agg(distinct grantee || ':' || privilege_type, ', ') from information_schema.role_table_grants where table_schema = 'public' and table_name in ('org_field_sources', 'import_cleanup_runs') and grantee in ('anon', 'authenticated', 'PUBLIC')), 'none')
  union all
  select 6, 'the clean-up run log cannot be changed or deleted (append-only)',
         exists (select 1 from trig where tbl = 'import_cleanup_runs' and tgname = 'import_cleanup_runs_append_only')
           and exists (select 1 from trig where tbl = 'import_cleanup_runs' and tgname = 'import_cleanup_runs_no_truncate'), ''
  union all
  select 7, 'setting "Imports clean-up mode" exists and is Dry run',
         (select value from public.site_settings where key = 'imports_cleanup_mode') = '"dry_run"'::jsonb,
         coalesce((select value::text from public.site_settings where key = 'imports_cleanup_mode'), 'missing')
  union all
  select 8, 'the clean-up mode is not readable on the public site',
         not exists (select 1 from public.site_settings_public where key = 'imports_cleanup_mode'), ''
  union all
  select 9, 'publishing an imported business needs its details confirmed (database rule on organisations)',
         exists (select 1 from trig where tbl = 'organisations' and tgname = 'organisations_import_publish_guard')
           and not has_function_privilege('anon', 'public.organisations_import_publish_guard()', 'execute')
           and not has_function_privilege('authenticated', 'public.organisations_import_publish_guard()', 'execute'), ''
  union all
  select 10, '(count) businesses imported from Google found (source import, with a place ID)',
         true, (select count(*)::text || ' found, ' || count(*) filter (where status = 'published')::text || ' of them public' from imported)
  union all
  select 11, 'every business imported from Google before 0039 has a record of where its details came from',
         not exists (select 1 from imported i, applied a where i.created_at < a.applied_at and i.name <> 'Unconfirmed lead — refetch from Google' and not exists (select 1 from public.org_field_sources s where s.org_id = i.id and s.field = 'name' and s.is_current)),
         (select count(*)::text || ' without a record' from imported i, applied a where i.created_at < a.applied_at and i.name <> 'Unconfirmed lead — refetch from Google' and not exists (select 1 from public.org_field_sources s where s.org_id = i.id and s.field = 'name' and s.is_current))
  union all
  select 12, '(count) records created by the backfill',
         true, (select count(*)::text || ' records: ' || count(*) filter (where source = 'google_places')::text || ' from Google, ' || count(*) filter (where source = 'edited_by_hagerland')::text || ' changed by HagerLand after the import'
                from public.org_field_sources where note like 'Backfill 0039%')
  union all
  select 13, '(count) businesses that could not be identified as Google imports (left alone)',
         true, (select count(*) filter (where source = 'import' and google_place_id is null)::text || ' marked as imported without a place ID; '
                       || count(*) filter (where source <> 'import' and google_place_id is not null)::text || ' with a place ID but another source' from public.organisations)
  union all
  select 14, 'no organisation was changed by the migration (none carries its exact time)',
         not exists (select 1 from public.organisations o, applied a where o.updated_at = a.applied_at),
         (select count(*)::text || ' changed at ' || to_char((select applied_at from applied), 'YYYY-MM-DD HH24:MI:SS') from public.organisations o, applied a where o.updated_at = a.applied_at)
  union all
  select 15, 'imported businesses still have every stored detail the records describe (nothing cleared)',
         not exists (select 1 from public.org_field_sources s join public.organisations o on o.id = s.org_id
                     where s.note like 'Backfill 0039%' and case s.field when 'phone' then o.phone is null when 'address_line' then o.address_line is null when 'website' then o.website is null
                       when 'description' then o.description is null when 'lat_lng' then o.lat is null and o.lng is null else false end),
         (select count(*)::text || ' imported businesses checked' from imported)
  union all
  select 16, 'nothing has been cleared yet (clean-up has not run live)',
         not exists (select 1 from public.org_field_sources where cleared_at is not null) and not exists (select 1 from public.import_cleanup_runs where mode = 'live'), ''
  union all
  select 17, 'earlier supply tables (0034 to 0038) are still there',
         (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('supply_partners', 'supply_contacts', 'supplier_offers', 'supply_quote_lines', 'supply_agreements', 'supply_orders', 'supply_order_lines', 'supply_order_events', 'supply_delivery_proofs', 'supply_ledger_entries')) = 10
           and exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'supply_orders' and column_name = 'promised_delivery_on')
           and exists (select 1 from trig where tbl = 'supply_orders' and tgname = 'supply_orders_guard'), ''
  union all
  select 18, 'migration 0039 is recorded',
         exists (select 1 from applied), coalesce((select to_char(applied_at, 'YYYY-MM-DD HH24:MI') from applied), 'not recorded')
) checks
order by sort;
