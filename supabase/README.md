# Database migrations — how to run them

All database changes live in `supabase/migrations/` as numbered files. Claude never runs them.
AB runs each one, in order, in **Supabase → SQL Editor → New query** (paste the whole file, click **Run**),
then runs the check query beneath it and compares the result.

**Before the first migration: take a backup** (`bash scripts/backup-supabase.sh`, see `docs/RUNBOOK.md`).

Every migration only ADDS new things. No existing table, row or policy is changed or deleted
(the one exception is a new column added to the existing `import_log` table, which keeps all its data).
If a migration fails, Supabase rolls the whole file back, so nothing is half-applied: send the error to Claude.

All files were tested end to end on Supabase's own Postgres image before being handed over.

---

## 0001_extensions_enums.sql
**What it does:** switches on three standard Postgres add-ons (secure random IDs, fuzzy text search,
accent-insensitive search) and creates the fixed lists the new site uses, such as property types and
listing statuses. It also adds the safety rule that stops users changing protected fields
(like "featured" or "verified") themselves.

**Check:**
```sql
select count(*) from pg_type where typnamespace = 'public'::regnamespace and typname in ('account_type','org_kind','org_role','verification_level','listing_status','listing_purpose','property_type','finishing_status','furnishing','tenure','completion_status','development_kind','price_type','stock_status','enquiry_status','quote_status','location_level');
```
**You should see:** `17`

## 0002_core_tables.sql
**What it does:** creates the 28 new tables (properties, organisations, products, developments,
enquiries, quotes, locations, categories, media and the admin tables), their indexes for fast search,
and the automatic rules: profile created on signup, publish date and 60-day expiry set on approval,
"featured" kept in step with promotions, and human-friendly references like HLE-2026-000001.

**Check:**
```sql
select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name in ('locations','service_categories','product_categories','brands','profiles','organisations','organisation_members','organisation_services','org_product_categories','developments','portfolio_projects','properties','products','media','reference_counters','quote_requests','quote_request_items','enquiries','contact_reveals','claims','verification_requests','reports','admin_notes','search_misses','promotions','site_settings','audit_log','errors');
```
**You should see:** `28`

## 0003_rls_policies.sql
**What it does:** switches on Row Level Security on every new table. Visitors can read nothing from the
tables directly; signed-in users can only see and edit their own records; only HagerLand (the server)
can publish, feature or verify anything.

**Check:**
```sql
select count(*) from pg_tables where schemaname='public' and not rowsecurity and tablename in ('locations','service_categories','product_categories','brands','profiles','organisations','organisation_members','organisation_services','org_product_categories','developments','portfolio_projects','properties','products','media','reference_counters','quote_requests','quote_request_items','enquiries','contact_reveals','claims','verification_requests','reports','admin_notes','search_misses','promotions','site_settings','audit_log','errors');
```
**You should see:** `0` (zero tables without protection)

## 0004_public_views.sql
**What it does:** creates the 9 "public windows" that the website reads from. Each shows only published
records and only safe columns: never phone numbers, emails, tax numbers or private notes.
Supabase's Security Advisor will list these as "security definer views". That is intentional
and explained in a comment on each view.

**Check:**
```sql
select count(*) from information_schema.views where table_schema='public' and table_name like '%\_public';
```
**You should see:** `9`

## 0005_search_functions.sql
**What it does:** adds the search engine: property, product, company, development and location search,
the combined search for the header, popular-location counts and location-page summaries.

**Check:**
```sql
select count(*) from pg_proc where pronamespace='public'::regnamespace and proname in ('search_properties','search_products','search_organisations','search_developments','search_locations','search_all','popular_locations','location_summary','service_location_count');
```
**You should see:** `9`

## 0006_storage_buckets_policies.sql
**What it does:** creates two file stores: `public-media` (processed photos anyone can view) and
`private-docs` (verification documents, materials lists and quotes, never public).

**Check:**
```sql
select id, public from storage.buckets where id in ('public-media','private-docs') order by id;
```
**You should see:** two rows: `private-docs | false` and `public-media | true`

## 0007_seed_reference_data.sql
**What it does:** adds the starting data: 14 regions, Addis Ababa's 11 sub-cities, 14 key cities,
60 service categories, 87 product categories, the two HagerLand organisations and default settings.

**Check:**
```sql
select (select count(*) from locations) as locations, (select count(*) from service_categories) as services,
       (select count(*) from product_categories) as product_categories, (select count(*) from organisations) as organisations,
       (select count(*) from site_settings) as settings;
```
**You should see:** `39 | 60 | 87 | 2 | 10`

## 0010_public_settings.sql (added after launch prep, run after 0009)
**What it does:** lets the website read a few more settings that you fill in from the admin
Settings screen: your legal company details, whether listing is free, the "Why buy from HagerLand"
points and your delivery area. They all start empty, and the website hides anything empty.
It changes no data.

**Check:**
```sql
select count(*) from site_settings_public;
```
**You should see:** `14`

## 0011_vertical_registry.sql (Phase 1.5, E1)
**What it does:** adds the list of HagerLand's ten services ("verticals") with their status
(Live, Coming soon or Hidden), which the menus, homepage, footer, sitemap and search now read.
You switch them in admin → Verticals. It also adds two private lists: people who register interest
in a service, and organisations applying to become partners (banks, insurers, brokers). Finally it
adds a record of which migrations have been applied, used by the health check. It changes no data.

**Check:**
```sql
select (select count(*) from verticals) as verticals,
       (select count(*) from verticals where status = 'live') as live,
       (select count(*) from schema_migrations) as migrations_recorded,
       (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('interest_registrations', 'partner_applications')) as lead_tables;
```
**You should see:** `10 | 6 | 11 | 2`

---

## Security test (run after all migrations)
Paste `supabase/tests/rls_test.sql` and run it. Supabase may warn that the query contains `delete`
statements: that is the test cleaning up after itself; click **Run this query**.
It temporarily creates two test users and a test listing, tries things that should and should not be
allowed, then deletes everything it created.

**You should see:** every row starting with `PASS` (38 rows after migration 0011; each later migration adds its own checks and its section below says the new total).

## TypeScript types
`lib/database.types.ts` was generated from these exact migrations. After all migrations are applied,
the live database matches it. If a future migration changes the schema, regenerate with:
```bash
npx supabase gen types typescript --project-id <your-project-ref> --schema public > lib/database.types.ts
```
(requires `npx supabase login` first).
