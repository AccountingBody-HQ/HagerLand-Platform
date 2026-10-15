-- 0022 · Organisation teams (invitations, roles, ownership) and branches (spec 25.2i). Additive only.

-- ---------------------------------------------------------------------------
-- Invitations: an owner or admin invites someone by email; the link works for 7 days and only for that email.
-- Created, accepted and revoked on the server only.
-- ---------------------------------------------------------------------------
create table public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  role public.org_role not null default 'member' check (role in ('admin', 'member')),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index org_invitations_org_idx on public.org_invitations (org_id, created_at desc);
-- One open invitation per person per organisation.
create unique index org_invitations_open_idx on public.org_invitations (org_id, email) where accepted_at is null and revoked_at is null;

alter table public.org_invitations enable row level security;
revoke all on table public.org_invitations from public, anon, authenticated;
grant select (id, org_id, email, role, invited_by, expires_at, accepted_at, revoked_at, created_at) on public.org_invitations to authenticated;
create policy "Owners and admins see their invitations" on public.org_invitations for select to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));

-- ---------------------------------------------------------------------------
-- Every live organisation keeps at least one owner. Removing or demoting the last owner is refused,
-- except when the organisation is being deleted or is archived/removed, or the owner's account is being deleted.
-- ---------------------------------------------------------------------------
create function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'owner' or (tg_op = 'UPDATE' and new.role = 'owner') then
    return coalesce(new, old);
  end if;
  if not exists (select 1 from public.organisations where id = old.org_id and status not in ('archived', 'removed'))
     or not exists (select 1 from auth.users where id = old.user_id) then
    return coalesce(new, old);
  end if;
  if not exists (select 1 from public.organisation_members m where m.org_id = old.org_id and m.role = 'owner' and m.user_id <> old.user_id) then
    raise exception 'An organisation must keep at least one owner. Make someone else an owner first.' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end
$$;
create trigger protect_last_owner before update or delete on public.organisation_members
  for each row execute function public.protect_last_owner();

-- ---------------------------------------------------------------------------
-- Branches: offices of an agency or company, shown on its public profile.
-- ---------------------------------------------------------------------------
create table public.org_branches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  location_id uuid references public.locations (id),
  address_line text check (char_length(address_line) <= 200),
  phone text check (char_length(phone) <= 32),
  email text check (char_length(email) <= 254),
  opening_note text check (char_length(opening_note) <= 200),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index org_branches_org_idx on public.org_branches (org_id, sort);
create trigger set_updated_at before update on public.org_branches for each row execute function public.set_updated_at();

alter table public.org_branches enable row level security;
revoke all on table public.org_branches from public, anon, authenticated;
grant select, insert, update, delete on public.org_branches to authenticated;
create policy "Members read their branches" on public.org_branches for select to authenticated using (public.is_org_member(org_id));
create policy "Owners and admins add branches" on public.org_branches for insert to authenticated
  with check (public.is_active_user() and public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));
create policy "Owners and admins edit branches" on public.org_branches for update to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]))
  with check (public.is_active_user() and public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));
create policy "Owners and admins remove branches" on public.org_branches for delete to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']::public.org_role[]));

-- Public: branch names and places of published organisations. Phone and email stay private
-- (contact details are only revealed through the contact panel, spec 6.4).
create view public.org_branches_public with (security_barrier = true) as
select b.id, b.org_id, b.name, b.location_id, l.display_name as location_display, b.address_line, b.opening_note, b.sort
from public.org_branches b
join public.organisations o on o.id = b.org_id and o.status = 'published'
left join public.locations l on l.id = b.location_id;
comment on view public.org_branches_public is 'Bypasses RLS on purpose (owned by postgres): branch names and places of published organisations, without contact details.';
revoke all on public.org_branches_public from public, anon, authenticated;
grant select on public.org_branches_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0022', 'teams_branches') on conflict (version) do nothing;
