-- 0019 · Jobs & Recruitment (spec 24.9) and development progress updates (spec 25.2j). Additive only.
-- The jobs vertical starts "coming soon": nothing here is public until AB switches it live.
-- The table is called job_posts because the live database still holds the old site's legacy table "jobs", which stays untouched.

-- ---------------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------------
create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  short_id text not null unique default public.gen_short_id(),
  slug text not null unique,
  employer_org_id uuid not null references public.organisations (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  category text not null check (char_length(category) between 2 and 60),
  employment_type text not null check (employment_type in ('full_time', 'part_time', 'contract', 'temporary', 'internship', 'apprenticeship')),
  location_id uuid references public.locations (id),
  country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  salary_min_minor bigint check (salary_min_minor >= 0),
  salary_max_minor bigint check (salary_max_minor >= 0),
  salary_period text check (salary_period in ('hour', 'day', 'month', 'year')),
  description text not null check (char_length(description) between 30 and 8000),
  requirements text check (char_length(requirements) <= 4000),
  closing_date date,
  status public.listing_status not null default 'draft',
  rejection_reason text,
  published_at timestamptz,
  expires_at timestamptz,
  views_count int not null default 0,
  applications_count int not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(category, ''))), 'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(description, '') || ' ' || coalesce(requirements, ''))), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_salary_range check (salary_min_minor is null or salary_max_minor is null or salary_max_minor >= salary_min_minor)
);
create index job_posts_status_idx on public.job_posts (status, published_at desc);
create index job_posts_employer_idx on public.job_posts (employer_org_id);
create index job_posts_location_idx on public.job_posts (location_id);
create index job_posts_country_idx on public.job_posts (country_code);
create index job_posts_search_idx on public.job_posts using gin (search_tsv);
create trigger set_updated_at before update on public.job_posts for each row execute function public.set_updated_at();

-- Country and currency follow the job's location; publishing sets the expiry (closing date, else 60 days).
create function public.jobs_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.location_id is not null then
    select country_code into new.country_code from public.locations where id = new.location_id;
  end if;
  if tg_op = 'INSERT' or new.country_code is distinct from old.country_code then
    new.currency := public.country_currency(new.country_code);
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
    new.expires_at := coalesce((new.closing_date + 1)::timestamptz, now() + interval '60 days');
  end if;
  return new;
end
$$;
create trigger jobs_before_write before insert or update on public.job_posts for each row execute function public.jobs_before_write();
create trigger protect_privileged_columns before insert or update on public.job_posts
  for each row execute function public.protect_privileged_columns(
    '["published_at","expires_at","rejection_reason","views_count","applications_count","short_id","employer_org_id","created_by"]',
    '{"published_at":null,"expires_at":null,"rejection_reason":null,"views_count":0,"applications_count":0}',
    'status');

create view public.jobs_public with (security_barrier = true) as
select j.id, j.short_id, j.slug, j.employer_org_id, o.name as employer_name, o.slug as employer_slug, o.logo_path as employer_logo_path,
       o.verification_level as employer_verification, j.title, j.category, j.employment_type, j.location_id, l.display_name as location_display,
       j.country_code, j.currency, j.salary_min_minor, j.salary_max_minor, j.salary_period, j.description, j.requirements, j.closing_date,
       j.published_at, j.expires_at, j.updated_at, j.search_tsv
from public.job_posts j
join public.organisations o on o.id = j.employer_org_id and o.status = 'published'
left join public.locations l on l.id = j.location_id
where j.status = 'published' and (j.expires_at is null or j.expires_at > now());
comment on view public.jobs_public is
  'Bypasses RLS on purpose (owned by postgres): only published, open jobs of published employers. The website shows it only while the jobs vertical is live.';

