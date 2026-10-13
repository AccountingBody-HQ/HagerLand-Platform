-- 0003 · Row Level Security for every new table (spec 6.5).
-- Default deny. Anonymous visitors read nothing from base tables except active reference data;
-- public pages read through the *_public views (0004) and search functions (0005).
-- The service role (server-side admin code) bypasses RLS by design.

do $$
declare
  t text;
begin
  foreach t in array array[
    'locations', 'service_categories', 'product_categories', 'brands', 'profiles', 'organisations',
    'organisation_members', 'organisation_services', 'org_product_categories', 'developments',
    'portfolio_projects', 'properties', 'products', 'media', 'reference_counters', 'quote_requests',
    'quote_request_items', 'enquiries', 'contact_reveals', 'claims', 'verification_requests', 'reports',
    'admin_notes', 'search_misses', 'promotions', 'site_settings', 'audit_log', 'errors'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon', t);
  end loop;

  -- Service-role-only tables: signed-in users get nothing either.
  foreach t in array array[
    'reference_counters', 'contact_reveals', 'reports', 'admin_notes', 'search_misses',
    'promotions', 'site_settings', 'audit_log', 'errors'
  ] loop
    execute format('revoke all on table public.%I from authenticated', t);
  end loop;
end
$$;

-- No user may delete rows directly (records are archived instead).
revoke delete on table
  public.profiles, public.organisations, public.developments, public.portfolio_projects,
  public.properties, public.products, public.media, public.quote_requests, public.quote_request_items,
  public.enquiries, public.claims, public.verification_requests, public.organisation_members,
  public.locations, public.service_categories, public.product_categories, public.brands
from authenticated;

-- ---------------------------------------------------------------------------
-- Reference data: anyone may read active rows
-- ---------------------------------------------------------------------------
grant select on public.locations, public.service_categories, public.product_categories, public.brands to anon;
revoke insert, update on public.locations, public.service_categories, public.product_categories, public.brands from authenticated;

create policy "Active locations are public" on public.locations
  for select to anon, authenticated using (is_active);
create policy "Active service categories are public" on public.service_categories
  for select to anon, authenticated using (is_active);
create policy "Active product categories are public" on public.product_categories
  for select to anon, authenticated using (is_active);
create policy "Active brands are public" on public.brands
  for select to anon, authenticated using (is_active);

-- ---------------------------------------------------------------------------
-- Profiles: each user sees and edits only their own
-- ---------------------------------------------------------------------------
revoke insert on public.profiles from authenticated;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "Users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Organisations and membership
-- ---------------------------------------------------------------------------
create policy "Members read their organisations" on public.organisations
  for select to authenticated using (public.is_org_member(id) or created_by = auth.uid());
create policy "Active users create organisations" on public.organisations
  for insert to authenticated with check (public.is_active_user() and created_by = auth.uid());
create policy "Owners and admins edit their organisations" on public.organisations
  for update to authenticated
  using (public.is_org_member(id, array['owner', 'admin']::public.org_role[]))
  with check (public.is_active_user() and public.is_org_member(id, array['owner', 'admin']::public.org_role[]));

revoke insert, update on public.organisation_members from authenticated;
create policy "Members see their organisation's members" on public.organisation_members
  for select to authenticated using (user_id = auth.uid() or public.is_org_member(org_id));

create policy "Members read org services" on public.organisation_services
  for select to authenticated using (public.is_org_member(org_id));
create policy "Owners and admins add org services" on public.organisation_services
  for insert to authenticated with check (public.is_active_user() and public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));
create policy "Owners and admins remove org services" on public.organisation_services
  for delete to authenticated using (public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));

create policy "Members read org product categories" on public.org_product_categories
  for select to authenticated using (public.is_org_member(org_id));
create policy "Owners and admins add org product categories" on public.org_product_categories
  for insert to authenticated with check (public.is_active_user() and public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));
