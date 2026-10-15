-- Proof for cutover_legacy_lockdown.sql. Read-only: it acts as the public (anon) visitor inside a transaction that is
-- rolled back. Every row must say PASS: the public key cannot read any legacy table, no read policy is left,
-- and the data is still there for the service role (row counts unchanged; compare with the backup).
begin;
create function pg_temp.anon_reads(t text) returns text language plpgsql as $$
declare n bigint;
begin
  execute 'set local role anon';
  begin
    execute format('select count(*) from public.%I', t) into n;
  exception when insufficient_privilege then
    execute 'reset role';
    return 'PASS  anon cannot read ' || t;
  end;
  execute 'reset role';
  return case when n = 0 then 'PASS  anon reads 0 rows from ' || t else 'FAIL  anon reads ' || n || ' rows from ' || t end;
end $$;
select pg_temp.anon_reads(t) from unnest(array[
  'admin_audit', 'agent_log', 'business_claims', 'cars', 'claimed_profiles', 'claiming_requests', 'community', 'companies',
  'countries', 'delivery', 'directors', 'events', 'formation_agent_addresses', 'housing', 'import_log', 'jobs',
  'listing_enquiries', 'made_in_ethiopia', 'money', 'rate_limits', 'sole_traders', 'tutors']) as t;
select case when count(*) = 0 then 'PASS  no policies left on legacy tables' else 'FAIL  ' || count(*) || ' policies left on legacy tables' end
from pg_policies where schemaname = 'public' and tablename in (
  'admin_audit', 'agent_log', 'business_claims', 'cars', 'claimed_profiles', 'claiming_requests', 'community', 'companies',
  'countries', 'delivery', 'directors', 'events', 'formation_agent_addresses', 'housing', 'import_log', 'jobs',
  'listing_enquiries', 'made_in_ethiopia', 'money', 'rate_limits', 'sole_traders', 'tutors');
select 'INFO  ' || t || ' still holds ' || (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t), false, true, '')))[1]::text || ' rows'
from unnest(array['companies', 'housing', 'jobs', 'cars', 'events', 'tutors', 'community', 'money', 'import_log', 'rate_limits']) as t;
rollback;
