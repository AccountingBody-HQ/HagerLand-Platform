# HagerLand legacy schema snapshot

> Read-only snapshot of the live HagerLand database, taken by AB on 13 Oct 2026 with
> `docs/sql/wp0_legacy_schema_snapshot.sql` (raw output: `docs/sql/wp0_snapshot_result.csv`).
> Use it to check migrations and the WP-20 legacy lockdown. It records structure and row counts only, no data.

Taken 2026-10-13 09:49 UTC · Postgres 17.6

## Name collisions with the planned relaunch schema
NONE: no planned name already exists.

## Tables and views (public)
- admin_audit | table | RLS ON | rows 146
- agent_log | table | RLS ON | rows 50
- business_claims | table | RLS ON | rows 0
- cars | table | RLS ON | rows 2
- claimed_profiles | table | RLS ON | rows 0
- claiming_requests | table | RLS ON | rows 0
- community | table | RLS ON | rows 2
- companies | table | RLS ON | rows 22
- countries | table | RLS ON | rows 1
- delivery | table | RLS ON | rows 0
- directors | table | RLS ON | rows 0
- events | table | RLS ON | rows 3
- formation_agent_addresses | table | RLS ON | rows 0
- housing | table | RLS ON | rows 20
- import_log | table | RLS ON | rows 38
- jobs | table | RLS ON | rows 1
- listing_enquiries | table | RLS ON | rows 1
- made_in_ethiopia | table | RLS ON | rows 0
- money | table | RLS ON | rows 2
- rate_limits | table | RLS ON | rows 9
- sole_traders | table | RLS ON | rows 0
- tutors | table | RLS ON | rows 1