create policy "Owners and admins remove org product categories" on public.org_product_categories
  for delete to authenticated using (public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- Listings owned by a user or by an organisation they belong to
-- ---------------------------------------------------------------------------
create policy "Listers read own properties" on public.properties
  for select to authenticated using (lister_user_id = auth.uid() or public.is_org_member(lister_org_id));
create policy "Active users create own properties" on public.properties
  for insert to authenticated
  with check (
    public.is_active_user()
    and lister_user_id = auth.uid()
    and (lister_org_id is null or public.is_org_member(lister_org_id))
    and lister_type <> 'hagerland'
  );
create policy "Listers edit own properties" on public.properties
  for update to authenticated
  using (lister_user_id = auth.uid() or public.is_org_member(lister_org_id))
  with check (
    public.is_active_user()
    and (lister_user_id = auth.uid() or public.is_org_member(lister_org_id))
    and (lister_org_id is null or public.is_org_member(lister_org_id))
    and lister_type <> 'hagerland'
  );

create policy "Members read org developments" on public.developments
  for select to authenticated using (public.is_org_member(developer_org_id) or created_by = auth.uid());
create policy "Members create org developments" on public.developments
  for insert to authenticated
  with check (public.is_active_user() and public.is_org_member(developer_org_id) and created_by = auth.uid());
create policy "Members edit org developments" on public.developments
  for update to authenticated
  using (public.is_org_member(developer_org_id))
  with check (public.is_active_user() and public.is_org_member(developer_org_id));

create policy "Members read org portfolio" on public.portfolio_projects
  for select to authenticated using (public.is_org_member(org_id));
create policy "Members create org portfolio" on public.portfolio_projects
  for insert to authenticated with check (public.is_active_user() and public.is_org_member(org_id));
create policy "Members edit org portfolio" on public.portfolio_projects
  for update to authenticated
  using (public.is_org_member(org_id))
  with check (public.is_active_user() and public.is_org_member(org_id));

create policy "Members read org products" on public.products
  for select to authenticated using (public.is_org_member(seller_org_id));
create policy "Members create org products" on public.products
  for insert to authenticated with check (public.is_active_user() and public.is_org_member(seller_org_id));
create policy "Members edit org products" on public.products
  for update to authenticated
  using (public.is_org_member(seller_org_id))
  with check (public.is_active_user() and public.is_org_member(seller_org_id));

-- ---------------------------------------------------------------------------
-- Media: owners can see their own entity's media; all writes go through the server
-- ---------------------------------------------------------------------------
create function public.can_edit_entity(p_entity_type text, p_entity_id uuid)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select case p_entity_type
    when 'property' then exists (select 1 from public.properties p where p.id = p_entity_id
      and (p.lister_user_id = auth.uid() or public.is_org_member(p.lister_org_id)))
    when 'development' then exists (select 1 from public.developments d where d.id = p_entity_id and public.is_org_member(d.developer_org_id))
    when 'organisation' then public.is_org_member(p_entity_id, array['owner', 'admin']::public.org_role[])
    when 'portfolio' then exists (select 1 from public.portfolio_projects pp where pp.id = p_entity_id and public.is_org_member(pp.org_id))
    when 'product' then exists (select 1 from public.products pr where pr.id = p_entity_id and public.is_org_member(pr.seller_org_id))
    else false
  end
$$;

revoke insert, update on public.media from authenticated;
create policy "Owners read their media" on public.media
  for select to authenticated using (public.can_edit_entity(entity_type, entity_id));

-- ---------------------------------------------------------------------------
-- Leads
-- ---------------------------------------------------------------------------
revoke insert, update on public.quote_requests, public.quote_request_items from authenticated;
revoke select on public.quote_requests from authenticated;
grant select (id, reference, requester_user_id, name, phone, email, company_name, delivery_location_id,
  delivery_address, needed_by, notes, status, quoted_total_etb_cents, quoted_at, source, created_at, updated_at)
  on public.quote_requests to authenticated;
create policy "Requesters read own quotes" on public.quote_requests
  for select to authenticated using (requester_user_id = auth.uid());
create policy "Requesters read own quote items" on public.quote_request_items
  for select to authenticated using (
    exists (select 1 from public.quote_requests q where q.id = quote_request_id and q.requester_user_id = auth.uid())
  );

-- Enquiries are inserted by the server only; recipients may change status and private notes.
revoke insert, update on public.enquiries from authenticated;
revoke select on public.enquiries from authenticated;
grant select (id, reference, target_type, target_id, recipient_org_id, recipient_user_id, sender_user_id,
  name, phone, email, message, preferred_contact, intent, details, status, recipient_notes, first_viewed_at,
  source_url, created_at, updated_at)
  on public.enquiries to authenticated;
grant update (status, recipient_notes, first_viewed_at) on public.enquiries to authenticated;
create policy "Senders and recipients read enquiries" on public.enquiries
  for select to authenticated using (
    sender_user_id = auth.uid() or recipient_user_id = auth.uid() or public.is_org_member(recipient_org_id)
  );
create policy "Recipients update enquiry status" on public.enquiries
  for update to authenticated
  using (recipient_user_id = auth.uid() or public.is_org_member(recipient_org_id))
  with check (public.is_active_user() and (recipient_user_id = auth.uid() or public.is_org_member(recipient_org_id)));

-- ---------------------------------------------------------------------------
-- Claims and verification requests: users create and read their own; HagerLand decides
-- ---------------------------------------------------------------------------
revoke select, insert, update on public.claims from authenticated;
grant select (id, org_id, user_id, claimant_name, claimant_phone, claimant_email, relationship, message,
  evidence_paths, status, decided_at, created_at, updated_at) on public.claims to authenticated;
grant insert (org_id, user_id, claimant_name, claimant_phone, claimant_email, relationship, message, evidence_paths)
  on public.claims to authenticated;
create policy "Users read own claims" on public.claims
  for select to authenticated using (user_id = auth.uid());
create policy "Active users create own claims" on public.claims
  for insert to authenticated with check (public.is_active_user() and user_id = auth.uid());

revoke select, insert, update on public.verification_requests from authenticated;
grant select (id, org_id, submitted_by, documents, status, decided_at, created_at, updated_at)
  on public.verification_requests to authenticated;
grant insert (org_id, submitted_by, documents) on public.verification_requests to authenticated;
create policy "Members read org verification requests" on public.verification_requests
  for select to authenticated using (submitted_by = auth.uid() or public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));
create policy "Owners submit verification requests" on public.verification_requests
  for insert to authenticated with check (
    public.is_active_user() and submitted_by = auth.uid() and public.is_org_member(org_id, array['owner', 'admin']::public.org_role[])
  );

-- Helper functions are callable only where needed.
revoke execute on function public.refresh_featured(text, uuid) from public, anon, authenticated;
revoke execute on function public.refresh_all_featured() from public, anon, authenticated;
revoke execute on function public.record_search_miss(text, text) from public, anon, authenticated;
revoke execute on function public.next_reference(text) from public, anon, authenticated;
revoke execute on function public.increment_view(text, uuid) from public, anon, authenticated;
revoke execute on function public.setting_int(text, int) from public, anon;
