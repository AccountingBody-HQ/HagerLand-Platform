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

## 0012_enum_values.sql (Phase 1.5, E2)
**What it does:** adds new choices to two existing lists: a "country" level for places, and three new
kinds of organisation (lender, insurer, broker) for finance and insurance partners. Postgres needs these
in a separate step before they can be used, which is why this file is small. It changes no data.

**Check:**
```sql
select count(*) from pg_enum e join pg_type t on t.oid = e.enumtypid
where (t.typname = 'location_level' and e.enumlabel = 'country')
   or (t.typname = 'org_kind' and e.enumlabel in ('lender', 'insurer', 'broker'));
```
**You should see:** `4`

## 0013_international.sql (Phase 1.5, E2)
**What it does:** makes HagerLand international without changing any Ethiopian address. Every place
gets a country (all existing places are Ethiopia), and 12 countries where many Ethiopians live are added
with their main cities (London, Washington DC, Toronto, Dubai and others). Businesses get a country,
a currency and a "serves the Ethiopian community abroad" option. Property listings and developments
are kept to Ethiopia. It also adds a private table of exchange rates you set in admin → Exchange rates,
used only to show visitors abroad an "approx." price next to the ETB price.

**Check:**
```sql
select (select count(*) from locations where level = 'country') as countries,
       (select count(*) from locations where country_code <> 'ET' and level = 'city') as cities_abroad,
       (select count(*) from locations where country_code = 'ET') as ethiopian_places,
       (select count(*) from information_schema.columns where table_name = 'organisations' and column_name in ('country_code', 'currency', 'serves_diaspora')) as new_org_columns,
       (select count(*) from exchange_rates) as rates;
```
**You should see:** `12 | 22 | 39 | 3 | 0` (Ethiopian places: 39 plus any you have added since).

## 0014_service_requests.sql (Phase 1.5, E3)
**What it does:** adds "Request a service". Customers describe a job; HagerLand sends it to up to three
businesses; they accept or decline, send a quote, and the customer chooses one. New private tables:
service requests, provider matches (with lead fee and commission figures that only HagerLand can see),
and a deals ledger for commissions and lead fees. Each service category can now have its own questions
(edited in admin → Request questions) and an "emergency" option. Businesses see a request only when it is
sent to them, and the customer's phone and email only after they accept. It changes no existing data
except linking each existing service category to the Professionals or Contractors service.

**Check:**
```sql
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('service_requests', 'service_request_matches', 'deals')) as new_tables,
       (select count(*) from service_categories where vertical_key is null) as categories_without_vertical,
       (select count(*) from information_schema.views where table_name = 'service_requests_for_provider') as provider_view;
```
**You should see:** `3 | 0 | 1`

## 0015_repairs_contractors.sql (Phase 1.5, E4)
**What it does:** adds the "Repairs & maintenance" services (plumbing and electrical repairs, roofing,
locksmiths, drainage, inspections, preventative maintenance, emergency repairs and more), extra contractor
types (house builders, electrical and plumbing contractors, interior fit-out, groundworks) and extra
professional types (electrical and mechanical engineers, planning consultants, construction managers,
property consultants, accountants, insurance professionals, environmental consultants). Each repair service
comes with a few questions customers answer when they ask for quotes; you can change them in admin →
Request questions. It also adds a "Qualifications" box to business profiles.

**Check:**
```sql
select (select count(*) from service_categories where vertical_key = 'repairs-maintenance' and parent_id is not null) as repair_services,
       (select count(*) from service_categories where slug in ('house-builders', 'electrical-contractors', 'plumbing-contractors', 'interior-contractors', 'groundworks')) as new_contractor_types,
       (select count(*) from service_categories where question_schema <> '[]'::jsonb) as services_with_questions,
       (select count(*) from information_schema.columns where table_name = 'organisations' and column_name = 'qualifications') as qualifications_column;
```
**You should see:** `17 | 5 | 19 | 1`

## 0016_property_care.sql (Phase 1.5, E5)
**What it does:** adds HagerLand Property Care. A private list of consultation requests from owners abroad
(the "Property Care pipeline" in admin), and private records for each property you manage: inspections
with photos and notes, rent statements and a maintenance log. Owners cannot see these records yet: the
owner portal is planned for Phase 2. It also adds an empty "Property Care prices" setting; the website shows
no prices until you fill it in.

