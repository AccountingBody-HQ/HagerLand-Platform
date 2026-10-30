-- 0052 · QC-1b: one-step service-request cancel, and a tidy of who may call trigger functions.
--   - public.service_request_cancel(): the customer's "Cancel request" in one transaction. It locks the request,
--     checks the customer (the signed-in requester, or a private link that matches and has not expired, as the
--     website's own check), checks the request is still open (submitted, triaged, matched or quoted), then makes
--     exactly the writes the website made before, in two separate calls:
--       1. the request → cancelled, closed_reason customer_cancelled, closed_at now
--       2. its offered, accepted or quoted matches → withdrawn
--     If either write fails, neither stays. It answers cancelled, not_allowed (not_owner or request_closed) or
--     not_found. Service role only: the website checks the customer first and then calls it.
--   - Trigger functions are run by their triggers, never called by anyone: execute is taken away from public, anon
--     and signed-in users on seven of them (their triggers keep firing; PostgreSQL does not check execute when a
--     trigger fires). property_unavailable is left out: it is not a trigger function but the public "no longer
--     available" lookup for listing pages.
-- Additive: one new function, then revoke and grant statements. No table, column, policy, trigger, view or row is
-- changed; no switch changes; no legacy table (including the old site's "jobs") is touched. Safe to run again.
begin;

create or replace function public.service_request_cancel(
  p_request_id uuid,
  p_actor_user_id uuid default null,
  p_token_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.service_requests%rowtype;
  v_now timestamptz := now();
begin
  select * into r from public.service_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('outcome', 'not_found');
  end if;
  -- The customer: the signed-in requester, or a private link that matches and has not expired. (coalesce: a request
  -- without an account or without a link compares as NULL, which must count as "no".)
  if not coalesce(
    (p_actor_user_id is not null and r.requester_user_id = p_actor_user_id)
    or (p_token_hash is not null and r.access_token_hash = p_token_hash and r.access_token_expires_at >= v_now),
    false
  ) then
    return jsonb_build_object('outcome', 'not_allowed', 'reason', 'not_owner');
  end if;
  if r.status not in ('submitted', 'triaged', 'matched', 'quoted') then
    return jsonb_build_object('outcome', 'not_allowed', 'reason', 'request_closed');
  end if;

  update public.service_requests set status = 'cancelled', closed_reason = 'customer_cancelled', closed_at = v_now where id = r.id;
  update public.service_request_matches set status = 'withdrawn'
    where request_id = r.id and status in ('offered', 'accepted', 'quoted');

  return jsonb_build_object('outcome', 'cancelled');
end
$$;

comment on function public.service_request_cancel(uuid, uuid, text) is
  'QC-1b: the customer cancels their request, all or nothing (request cancelled, open matches withdrawn). Service role only.';
revoke all on function public.service_request_cancel(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.service_request_cancel(uuid, uuid, text) to service_role;

revoke execute on function public.add_owner_on_org_insert(), public.agency_instruction_marks_listing(), public.create_profile_on_signup(),
  public.pillars_after_change(), public.protect_last_owner(), public.sync_featured_from_promotions(), public.reviews_check_eligible()
  from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0052', 'service_request_cancel') on conflict (version) do nothing;

commit;
