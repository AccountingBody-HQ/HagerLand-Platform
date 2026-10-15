-- 0033 · Staff accounts and roles (spec 26.15). Staff sign in with their own email, password and authenticator code
-- and see only the admin areas of their role. The /roodber8 master login stays as the owner's break-glass access.
-- Default: no staff. Additive only.

create table public.staff_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null check (char_length(email) <= 254),
  name text not null check (char_length(name) between 2 and 120),
  role text not null check (role in ('owner', 'agent', 'operations', 'content')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  -- Authenticator secret, encrypted by the server (AES-256-GCM); never readable by visitors or users.
  totp_secret_enc text,
  totp_enrolled_at timestamptz,
  invite_token_hash text,
  invite_expires_at timestamptz,
  invited_by text check (char_length(invited_by) <= 120),
  last_login_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_active_has_2fa check (status <> 'active' or (totp_enrolled_at is not null and totp_secret_enc is not null and user_id is not null))
);
create unique index staff_users_email_key on public.staff_users (lower(email));
create unique index staff_users_invite_key on public.staff_users (invite_token_hash) where invite_token_hash is not null;
create trigger set_updated_at before update on public.staff_users for each row execute function public.set_updated_at();

alter table public.staff_users enable row level security;
revoke all on table public.staff_users from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0033', 'staff') on conflict (version) do nothing;