## Columns
- admin_audit: id bigint NOT NULL, action text NOT NULL, table_name text NOT NULL, listing_id text NOT NULL, listing_name text, created_at timestamp with time zone NOT NULL DEFAULT now()
- agent_log: id bigint NOT NULL, agent_name text NOT NULL, task text NOT NULL, action text NOT NULL, target_id text, result text, metadata jsonb, created_at timestamp with time zone DEFAULT now()
- business_claims: id uuid NOT NULL DEFAULT gen_random_uuid(), company_id uuid, claimant_name text NOT NULL, claimant_email text NOT NULL, claimant_phone text, verification_method text NOT NULL DEFAULT 'email'::text, verification_code text NOT NULL, code_sent_at timestamp with time zone NOT NULL DEFAULT now(), code_expires_at timestamp with time zone NOT NULL, completed_at timestamp with time zone, ip_address text, attempt_count integer DEFAULT 0, status text NOT NULL DEFAULT 'pending'::text, created_at timestamp with time zone DEFAULT now(), relationship text, section text DEFAULT 'companies'::text, listing_id text
- cars: id uuid NOT NULL DEFAULT gen_random_uuid(), title text NOT NULL, listing_type text, description text, location text, price text, contact_name text, contact_email text, contact_phone text, status text DEFAULT 'active'::text, created_at timestamp with time zone DEFAULT now(), is_verified boolean DEFAULT false, verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, pending_changes jsonb, promo_text text, promo_expires_at timestamp with time zone, ai_description text, address text, country text, opening_hours text, instagram text, facebook text, whatsapp text, category text, city text, phone text, website text
- claimed_profiles: id uuid NOT NULL DEFAULT gen_random_uuid(), company_id uuid, sole_trader_id uuid, owner_name text NOT NULL, owner_email text NOT NULL, owner_phone text, verified_at timestamp with time zone DEFAULT now(), verification_method text, enhanced_description text, services jsonb, photos jsonb, special_offers text, social_links jsonb, whatsapp_number text, is_active boolean DEFAULT true
- claiming_requests: id uuid NOT NULL DEFAULT gen_random_uuid(), company_id uuid, sole_trader_id uuid, claimant_name text NOT NULL, claimant_email text NOT NULL, claimant_phone text, verification_method text, verification_code text, code_sent_at timestamp with time zone, code_expires_at timestamp with time zone, completed_at timestamp with time zone, ip_address text, device_fingerprint text, attempt_count integer DEFAULT 0, status text DEFAULT 'pending'::text, created_at timestamp with time zone DEFAULT now()
- community: id uuid NOT NULL DEFAULT gen_random_uuid(), name text NOT NULL, category text, description text, location text, contact_name text, contact_email text, contact_phone text, website text, status text DEFAULT 'active'::text, is_verified boolean DEFAULT false, created_at timestamp with time zone DEFAULT now(), verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, pending_changes jsonb, promo_text text, promo_expires_at timestamp with time zone, ai_description text, address text, country text, opening_hours text, instagram text, facebook text, whatsapp text, city text, phone text
- companies: id uuid NOT NULL DEFAULT gen_random_uuid(), country_id uuid, company_number text, company_name text NOT NULL, company_name_normalised text, status text, company_type text, incorporated_date date, sic_code text, sic_description text, registered_address_line1 text, registered_address_line2 text, registered_address_city text, registered_address_postcode text, trading_address_full text, trading_address_city text, website text, email text, phone text, opening_hours jsonb, ethiopian_score integer DEFAULT 0, confidence_tier text, address_type text, formation_agent_name text, tier_classification integer, google_place_id text, google_rating numeric, google_review_count integer, facebook_page_url text, ai_description text, profile_published boolean DEFAULT false, profile_published_at timestamp with time zone, next_accounts_due date, next_confirmation_due date, last_accounts_made_up date, requires_manual_review boolean DEFAULT false, source_url text, first_seen_at timestamp with time zone DEFAULT now(), last_updated_at timestamp with time zone DEFAULT now(), is_verified boolean DEFAULT false, contact_email text, verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, promo_text text, promo_expires_at timestamp with time zone, pending_changes jsonb, country text, address text, instagram text, facebook text, whatsapp text, source text DEFAULT 'user_submission'::text, community_relevant boolean DEFAULT true, is_claimed boolean DEFAULT false, is_featured boolean DEFAULT false
- countries: id uuid NOT NULL DEFAULT gen_random_uuid(), code text NOT NULL, name text NOT NULL, registry_name text, registry_url text, api_available boolean DEFAULT false, api_url text, legal_basis text, is_active boolean DEFAULT true, created_at timestamp with time zone DEFAULT now()
- delivery: id uuid NOT NULL DEFAULT gen_random_uuid(), title text NOT NULL, submitter_name text, contact_email text, category text, city text, country text, address text, phone text, website text, opening_hours text, instagram text, facebook text, whatsapp text, ai_description text, status text NOT NULL DEFAULT 'pending_verification'::text, verification_token uuid, manage_token uuid, email_verified_at timestamp with time zone, promo_text text, promo_expires_at timestamp with time zone, pending_changes jsonb, is_verified boolean NOT NULL DEFAULT false, price text, created_at timestamp with time zone NOT NULL DEFAULT now()
- directors: id uuid NOT NULL DEFAULT gen_random_uuid(), company_id uuid, director_name text NOT NULL, director_name_normalised text, role text, nationality text, country_of_residence text, date_of_birth_month integer, date_of_birth_year integer, appointed_date date, resigned_date date, is_active boolean DEFAULT true, linguistic_pattern_score integer, linguistic_pattern_detail text, matched_name_pattern text
- events: id uuid NOT NULL DEFAULT gen_random_uuid(), title text NOT NULL, category text, description text, location text, event_date date, event_time text, organiser_name text, contact_email text, status text DEFAULT 'active'::text, is_verified boolean DEFAULT false, created_at timestamp with time zone DEFAULT now(), verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, pending_changes jsonb, promo_text text, promo_expires_at timestamp with time zone, ai_description text, address text, country text, opening_hours text, instagram text, facebook text, whatsapp text, city text, phone text, website text
- formation_agent_addresses: id uuid NOT NULL DEFAULT gen_random_uuid(), address_line1 text NOT NULL, postcode text NOT NULL, agent_name text, confirmed_at timestamp with time zone DEFAULT now(), companies_using integer DEFAULT 0
- housing: id uuid NOT NULL DEFAULT gen_random_uuid(), title text NOT NULL, listing_type text, description text, location text, price text, bedrooms integer, contact_name text, contact_email text, contact_phone text, status text DEFAULT 'active'::text, created_at timestamp with time zone DEFAULT now(), is_verified boolean DEFAULT false, verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, pending_changes jsonb, promo_text text, promo_expires_at timestamp with time zone, ai_description text, address text, country text, opening_hours text, instagram text, facebook text, whatsapp text, category text, city text, phone text, website text, google_place_id text, source text DEFAULT 'user_submission'::text
- import_log: google_place_id text NOT NULL, section text NOT NULL, listing_id text, listing_name text, status text NOT NULL DEFAULT 'imported'::text, error text, imported_at timestamp with time zone NOT NULL DEFAULT now()
- jobs: id uuid NOT NULL DEFAULT gen_random_uuid(), title text NOT NULL, company_name text, description text, location text, job_type text, salary_range text, contact_email text, contact_phone text, posted_by_name text, status text DEFAULT 'active'::text, created_at timestamp with time zone DEFAULT now(), expires_at timestamp with time zone, is_verified boolean DEFAULT false, verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, pending_changes jsonb, promo_text text, promo_expires_at timestamp with time zone, ai_description text, address text, country text, opening_hours text, instagram text, facebook text, whatsapp text, category text, city text, phone text, website text
- listing_enquiries: id bigint NOT NULL, section text NOT NULL, listing_id text NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now()
- made_in_ethiopia: id uuid NOT NULL DEFAULT gen_random_uuid(), created_at timestamp with time zone NOT NULL DEFAULT now(), title text NOT NULL, submitter_name text, contact_email text, category text, ai_description text, city text, country text, address text, phone text, website text, opening_hours text, instagram text, facebook text, whatsapp text, status text NOT NULL DEFAULT 'pending_verification'::text, verification_token text, manage_token text, email_verified_at timestamp with time zone, promo_text text, promo_expires_at timestamp with time zone, pending_changes jsonb, origin_confirmed boolean NOT NULL DEFAULT false, origin_details text
- money: id uuid NOT NULL DEFAULT gen_random_uuid(), title text NOT NULL, service_type text, description text, location text, coverage text, contact_name text, contact_email text, contact_phone text, website text, status text NOT NULL DEFAULT 'pending'::text, is_verified boolean DEFAULT false, created_at timestamp with time zone DEFAULT now(), verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, pending_changes jsonb, promo_text text, promo_expires_at timestamp with time zone, ai_description text, address text, country text, opening_hours text, instagram text, facebook text, whatsapp text, category text, city text, phone text
- rate_limits: key text NOT NULL, count integer NOT NULL DEFAULT 1, reset_at timestamp with time zone NOT NULL
- sole_traders: id uuid NOT NULL DEFAULT gen_random_uuid(), google_place_id text, business_name text NOT NULL, category text, address_full text, city text, country text, phone text, email text, website text, opening_hours jsonb, google_rating numeric, google_review_count integer, facebook_page_url text, ai_description text, ethiopian_score integer DEFAULT 0, profile_published boolean DEFAULT false, first_seen_at timestamp with time zone DEFAULT now(), last_updated_at timestamp with time zone DEFAULT now()
- tutors: id uuid NOT NULL DEFAULT gen_random_uuid(), name text NOT NULL, subject text, description text, location text, delivery_mode text, rate text, contact_email text, contact_phone text, status text DEFAULT 'active'::text, created_at timestamp with time zone DEFAULT now(), is_verified boolean DEFAULT false, verification_token text, manage_token text, email_verified_at timestamp with time zone, submitter_name text, pending_changes jsonb, promo_text text, promo_expires_at timestamp with time zone, ai_description text, address text, country text, opening_hours text, instagram text, facebook text, whatsapp text, category text, city text, phone text, website text

