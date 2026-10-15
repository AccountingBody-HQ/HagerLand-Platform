-- WP-0 · Read-only snapshot of the live HagerLand database.
-- Lists tables (with exact row counts), columns, constraints, indexes, grants,
-- RLS policies, functions, triggers, types, extensions and storage buckets,
-- and checks whether any name planned for the relaunch already exists.
-- It changes nothing. Run it in Supabase → SQL Editor and copy the single result cell.

with
rels as (
  select c.oid, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
),
planned(kind, name) as (
  values
    ('table/view', 'profiles'), ('table/view', 'organisations'), ('table/view', 'organisation_members'),
    ('table/view', 'organisation_services'), ('table/view', 'org_product_categories'), ('table/view', 'reports'),
    ('table/view', 'search_misses'), ('table/view', 'service_categories'), ('table/view', 'portfolio_projects'),
    ('table/view', 'locations'), ('table/view', 'developments'), ('table/view', 'properties'),
    ('table/view', 'media'), ('table/view', 'product_categories'), ('table/view', 'brands'),
    ('table/view', 'products'), ('table/view', 'quote_requests'), ('table/view', 'quote_request_items'),
    ('table/view', 'enquiries'), ('table/view', 'contact_reveals'), ('table/view', 'claims'),
    ('table/view', 'verification_requests'), ('table/view', 'admin_notes'), ('table/view', 'saved_items'),
    ('table/view', 'saved_searches'), ('table/view', 'reviews'), ('table/view', 'promotions'),
    ('table/view', 'ad_slots'), ('table/view', 'site_settings'), ('table/view', 'audit_log'),
    ('table/view', 'errors'), ('table/view', 'delivery_zones'), ('table/view', 'deals'),
    ('table/view', 'plans'), ('table/view', 'orders'), ('table/view', 'order_items'), ('table/view', 'payments'),
    ('table/view', 'properties_public'), ('table/view', 'developments_public'), ('table/view', 'products_public'),
    ('table/view', 'organisations_public'), ('table/view', 'portfolio_public'), ('table/view', 'media_public'),
    ('table/view', 'site_settings_public'),
    ('type', 'account_type'), ('type', 'org_kind'), ('type', 'org_role'), ('type', 'verification_level'),
    ('type', 'listing_status'), ('type', 'listing_purpose'), ('type', 'property_type'),
    ('type', 'finishing_status'), ('type', 'furnishing'), ('type', 'tenure'), ('type', 'completion_status'),
    ('type', 'development_kind'), ('type', 'price_type'), ('type', 'stock_status'),
    ('type', 'enquiry_status'), ('type', 'quote_status'), ('type', 'location_level'),
    ('function', 'locations_descendants'), ('function', 'search_properties'), ('function', 'search_products'),
    ('function', 'search_organisations'), ('function', 'search_developments'), ('function', 'search_all'),
    ('function', 'increment_view'), ('function', 'next_reference'), ('function', 'set_updated_at'),
    ('function', 'protect_privileged_columns'), ('function', 'set_expires_at_on_publish'),
    ('function', 'sync_featured_from_promotions'), ('function', 'create_profile_on_signup'),
    ('function', 'add_owner_on_org_insert'), ('function', 'is_active_user'),
    ('bucket', 'public-media'), ('bucket', 'private-docs')
),
s_collisions as (
  select string_agg(format('- %s "%s" already exists', p.kind, p.name), E'\n' order by p.kind, p.name) as body
  from planned p
  where (p.kind = 'table/view' and exists (
          select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relname = p.name))
     or (p.kind = 'type' and exists (
          select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
          where n.nspname = 'public' and t.typname = p.name))
     or (p.kind = 'function' and exists (
          select 1 from pg_proc f join pg_namespace n on n.oid = f.pronamespace
          where n.nspname = 'public' and f.proname = p.name))
     or (p.kind = 'bucket' and exists (select 1 from storage.buckets b where b.id = p.name))
),
s_tables as (
  select string_agg(
    format('- %s | %s | RLS %s%s | rows %s',
      r.relname,
      case r.relkind when 'r' then 'table' when 'p' then 'partitioned table' when 'v' then 'view'
                     when 'm' then 'materialized view' else 'foreign table' end,
      case when r.relrowsecurity then 'ON' else 'OFF' end,
      case when r.relforcerowsecurity then ' (forced)' else '' end,
      case when r.relkind in ('r', 'p', 'm') then
        (xpath('/row/c/text()',
               query_to_xml(format('select count(*) as c from public.%I', r.relname), false, true, '')))[1]::text
      else '-' end),
    E'\n' order by r.relname) as body
  from rels r
),
s_columns as (
  select string_agg(t.line, E'\n' order by t.relname) as body
  from (
    select r.relname,
      format('- %s: %s', r.relname, string_agg(
        format('%s %s%s%s', a.attname, format_type(a.atttypid, a.atttypmod),
          case when a.attnotnull then ' NOT NULL' else '' end,
          case when ad.adbin is not null then ' DEFAULT ' || pg_get_expr(ad.adbin, ad.adrelid) else '' end),
        ', ' order by a.attnum)) as line
    from rels r
    join pg_attribute a on a.attrelid = r.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
    group by r.relname
  ) t
),
s_constraints as (
  select string_agg(format('- %s.%s: %s', r.relname, con.conname, pg_get_constraintdef(con.oid)),
                    E'\n' order by r.relname, con.conname) as body
  from pg_constraint con
  join rels r on r.oid = con.conrelid
),
s_indexes as (
  select string_agg(format('- %s', indexdef), E'\n' order by tablename, indexname) as body
  from pg_indexes
  where schemaname = 'public'
),
s_grants as (
  select string_agg(g.line, E'\n' order by g.line) as body
  from (
    select format('- %s → %s: %s', table_name, grantee,
                  string_agg(privilege_type, ', ' order by privilege_type)) as line
    from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')
    group by table_name, grantee
  ) g
),
s_policies as (
  select string_agg(
    format('- %s.%s | "%s" | %s | %s | roles %s | USING %s | WITH CHECK %s',
      schemaname, tablename, policyname, cmd, permissive, array_to_string(roles, ','),
      coalesce(qual, '-'), coalesce(with_check, '-')),
    E'\n' order by schemaname, tablename, policyname) as body
  from pg_policies
  where schemaname in ('public', 'storage')
),
s_functions as (
  select string_agg(
    format('- %s(%s) returns %s | %s | %s',
      p.proname, pg_get_function_identity_arguments(p.oid), coalesce(pg_get_function_result(p.oid), '-'),
      l.lanname, case when p.prosecdef then 'SECURITY DEFINER' else 'invoker' end),
    E'\n' order by p.proname) as body
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join pg_language l on l.oid = p.prolang
  where n.nspname = 'public'
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
),
s_triggers as (
  select string_agg(format('- %s', pg_get_triggerdef(t.oid)), E'\n' order by n.nspname, c.relname, t.tgname) as body
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal
    and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname = 'users'))
),
s_types as (
  select string_agg(
    format('- %s (%s)%s', t.typname,
      case t.typtype when 'e' then 'enum' when 'c' then 'composite' when 'd' then 'domain' else t.typtype::text end,
      case when t.typtype = 'e' then ': ' || (
        select string_agg(e.enumlabel, ', ' order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid)
      else '' end),
    E'\n' order by t.typname) as body
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typtype in ('e', 'd', 'c')
    and not exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind <> 'c')
    and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e')
),
s_extensions as (
  select string_agg(format('- %s %s (schema %s)', e.extname, e.extversion, n.nspname), E'\n' order by e.extname) as body
  from pg_extension e
  join pg_namespace n on n.oid = e.extnamespace
),
s_buckets as (
  select string_agg(
    format('- %s | public %s | size limit %s | types %s | objects %s',
      b.id, b.public, coalesce(b.file_size_limit::text, '-'),
      coalesce(array_to_string(b.allowed_mime_types, ','), '-'),
      (select count(*) from storage.objects o where o.bucket_id = b.id)),
    E'\n' order by b.id) as body
  from storage.buckets b
)
select concat(
  '# HagerLand legacy schema snapshot', E'\n',
  'Taken ', to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI'), ' UTC · Postgres ', current_setting('server_version'),
  E'\n\n## Name collisions with the planned relaunch schema\n',
  coalesce((select body from s_collisions), 'NONE: no planned name already exists.'),
  E'\n\n## Tables and views (public)\n', coalesce((select body from s_tables), '(none)'),
  E'\n\n## Columns\n', coalesce((select body from s_columns), '(none)'),
  E'\n\n## Constraints\n', coalesce((select body from s_constraints), '(none)'),
  E'\n\n## Indexes\n', coalesce((select body from s_indexes), '(none)'),
  E'\n\n## Grants to anon / authenticated\n', coalesce((select body from s_grants), '(none)'),
  E'\n\n## RLS policies (public + storage)\n', coalesce((select body from s_policies), '(none)'),
  E'\n\n## Functions (public)\n', coalesce((select body from s_functions), '(none)'),
  E'\n\n## Triggers (public + auth.users)\n', coalesce((select body from s_triggers), '(none)'),
  E'\n\n## Types (public)\n', coalesce((select body from s_types), '(none)'),
  E'\n\n## Extensions\n', coalesce((select body from s_extensions), '(none)'),
  E'\n\n## Storage buckets\n', coalesce((select body from s_buckets), '(none)')
) as snapshot;
