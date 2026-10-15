-- 0012 · New values for existing lists (spec 24.4, 24.8). Additive only.
-- Postgres only lets a new list value be used after the statement that adds it has been committed,
-- so these live in their own migration and are used from 0013 onwards.

alter type public.location_level add value if not exists 'country' before 'region';
alter type public.org_kind add value if not exists 'lender';
alter type public.org_kind add value if not exists 'insurer';
alter type public.org_kind add value if not exists 'broker';

insert into public.schema_migrations (version, name) values ('0012', 'enum_values') on conflict (version) do nothing;