## Constraints
- admin_audit.admin_audit_pkey: PRIMARY KEY (id)
- agent_log.agent_log_pkey: PRIMARY KEY (id)
- business_claims.business_claims_company_id_fkey: FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
- business_claims.business_claims_pkey: PRIMARY KEY (id)
- cars.cars_pkey: PRIMARY KEY (id)
- claimed_profiles.claimed_profiles_company_id_fkey: FOREIGN KEY (company_id) REFERENCES companies(id)
- claimed_profiles.claimed_profiles_pkey: PRIMARY KEY (id)
- claimed_profiles.claimed_profiles_sole_trader_id_fkey: FOREIGN KEY (sole_trader_id) REFERENCES sole_traders(id)
- claiming_requests.claiming_requests_company_id_fkey: FOREIGN KEY (company_id) REFERENCES companies(id)
- claiming_requests.claiming_requests_pkey: PRIMARY KEY (id)
- claiming_requests.claiming_requests_sole_trader_id_fkey: FOREIGN KEY (sole_trader_id) REFERENCES sole_traders(id)
- community.community_pkey: PRIMARY KEY (id)
- companies.companies_company_number_key: UNIQUE (company_number)
- companies.companies_country_id_fkey: FOREIGN KEY (country_id) REFERENCES countries(id)
- companies.companies_pkey: PRIMARY KEY (id)
- countries.countries_code_key: UNIQUE (code)
- countries.countries_pkey: PRIMARY KEY (id)
- delivery.delivery_pkey: PRIMARY KEY (id)
- directors.directors_company_id_fkey: FOREIGN KEY (company_id) REFERENCES companies(id)
- directors.directors_pkey: PRIMARY KEY (id)
- events.events_pkey: PRIMARY KEY (id)
- formation_agent_addresses.formation_agent_addresses_pkey: PRIMARY KEY (id)
- housing.housing_pkey: PRIMARY KEY (id)
- import_log.import_log_pkey: PRIMARY KEY (google_place_id, section)
- jobs.jobs_pkey: PRIMARY KEY (id)
- listing_enquiries.listing_enquiries_pkey: PRIMARY KEY (id)
- made_in_ethiopia.made_in_ethiopia_pkey: PRIMARY KEY (id)
- money.money_pkey: PRIMARY KEY (id)
- rate_limits.rate_limits_pkey: PRIMARY KEY (key)
- sole_traders.sole_traders_google_place_id_key: UNIQUE (google_place_id)
- sole_traders.sole_traders_pkey: PRIMARY KEY (id)
- tutors.tutors_pkey: PRIMARY KEY (id)

