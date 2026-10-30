-- 0053 · QC-2 seller-ready (AB's LR-1 decisions, 30 Oct 2026).
--   - supply_payment_methods: the owner's list of ways customers pay HagerLand (telebirr, CBE Birr, …). Name and
--     instructions are typed by the owner in admin; nothing is seeded. "Remove" means active = false (no deletes).
--   - data_transfer_consents: proof that a person ticked "I agree that HagerLand stores my details on secure servers
--     outside Ethiopia …" (consent version w17-2026-10) for a saved form or an account. It holds NO personal data:
--     only the form, the table and id or reference of the saved record, the version and the time.
--   - order_request_payments.receipt_number: the official receipt number (issued outside the website) for a payment,
--     entered when the payment is recorded. Payments stay append-only (unchanged trigger), so a receipt number added
--     or corrected later is a new row in order_request_payment_receipts (append-only too); the latest one counts.
-- Additive only: three new tables, one new nullable column with a check, indexes and the existing append-only and
-- updated-at trigger functions attached to the new tables. No existing table, column, function, trigger, policy, grant
-- or row is changed; no switch changes; no legacy table (including the old site's "jobs") is touched. Row level
-- security is on for the new tables and nobody but the service role (the website's server) can reach them.
-- Safe to run again.
begin;

create table if not exists public.supply_payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  instructions text not null check (char_length(instructions) between 1 and 1000),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text check (char_length(created_by) <= 120)
);
create index if not exists supply_payment_methods_active_idx on public.supply_payment_methods (active, sort_order);
create or replace trigger set_updated_at before update on public.supply_payment_methods for each row execute function public.set_updated_at();

create table if not exists public.data_transfer_consents (
  id uuid primary key default gen_random_uuid(),
  form text not null check (char_length(form) between 1 and 60),
  subject_table text not null check (char_length(subject_table) between 1 and 60),
  subject_id uuid,
  subject_reference text check (char_length(subject_reference) <= 60),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  created_at timestamptz not null default now()
);
create index if not exists data_transfer_consents_subject_idx on public.data_transfer_consents (subject_table, subject_id);

alter table public.order_request_payments add column if not exists receipt_number text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_request_payments_receipt_number_check') then
    alter table public.order_request_payments add constraint order_request_payments_receipt_number_check
      check (receipt_number is null or char_length(receipt_number) between 1 and 64);
  end if;
end
$$;

create table if not exists public.order_request_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.order_request_payments (id),
  receipt_number text not null check (char_length(receipt_number) between 1 and 64),
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists order_request_payment_receipts_payment_idx on public.order_request_payment_receipts (payment_id, created_at);
create or replace trigger order_request_payment_receipts_append_only before update or delete on public.order_request_payment_receipts
  for each row execute function public.supply_append_only();
create or replace trigger order_request_payment_receipts_no_truncate before truncate on public.order_request_payment_receipts
  for each statement execute function public.supply_append_only();

alter table public.supply_payment_methods enable row level security;
alter table public.data_transfer_consents enable row level security;
alter table public.order_request_payment_receipts enable row level security;
revoke all on table public.supply_payment_methods, public.data_transfer_consents, public.order_request_payment_receipts from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0053', 'qc2_seller_ready') on conflict (version) do nothing;

commit;
