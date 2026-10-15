-- 0026 · Indexes for query paths added in Phase 1.5 (spec 25.4 performance): foreign keys that pages filter on,
-- and user/organisation references that are scanned when an account or business is deleted. Additive only.

create index if not exists deals_org_idx on public.deals (org_id);
create index if not exists deals_match_idx on public.deals (match_id);
create index if not exists service_requests_category_idx on public.service_requests (service_category_id);
create index if not exists service_requests_location_idx on public.service_requests (location_id);
create index if not exists service_categories_vertical_idx on public.service_categories (vertical_key);
create index if not exists partner_applications_vertical_idx on public.partner_applications (vertical_key);
create index if not exists interest_registrations_user_idx on public.interest_registrations (user_id);
create index if not exists property_care_requests_user_idx on public.property_care_requests (user_id);
create index if not exists managed_properties_owner_idx on public.managed_properties (owner_user_id);
create index if not exists managed_properties_request_idx on public.managed_properties (care_request_id);
create index if not exists maintenance_log_request_idx on public.maintenance_log (service_request_id);
create index if not exists claims_user_idx on public.claims (user_id);
create index if not exists verification_requests_submitter_idx on public.verification_requests (submitted_by);
create index if not exists contact_reveals_viewer_idx on public.contact_reveals (viewer_user_id);
create index if not exists media_uploader_idx on public.media (uploaded_by);
create index if not exists portfolio_projects_development_idx on public.portfolio_projects (development_id);
create index if not exists products_brand_idx on public.products (brand_id);
create index if not exists quote_request_items_product_idx on public.quote_request_items (product_id);
create index if not exists trade_accounts_org_idx on public.trade_accounts (org_id);
create index if not exists org_invitations_invited_by_idx on public.org_invitations (invited_by);
create index if not exists job_posts_created_by_idx on public.job_posts (created_by);
create index if not exists development_updates_created_by_idx on public.development_updates (created_by);

insert into public.schema_migrations (version, name) values ('0026', 'indexes') on conflict (version) do nothing;