-- ---------------------------------------------------------------------------
-- Applications and candidate profiles (private: CVs are never public)
-- ---------------------------------------------------------------------------
create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLA'),
  job_id uuid not null references public.job_posts (id) on delete cascade,
  applicant_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 32),
  cover_note text check (char_length(cover_note) <= 3000),
  cv_path text,
  status text not null default 'submitted' check (status in ('submitted', 'viewed', 'shortlisted', 'rejected', 'hired', 'withdrawn')),
  employer_notes text check (char_length(employer_notes) <= 2000),
  cv_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, applicant_user_id)
);
create index job_applications_job_idx on public.job_applications (job_id, created_at desc);
create index job_applications_applicant_idx on public.job_applications (applicant_user_id);
create trigger set_updated_at before update on public.job_applications for each row execute function public.set_updated_at();

create table public.candidate_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  headline text check (char_length(headline) <= 160),
  skills text[] not null default '{}' check (cardinality(skills) <= 30),
  qualifications text check (char_length(qualifications) <= 2000),
  experience_years int check (experience_years between 0 and 60),
  experience text check (char_length(experience) <= 4000),
  availability text not null default 'within_month' check (availability in ('immediately', 'within_month', 'not_looking')),
  country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  location_id uuid references public.locations (id),
  cv_path text,
  visibility text not null default 'private' check (visibility in ('private', 'employers')),
  placement_wanted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.candidate_profiles for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Development progress updates (spec 25.2j)
-- ---------------------------------------------------------------------------
create table public.development_updates (
  id uuid primary key default gen_random_uuid(),
  development_id uuid not null references public.developments (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 160),
  body text not null check (char_length(body) between 10 and 4000),
  happened_on date not null,
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 12),
  status public.listing_status not null default 'pending_review',
  rejection_reason text,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index development_updates_dev_idx on public.development_updates (development_id, happened_on desc);
create trigger set_updated_at before update on public.development_updates for each row execute function public.set_updated_at();
create trigger protect_privileged_columns before insert or update on public.development_updates
  for each row execute function public.protect_privileged_columns('["rejection_reason","development_id","created_by"]', '{"rejection_reason":null}', 'status');

create view public.development_updates_public with (security_barrier = true) as
select u.id, u.development_id, u.title, u.body, u.happened_on, u.photo_paths, u.updated_at
from public.development_updates u
join public.developments d on d.id = u.development_id and d.status = 'published'
where u.status = 'published';
comment on view public.development_updates_public is
  'Bypasses RLS on purpose (owned by postgres): published progress updates of published developments.';

-- Recruitment help for employers ("Submit a staffing requirement", spec 24.9) uses the request engine.
insert into public.service_categories (name, slug, description, icon, sort, vertical_key, is_active)
values ('Recruitment', 'recruitment', 'Help finding staff for construction, engineering and property roles.', 'briefcase', 90, 'jobs', true)
on conflict (slug) do nothing;
insert into public.service_categories (parent_id, slug, name, sort, vertical_key, question_schema, icon, is_active)
select p.id, 'staffing', 'Staffing requirement', 10, 'jobs',
  '[{"id":"roles","label":"Which roles do you need to fill?","type":"textarea","required":true},{"id":"headcount","label":"How many people?","type":"number","required":true},{"id":"contract","label":"Type of contract","type":"select","options":["Permanent","Fixed-term contract","Temporary or day labour","Not sure"],"required":true},{"id":"start","label":"When should they start?","type":"date"},{"id":"international","label":"Are you hiring from abroad or placing people abroad?","type":"yesno"}]'::jsonb,
  'users', true
from public.service_categories p where p.slug = 'recruitment' and p.parent_id is null
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.job_posts enable row level security;
alter table public.job_applications enable row level security;
alter table public.candidate_profiles enable row level security;
alter table public.development_updates enable row level security;
revoke all on table public.job_posts, public.job_applications, public.candidate_profiles, public.development_updates from public, anon, authenticated;

