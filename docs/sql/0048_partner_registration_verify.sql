-- Read-only check for migration 0048 (S6-1 private partner registration, partner portal and product drafts). Run it in
-- the Supabase SQL editor right after the migration. Every row should say PASS; the "detail" column shows the evidence.
-- It changes nothing. The last row only shows the record counts of the new tables (information: expected all 0).

with t(name) as (
  values ('partner_registrations'), ('partner_members'), ('partner_invitations'), ('partner_product_drafts'), ('product_sources')
),
setting(key, value) as (select key, value from public.site_settings),
fn(name) as (
  values ('partner_register'), ('is_partner_org'), ('organisations_partner_publish_guard'), ('organisation_members_partner_guard'),
         ('product_sources_seller_guard'), ('products_partner_seller_guard')
),
trg(name, tbl) as (
  values ('organisations_partner_publish_guard', 'organisations'), ('organisation_members_partner_guard', 'organisation_members'),
         ('product_sources_seller_guard', 'product_sources'), ('products_partner_seller_guard', 'products')
),
grants as (
  select table_name, grantee, privilege_type from information_schema.role_table_grants
  where table_schema = 'public' and table_name in (select name from t) and grantee in ('anon', 'authenticated')
),
counts as (
  select 'partner_registrations' as name, count(*) as n from public.partner_registrations
  union all select 'partner_members', count(*) from public.partner_members
  union all select 'partner_invitations', count(*) from public.partner_invitations
  union all select 'partner_product_drafts', count(*) from public.partner_product_drafts
  union all select 'product_sources', count(*) from public.product_sources
)
select check_name, case when ok then 'PASS' else 'FAIL' end as result, detail
from (
  select 1 as sort, '0048 is recorded, and 0034–0047 are still recorded' as check_name,
         exists (select 1 from public.schema_migrations where version = '0048')
           and (select count(*) from public.schema_migrations where version between '0034' and '0047') = 14 as ok,
         (select string_agg(version, ', ' order by version) from public.schema_migrations where version >= '0034') as detail
  union all
  select 2, 'the five new tables exist, each with row level security on',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from t) and c.relkind = 'r' and c.relrowsecurity) = 5,
         coalesce((select string_agg(c.relname || '=' || case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end, ', ' order by c.relname)
                   from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in (select name from t)), 'missing')
  union all
  select 3, 'visitors and signed-in users have no access to the new tables, and there are no policies on them (the server uses the service role)',
         not exists (select 1 from grants) and not exists (select 1 from pg_policies where schemaname = 'public' and tablename in (select name from t)),
         'table grants: ' || coalesce((select string_agg(table_name || ':' || grantee || ':' || privilege_type, ', ') from grants), 'none')
           || '; policies: ' || (select count(*)::text from pg_policies where schemaname = 'public' and tablename in (select name from t))
  union all
  select 4, 'partner_my_products exists as a security-barrier view: signed-in users may only read it; visitors nothing',
         exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'partner_my_products' and c.relkind = 'v'
                   and c.reloptions @> array['security_barrier=true'])
           and (select coalesce(string_agg(privilege_type, ',' order by privilege_type), '') from information_schema.role_table_grants where table_schema = 'public' and table_name = 'partner_my_products' and grantee = 'authenticated') = 'SELECT'
           and not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'partner_my_products' and grantee = 'anon')
           and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'partner_my_products' and column_name in ('partner_sku', 'proposed_price_cents', 'photo_paths', 'reviewer_note')),
         coalesce((select string_agg(grantee || ':' || privilege_type, ', ') from information_schema.role_table_grants where table_schema = 'public' and table_name = 'partner_my_products' and grantee in ('anon', 'authenticated')), 'no grants')
           || '; columns: ' || coalesce((select string_agg(column_name, ', ' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = 'partner_my_products'), 'missing')
  union all
  select 5, 'the safety functions exist; only the server may run partner_register and is_partner_org',
         (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)) = 6
           and not has_function_privilege('anon', 'public.partner_register(text, text[], text, text, text, uuid, uuid, uuid, text, text, text, uuid[], text, text, text, text)', 'execute')
           and not has_function_privilege('authenticated', 'public.partner_register(text, text[], text, text, text, uuid, uuid, uuid, text, text, text, uuid[], text, text, text, text)', 'execute')
           and not has_function_privilege('anon', 'public.is_partner_org(uuid)', 'execute')
           and not has_function_privilege('authenticated', 'public.is_partner_org(uuid)', 'execute'),
         coalesce((select string_agg(distinct p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in (select name from fn)), 'missing')
  union all
  select 6, 'the three safety rules are switched on: a partner business is never published, never gets business members; a partner-sourced product is sold by HagerLand',
         (select count(*) from pg_trigger g join pg_class c on c.oid = g.tgrelid join trg on trg.name = g.tgname and trg.tbl = c.relname where not g.tgisinternal and g.tgenabled <> 'D') = 4,
         coalesce((select string_agg(g.tgname || ' on ' || c.relname, ', ') from pg_trigger g join pg_class c on c.oid = g.tgrelid where g.tgname in (select name from trg)), 'missing')
  union all
  select 7, 'supply_agreements has the two new terms, empty and with no default',
         (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'supply_agreements' and column_name in ('default_markup_bps', 'settlement_timing') and is_nullable = 'YES' and column_default is null) = 2
           and not exists (select 1 from public.supply_agreements where default_markup_bps is not null or settlement_timing is not null),
         coalesce((select string_agg(column_name || ' ' || data_type || ' nullable=' || is_nullable || ' default=' || coalesce(column_default, 'none'), '; ') from information_schema.columns where table_schema = 'public' and table_name = 'supply_agreements' and column_name in ('default_markup_bps', 'settlement_timing')), 'missing')
           || '; filled rows: ' || (select count(*)::text from public.supply_agreements where default_markup_bps is not null or settlement_timing is not null)
  union all
  select 8, 'the four new switches exist and are off, and are not public',
         (select count(*) from setting where key in ('supply_partner_registration', 'supply_catalogue_ordering', 'supply_trade_pricing', 'home_business_row') and value = 'false'::jsonb) = 4
           and not exists (select 1 from public.site_settings_public where key in ('supply_partner_registration', 'supply_catalogue_ordering', 'supply_trade_pricing', 'home_business_row')),
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('supply_partner_registration', 'supply_catalogue_ordering', 'supply_trade_pricing', 'home_business_row')), 'missing')
  union all
  select 9, 'every earlier switch unchanged: deletion and Imports clean-up on Dry run; phone apply, register, desk, private-client, badge clean-up, Amharic for Jobs, call-backs, site-wide Amharic Off; reports On',
         (select value from setting where key = 'jobs_data_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'imports_cleanup_mode') = '"dry_run"'::jsonb
           and (select value from setting where key = 'jobs_phone_apply') = 'false'::jsonb
           and (select value from setting where key = 'jobs_worker_register') = 'false'::jsonb
           and (select value from setting where key = 'jobs_recruitment_desk') = 'false'::jsonb
           and (select value from setting where key = 'jobs_private_client_posts') = 'false'::jsonb
           and (select value from setting where key = 'org_verification_expiry') = 'false'::jsonb
           and (select value from setting where key = 'jobs_amharic') = 'false'::jsonb
           and (select value from setting where key = 'jobs_callbacks') = 'false'::jsonb
           and (select value from setting where key = 'amharic_enabled') = 'false'::jsonb
           and (select value from setting where key = 'jobs_reports_enabled') = 'true'::jsonb,
         coalesce((select string_agg(key || '=' || value::text, ', ' order by key) from setting where key in ('jobs_data_cleanup_mode', 'imports_cleanup_mode', 'jobs_phone_apply', 'jobs_worker_register', 'jobs_recruitment_desk', 'jobs_private_client_posts', 'org_verification_expiry', 'jobs_amharic', 'jobs_callbacks', 'amharic_enabled', 'jobs_reports_enabled')), 'missing')
  union all
  select 10, 'no published (or waiting-for-review) business is linked to a partner',
         not exists (select 1 from public.organisations o where o.status in ('published', 'pending_review') and public.is_partner_org(o.id)),
         'linked and public: ' || (select count(*)::text from public.organisations o where o.status in ('published', 'pending_review') and public.is_partner_org(o.id))
  union all
  select 11, 'no product with a partner source is sold by anyone but HagerLand',
         not exists (select 1 from public.product_sources s join public.products p on p.id = s.product_id join public.organisations o on o.id = p.seller_org_id where not o.is_hagerland),
         'non-HagerLand sellers: ' || (select count(*)::text from public.product_sources s join public.products p on p.id = s.product_id join public.organisations o on o.id = p.seller_org_id where not o.is_hagerland)
  union all
  select 12, 'HagerLand Supply (the seller of partner-sourced products) exists, is HagerLand''s own and is published',
         exists (select 1 from public.organisations where slug = 'hagerland-supply' and is_hagerland and status = 'published'),
         coalesce((select name || ' · is_hagerland=' || is_hagerland::text || ' · ' || status::text from public.organisations where slug = 'hagerland-supply'), 'missing')
  union all
  select 13, 'the old site''s "jobs" table is untouched (no policy, no partner link)',
         not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'jobs'),
         case when exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'jobs')
           then 'legacy table present: ' || (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.jobs', false, true, '')))[1]::text || ' rows, '
             || (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'jobs') || ' policies'
           else 'no legacy table here' end
  union all
  select 14, 'record counts of the new tables (information; expected 0 right after the migration)', true,
         (select string_agg(name || '=' || n, ', ' order by name) from counts)
) checks
order by sort;
