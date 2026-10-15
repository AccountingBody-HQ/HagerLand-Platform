-- 0030 · Build & Develop: "Start a building project" (spec 26.9). One project reference (HLP-YYYY-NNNNNN) links the
-- service requests and the optional materials quote it creates. Additive only: one new table and a nullable link
-- column on service_requests and quote_requests.

create table public.build_projects (
  id uuid primary key default gen_random_uuid(),
  -- Shares the HLP counter with partner applications, so every HLP number stays unique.
  reference text not null unique default public.next_reference('HLP'),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  location_id uuid references public.locations (id),
  location_text text check (char_length(location_text) <= 200),
  plot_size_m2 numeric(10, 2) check (plot_size_m2 > 0 and plot_size_m2 <= 10000000),
  floors smallint check (floors between 0 and 60),
  budget_band text not null check (budget_band in ('under_2m', '2m_5m', '5m_10m', '10m_25m', '25m_50m', 'over_50m', 'not_sure')),
  timeline text not null check (timeline in ('now', '3_months', '6_months', '12_months', 'later')),
  services text[] not null check (cardinality(services) between 1 and 5 and services <@ array['design', 'engineering', 'contractor', 'materials', 'finance']::text[]),
  details text check (char_length(details) <= 4000),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) <= 32),
  email text not null check (char_length(email) <= 254),
  country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  time_zone text check (char_length(time_zone) <= 60),
  preferred_times text check (char_length(preferred_times) <= 300),
  status text not null default 'submitted' check (status in ('submitted', 'in_progress', 'on_hold', 'closed')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index build_projects_user_idx on public.build_projects (user_id, created_at desc);
create index build_projects_status_idx on public.build_projects (status, created_at desc);
create trigger set_updated_at before update on public.build_projects for each row execute function public.set_updated_at();

alter table public.service_requests add column project_id uuid references public.build_projects (id) on delete set null;
create index service_requests_project_idx on public.service_requests (project_id) where project_id is not null;
alter table public.quote_requests add column project_id uuid references public.build_projects (id) on delete set null;
create index quote_requests_project_idx on public.quote_requests (project_id) where project_id is not null;

-- Staff only (service role). Customers see their own project through a server page that checks the signed-in
-- user, so staff notes are never exposed.
alter table public.build_projects enable row level security;
revoke all on table public.build_projects from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0030', 'build_projects') on conflict (version) do nothing;
