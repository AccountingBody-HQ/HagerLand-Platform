-- 0029 · Manage Property: the owner portal (spec 26.7) and HagerLand's own repair team (spec 26.8).
-- Additive only: two new staff-only tables and one new organisation row ("HagerLand Services") with its repair
-- services. Owners read their own records through server pages that check the linked owner account.

-- Documents HagerLand shares with the owner of a managed property (private files, 10-minute links).
create table public.managed_property_documents (
  id uuid primary key default gen_random_uuid(),
  managed_property_id uuid not null references public.managed_properties (id) on delete cascade,
  label text not null check (char_length(label) between 2 and 160),
  storage_path text not null,
  visible_to_owner boolean not null default true,
  uploaded_by text not null default 'admin' check (char_length(uploaded_by) <= 80),
  created_at timestamptz not null default now()
);
create index managed_property_documents_property_idx on public.managed_property_documents (managed_property_id, created_at desc);

-- Messages between the owner and HagerLand about a managed property.
create table public.owner_messages (
  id uuid primary key default gen_random_uuid(),
  managed_property_id uuid not null references public.managed_properties (id) on delete cascade,
  sender text not null check (sender in ('owner', 'hagerland')),
  sender_name text not null check (char_length(sender_name) between 1 and 120),
  body text not null check (char_length(body) between 1 and 4000),
  read_by_staff_at timestamptz,
  read_by_owner_at timestamptz,
  created_at timestamptz not null default now()
);
create index owner_messages_property_idx on public.owner_messages (managed_property_id, created_at);
create index owner_messages_unread_idx on public.owner_messages (created_at) where sender = 'owner' and read_by_staff_at is null;

alter table public.managed_property_documents enable row level security;
alter table public.owner_messages enable row level security;
revoke all on table public.managed_property_documents, public.owner_messages from public, anon, authenticated;

-- HagerLand's own repair and maintenance team, so admin can assign a request to HagerLand as well as, or instead of,
-- third-party providers (Repair & Maintain Direct mode). Labelled as HagerLand like Supply and Developments.
insert into public.organisations (kind, name, slug, tagline, description, verification_level, verified_at, is_hagerland, status, source, published_at)
values ('hagerland', 'HagerLand Services', 'hagerland-services', 'Repairs and maintenance by HagerLand',
        'HagerLand''s own team for repairs, maintenance and Property Care work. Requests are coordinated by HagerLand.',
        'verified', now(), true, 'published', 'admin', now())
on conflict (slug) do nothing;
insert into public.organisation_services (org_id, service_id)
select o.id, c.id
from public.organisations o
join public.service_categories c on c.vertical_key = 'repairs-maintenance' and c.parent_id is not null
where o.slug = 'hagerland-services'
on conflict do nothing;

insert into public.schema_migrations (version, name) values ('0029', 'owner_portal') on conflict (version) do nothing;