## Indexes
- CREATE UNIQUE INDEX admin_audit_pkey ON public.admin_audit USING btree (id)
- CREATE INDEX idx_admin_audit_created_at ON public.admin_audit USING btree (created_at DESC)
- CREATE UNIQUE INDEX agent_log_pkey ON public.agent_log USING btree (id)
- CREATE INDEX idx_agent_log_agent ON public.agent_log USING btree (agent_name)
- CREATE INDEX idx_agent_log_created ON public.agent_log USING btree (created_at DESC)
- CREATE INDEX business_claims_claimant_email_idx ON public.business_claims USING btree (claimant_email)
- CREATE INDEX business_claims_company_id_idx ON public.business_claims USING btree (company_id)
- CREATE UNIQUE INDEX business_claims_pkey ON public.business_claims USING btree (id)
- CREATE INDEX business_claims_status_idx ON public.business_claims USING btree (status)
- CREATE INDEX business_claims_verification_code_idx ON public.business_claims USING btree (verification_code)
- CREATE UNIQUE INDEX cars_pkey ON public.cars USING btree (id)
- CREATE INDEX idx_cars_created_at ON public.cars USING btree (created_at DESC)
- CREATE INDEX idx_cars_status ON public.cars USING btree (status)
- CREATE UNIQUE INDEX claimed_profiles_pkey ON public.claimed_profiles USING btree (id)
- CREATE UNIQUE INDEX claiming_requests_pkey ON public.claiming_requests USING btree (id)
- CREATE UNIQUE INDEX community_pkey ON public.community USING btree (id)
- CREATE INDEX idx_community_created_at ON public.community USING btree (created_at DESC)
- CREATE INDEX idx_community_status ON public.community USING btree (status)
- CREATE UNIQUE INDEX companies_company_number_key ON public.companies USING btree (company_number)
- CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id)
- CREATE INDEX idx_companies_first_seen_at ON public.companies USING btree (first_seen_at DESC)
- CREATE INDEX idx_companies_status ON public.companies USING btree (status)
- CREATE UNIQUE INDEX countries_code_key ON public.countries USING btree (code)
- CREATE UNIQUE INDEX countries_pkey ON public.countries USING btree (id)
- CREATE INDEX delivery_category_idx ON public.delivery USING btree (category)
- CREATE INDEX delivery_contact_email_idx ON public.delivery USING btree (contact_email)
- CREATE INDEX delivery_manage_token_idx ON public.delivery USING btree (manage_token)
- CREATE UNIQUE INDEX delivery_pkey ON public.delivery USING btree (id)
- CREATE INDEX delivery_status_idx ON public.delivery USING btree (status)
- CREATE INDEX delivery_verification_token_idx ON public.delivery USING btree (verification_token)
- CREATE UNIQUE INDEX directors_pkey ON public.directors USING btree (id)
- CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id)
- CREATE INDEX idx_events_created_at ON public.events USING btree (created_at DESC)
- CREATE INDEX idx_events_status ON public.events USING btree (status)
- CREATE UNIQUE INDEX formation_agent_addresses_pkey ON public.formation_agent_addresses USING btree (id)
- CREATE INDEX housing_google_place_id_idx ON public.housing USING btree (google_place_id)
- CREATE UNIQUE INDEX housing_pkey ON public.housing USING btree (id)
- CREATE INDEX idx_housing_created_at ON public.housing USING btree (created_at DESC)
- CREATE INDEX idx_housing_status ON public.housing USING btree (status)
- CREATE INDEX idx_import_log_imported_at ON public.import_log USING btree (imported_at DESC)
- CREATE INDEX idx_import_log_section ON public.import_log USING btree (section)
- CREATE UNIQUE INDEX import_log_pkey ON public.import_log USING btree (google_place_id, section)
- CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at DESC)
- CREATE INDEX idx_jobs_status ON public.jobs USING btree (status)
- CREATE UNIQUE INDEX jobs_pkey ON public.jobs USING btree (id)
- CREATE INDEX idx_listing_enquiries_created_at ON public.listing_enquiries USING btree (created_at DESC)
- CREATE INDEX idx_listing_enquiries_listing ON public.listing_enquiries USING btree (section, listing_id)
- CREATE UNIQUE INDEX listing_enquiries_pkey ON public.listing_enquiries USING btree (id)
- CREATE INDEX made_in_ethiopia_manage_token_idx ON public.made_in_ethiopia USING btree (manage_token)
- CREATE UNIQUE INDEX made_in_ethiopia_pkey ON public.made_in_ethiopia USING btree (id)
- CREATE INDEX made_in_ethiopia_status_idx ON public.made_in_ethiopia USING btree (status)
- CREATE INDEX made_in_ethiopia_verification_token_idx ON public.made_in_ethiopia USING btree (verification_token)
- CREATE INDEX idx_money_created_at ON public.money USING btree (created_at DESC)
- CREATE INDEX idx_money_status ON public.money USING btree (status)
- CREATE UNIQUE INDEX money_pkey ON public.money USING btree (id)
- CREATE INDEX money_service_type_idx ON public.money USING btree (service_type)
- CREATE INDEX money_status_idx ON public.money USING btree (status)
- CREATE UNIQUE INDEX rate_limits_pkey ON public.rate_limits USING btree (key)
- CREATE UNIQUE INDEX sole_traders_google_place_id_key ON public.sole_traders USING btree (google_place_id)
- CREATE UNIQUE INDEX sole_traders_pkey ON public.sole_traders USING btree (id)
- CREATE INDEX idx_tutors_created_at ON public.tutors USING btree (created_at DESC)
- CREATE INDEX idx_tutors_status ON public.tutors USING btree (status)
- CREATE UNIQUE INDEX tutors_pkey ON public.tutors USING btree (id)