-- Employers (members of the posting organisation) manage their jobs; nobody deletes (archive instead).
grant select, insert, update on public.job_posts to authenticated;
create policy "Members read their organisation's jobs" on public.job_posts for select to authenticated using (public.is_org_member(employer_org_id));
create policy "Members post jobs" on public.job_posts for insert to authenticated with check (public.is_active_user() and public.is_org_member(employer_org_id));
create policy "Members edit their organisation's jobs" on public.job_posts for update to authenticated using (public.is_org_member(employer_org_id)) with check (public.is_active_user() and public.is_org_member(employer_org_id));

-- Applicants read their own applications; employers read applications to their jobs and set status and notes.
-- Inserts happen on the server after checks (CV ownership, the job is open).
grant select on public.job_applications to authenticated;
grant update (status, employer_notes) on public.job_applications to authenticated;
create policy "Applicants read own applications" on public.job_applications for select to authenticated using (applicant_user_id = auth.uid());
create policy "Employers read applications to their jobs" on public.job_applications for select to authenticated using (
  exists (select 1 from public.job_posts j where j.id = job_id and public.is_org_member(j.employer_org_id))
);
create policy "Employers update applications to their jobs" on public.job_applications for update to authenticated
  using (exists (select 1 from public.job_posts j where j.id = job_id and public.is_org_member(j.employer_org_id)))
  with check (public.is_active_user() and exists (select 1 from public.job_posts j where j.id = job_id and public.is_org_member(j.employer_org_id)));

-- Candidates own their profile; it is private unless they choose "visible to employers".
grant select, insert, update, delete on public.candidate_profiles to authenticated;
create policy "Candidates read own profile" on public.candidate_profiles for select to authenticated using (user_id = auth.uid());
create policy "Candidates create own profile" on public.candidate_profiles for insert to authenticated with check (user_id = auth.uid() and public.is_active_user());
create policy "Candidates update own profile" on public.candidate_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_active_user());
create policy "Candidates delete own profile" on public.candidate_profiles for delete to authenticated using (user_id = auth.uid());

-- What employers see of opted-in candidates: no contact details and no CV (they contact them through HagerLand).
create view public.candidates_for_employers with (security_barrier = true) as
select c.user_id as candidate_id, split_part(c.full_name, ' ', 1) as first_name, c.headline, c.skills, c.qualifications, c.experience_years,
       c.experience, c.availability, c.country_code, l.display_name as location_display, c.placement_wanted, c.updated_at
from public.candidate_profiles c
left join public.locations l on l.id = c.location_id
where c.visibility = 'employers' and c.availability <> 'not_looking'
  and exists (
    select 1 from public.organisation_members m join public.organisations o on o.id = m.org_id
    where m.user_id = auth.uid() and o.status = 'published'
  );
comment on view public.candidates_for_employers is
  'Bypasses RLS on purpose (owned by postgres): only signed-in members of published organisations see candidates who chose to be visible, without contact details or CVs.';

-- Developers post progress updates for their developments (reviewed before publishing).
grant select, insert, update on public.development_updates to authenticated;
create policy "Members read their development updates" on public.development_updates for select to authenticated using (
  exists (select 1 from public.developments d where d.id = development_id and public.is_org_member(d.developer_org_id))
);
create policy "Members post development updates" on public.development_updates for insert to authenticated with check (
  public.is_active_user() and exists (select 1 from public.developments d where d.id = development_id and public.is_org_member(d.developer_org_id))
);
create policy "Members edit development updates" on public.development_updates for update to authenticated
  using (exists (select 1 from public.developments d where d.id = development_id and public.is_org_member(d.developer_org_id)))
  with check (public.is_active_user() and exists (select 1 from public.developments d where d.id = development_id and public.is_org_member(d.developer_org_id)));

-- Public views are read-only.
revoke all on public.jobs_public, public.development_updates_public, public.candidates_for_employers from public, anon, authenticated;
grant select on public.jobs_public, public.development_updates_public to anon, authenticated;
grant select on public.candidates_for_employers to authenticated;

insert into public.schema_migrations (version, name) values ('0019', 'jobs') on conflict (version) do nothing;