**Check:**
```sql
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('property_care_requests', 'managed_properties', 'property_inspections', 'rent_statements', 'maintenance_log')) as new_tables,
       (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity and tablename in ('property_care_requests', 'managed_properties', 'property_inspections', 'rent_statements', 'maintenance_log')) as without_rls,
       (select count(*) from site_settings_public where key = 'property_care_pricing') as pricing_setting;
```
**You should see:** `5 | 0 | 1`

## 0017_saved_and_alerts.sql (Phase 1.5, E6)
**What it does:** lets signed-in visitors save properties, products, businesses and developments, save
property searches with email alerts (instant, daily or weekly, with an unsubscribe link in every email), and
keep their supplies quote list in their account. Each person can only see and change their own. It also adds
questions to the "Property valuers" service so "Request a valuation" asks the right things.

**Check:**
```sql
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('saved_items', 'saved_searches', 'quote_lists')) as new_tables,
       (select count(*) from pg_policies where tablename in ('saved_items', 'saved_searches', 'quote_lists')) as policies,
       (select jsonb_array_length(question_schema) from service_categories where slug = 'property-valuers') as valuation_questions;
```
**You should see:** `3 | 10 | 4`

## 0018_finance_insurance.sql (Phase 1.5, E7)
**What it does:** adds the finance categories (mortgages, diaspora mortgages, housing, land, construction,
development, bridging, commercial property and home-improvement finance, supplier credit, equipment finance)
and insurance categories (home, building, landlord, contents, commercial property, construction, development
and project, contractor, professional indemnity, public liability), each with a few questions. Nobody can
request them while Finance and Insurance are "coming soon". When you switch one live (only after the licensing
checks in the launch report), requests go to the lenders, insurers or brokers you add as partners.

**Check:**
```sql
select vertical_key, count(*) from service_categories where vertical_key in ('finance', 'insurance') and parent_id is not null group by 1 order by 1;
```
**You should see:** `finance | 11` and `insurance | 10`

---

## 0019_jobs.sql (Phase 1.5, E8)
**What it does:** adds the jobs board (jobs, applications, candidate profiles) and construction-progress
updates for developments.
- **Jobs** are posted by organisations, reviewed by you before going live, and close on their closing date (or 60 days after approval).
- **Applications** (references `HLA-…`) are created only by the website after checks. Only the applicant, the employer's team and HagerLand can read them. CVs sit in the private document store and are deleted after 12 months.
- **Candidate profiles** are private unless the candidate chooses "approved employers". Even then, employers never see contact details or CVs.
- **Progress updates** posted by developers wait for your review before they appear on the development page.
- It also adds the "Recruitment → Staffing requirement" request type for employers who want hiring help.

Nothing is public while Jobs & Recruitment is "coming soon".

**Check:**
```sql
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('jobs', 'job_applications', 'candidate_profiles', 'development_updates')) as new_tables,
       (select count(*) from service_categories where slug in ('recruitment', 'staffing')) as staffing_categories,
       (select version from schema_migrations where version = '0019') as recorded;
```
**You should see:** `4 | 2 | 0019`. The security test now shows 96 `PASS` rows.

---

## Security test (run after all migrations)
Paste `supabase/tests/rls_test.sql` and run it. Supabase may warn that the query contains `delete`
statements: that is the test cleaning up after itself; click **Run this query**.
It temporarily creates two test users and a test listing, tries things that should and should not be
allowed, then deletes everything it created.

**You should see:** every row starting with `PASS` (38 rows after migration 0011, 42 after 0013, 57 after 0014, 67 after 0016, 74 after 0017, 96 after 0019; each later migration adds its own checks and its section below says the new total).

## TypeScript types
`lib/database.types.ts` was generated from these exact migrations. After all migrations are applied,
the live database matches it. If a future migration changes the schema, regenerate with:
```bash
npx supabase gen types typescript --project-id <your-project-ref> --schema public > lib/database.types.ts
```
(requires `npx supabase login` first).