## Grants to anon / authenticated
- admin_audit → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- admin_audit → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- agent_log → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- agent_log → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- business_claims → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- business_claims → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- cars → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- cars → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- claimed_profiles → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- claimed_profiles → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- claiming_requests → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- claiming_requests → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- community → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- community → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- companies → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- companies → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- countries → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- countries → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- delivery → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- delivery → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- directors → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- directors → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- events → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- events → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- formation_agent_addresses → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- formation_agent_addresses → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- housing → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- housing → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- import_log → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- import_log → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- jobs → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- jobs → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- listing_enquiries → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- listing_enquiries → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- made_in_ethiopia → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- made_in_ethiopia → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- money → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- money → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- rate_limits → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- rate_limits → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- sole_traders → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- sole_traders → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- tutors → anon: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
- tutors → authenticated: DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE

## RLS policies (public + storage)
- public.cars | "Public can read active cars listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.cars | "Public can read cars" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.community | "Public can read active community listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.community | "Public can read community" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.companies | "Public can read active companies listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.companies | "Public can read companies" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.countries | "Public can read countries" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.delivery | "Public can read active delivery listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.events | "Public can read active events listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.events | "Public can read events" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.housing | "Public can read active housing listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.housing | "Public can read housing" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.jobs | "Public can read active jobs listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.jobs | "Public can read jobs" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.made_in_ethiopia | "Public can read active made_in_ethiopia listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.money | "Public can read active money listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.sole_traders | "Public can read sole_traders" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -
- public.tutors | "Public can read active tutors listings" | SELECT | PERMISSIVE | roles public | USING (status = 'active'::text) | WITH CHECK -
- public.tutors | "Public can read tutors" | SELECT | PERMISSIVE | roles anon | USING true | WITH CHECK -

## Functions (public)
(none)

## Triggers (public + auth.users)
(none)

## Types (public)
(none)

## Extensions
- pg_stat_statements 1.11 (schema extensions)
- pgcrypto 1.3 (schema extensions)
- plpgsql 1.0 (schema pg_catalog)
- supabase_vault 0.3.1 (schema vault)
- uuid-ossp 1.1 (schema extensions)

## Storage buckets
(none)
