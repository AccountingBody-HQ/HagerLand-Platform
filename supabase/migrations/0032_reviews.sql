-- 0032 · Verified reviews (spec 26.12): only from a customer whose service request reached "won" with that provider
-- (the job HagerLand matched and the customer chose), one per job, moderated before publishing, one provider reply.
-- Never imported or invented. Additive only.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  request_id uuid not null references public.service_requests (id) on delete cascade,
  -- One review per job: the winning match of a request.
  match_id uuid not null unique references public.service_request_matches (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 120),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  rejection_reason text check (char_length(rejection_reason) <= 300),
  moderated_at timestamptz,
  published_at timestamptz,
  provider_reply text check (char_length(provider_reply) between 2 and 1000),
  replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_org_idx on public.reviews (org_id, status, published_at desc);
create index reviews_status_idx on public.reviews (status, created_at);
create trigger set_updated_at before update on public.reviews for each row execute function public.set_updated_at();

-- A review can only exist for a match the customer chose (status won), and only once the provider was chosen.
create function public.reviews_check_eligible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.service_request_matches m
    join public.service_requests r on r.id = m.request_id
    where m.id = new.match_id and m.request_id = new.request_id and m.org_id = new.org_id and m.status = 'won' and r.status = 'won'
  ) then
    raise exception 'Reviews are only for jobs the customer chose this provider for' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger reviews_check_eligible before insert on public.reviews for each row execute function public.reviews_check_eligible();

-- The provider may reply once; the reply cannot be changed afterwards (spec 26.12).
create function public.reviews_reply_once()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.provider_reply is not null and new.provider_reply is distinct from old.provider_reply then
    raise exception 'The provider has already replied to this review' using errcode = '42501';
  end if;
  return new;
end
$$;
create trigger reviews_reply_once before update on public.reviews for each row execute function public.reviews_reply_once();

alter table public.reviews enable row level security;
revoke all on table public.reviews from public, anon, authenticated;

-- Public: published reviews only, with the author's first name.
create view public.reviews_public with (security_barrier = true) as
select r.id, r.org_id, split_part(r.author_name, ' ', 1) as author_first_name, r.rating, r.body, r.published_at, r.provider_reply, r.replied_at
from public.reviews r
join public.organisations o on o.id = r.org_id and o.status = 'published'
where r.status = 'published';
comment on view public.reviews_public is 'Bypasses RLS on purpose (owned by postgres): published reviews of published businesses, first names only.';
revoke all on public.reviews_public from public, anon, authenticated;
grant select on public.reviews_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0032', 'reviews') on conflict (version) do nothing;
