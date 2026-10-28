-- 0045 · Tidy T-2 (T2-9): the 12-month clearing of listing reports ("Report this listing", table reports).
--   - reports.handled_at: when staff dismissed or acted on a report. Set by the admin action from now on; reports
--     handled before 0045 keep it empty (the daily job reads their decision time from the audit log instead).
--   - reports.personal_data_deleted_at: when the daily job cleared the report's details, contact and coded internet
--     address (12 months after the later of the report and the decision; the reason and the decision are kept).
--   - An index for the daily job: reports not cleared yet, by date.
-- Additive: two new empty columns with no default and one index. No existing row is changed or filled in; row level
-- security and grants on reports are unchanged; no legacy table (including the old site's "jobs") is touched. Safe to
-- run again.
begin;

alter table public.reports add column if not exists handled_at timestamptz;
alter table public.reports add column if not exists personal_data_deleted_at timestamptz;
create index if not exists reports_cleanup_idx on public.reports (created_at) where personal_data_deleted_at is null;

insert into public.schema_migrations (version, name) values ('0045', 'tidy_t2') on conflict (version) do nothing;

commit;
