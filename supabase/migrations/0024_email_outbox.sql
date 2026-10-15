-- 0024 · Email outbox (spec 25.4): an email that fails to send never blocks what the visitor was doing.
-- It is kept here, shown to HagerLand in admin, and retried by the daily job. Server only. Additive only.

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_addresses text[] not null check (cardinality(to_addresses) between 1 and 50),
  subject text not null check (char_length(subject) <= 300),
  html text not null,
  text_body text not null,
  reply_to text,
  sender text not null default 'default' check (sender in ('default', 'supply')),
  headers jsonb not null default '{}' check (jsonb_typeof(headers) = 'object'),
  status text not null default 'failed' check (status in ('failed', 'sent', 'gave_up')),
  attempts int not null default 1,
  last_error text check (char_length(last_error) <= 500),
  next_attempt_at timestamptz not null default now() + interval '1 hour',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_outbox_retry_idx on public.email_outbox (status, next_attempt_at);

alter table public.email_outbox enable row level security;
revoke all on table public.email_outbox from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0024', 'email_outbox') on conflict (version) do nothing;
