-- 0046 · Fix F-3 (audit B-01): choosing a quote is all or nothing, and a request can never get two deals.
--   - public.choose_service_request_quote(): the customer's "Yes, choose" in one transaction. It locks the request,
--     checks the chooser (the signed-in requester, or a valid private link), checks the request (matched or quoted)
--     and the quote (quoted, not expired, on this request), then makes exactly the writes the website made before:
--       1. the chosen match → won
--       2. the request's other offered, accepted or quoted matches → lost
--       3. the request → won, closed_at now, closed_reason completed
--       4. one deal (source service_request, the match, its provider, value and fees copied from the match, won)
--     It answers chosen, already_chosen (the same quote again, e.g. a double tap: no writes) or not_allowed (a reason).
--     Service role only: the website checks the chooser first and then calls it.
--   - deals_service_request_choice_key: at most one deal per service request made from a chosen quote (source
--     service_request with a match). Deals staff add by hand (no match) and agency, Supply and other deals are not
--     covered, so nothing they do today can be refused.
-- Additive: one new function and one new index. No table, column, policy, trigger, view or row is changed; row
-- level security and grants on existing tables are unchanged; no legacy table (including the old site's "jobs") is
-- touched. Stops with a clear message (and changes nothing) if duplicate deals already exist. Safe to run again.
begin;

do $$
begin
  if exists (
    select 1 from public.deals
    where source_type = 'service_request' and match_id is not null
    group by source_id having count(*) > 1
  ) then
    raise exception '0046 stopped: some service requests already have more than one deal from a chosen quote. Nothing was changed.';
  end if;
end
$$;

create unique index if not exists deals_service_request_choice_key on public.deals (source_id)
  where source_type = 'service_request' and match_id is not null;

create or replace function public.choose_service_request_quote(
  p_request_id uuid,
  p_match_id uuid,
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
  m public.service_request_matches%rowtype;
  v_now timestamptz := now();
  v_deal uuid;
begin
  select * into r from public.service_requests where id = p_request_id for update;
  if not found then
    return jsonb_build_object('outcome', 'not_allowed', 'reason', 'not_owner');
  end if;
  -- The chooser: the signed-in requester, or a private link that matches and has not expired. (coalesce: a request
  -- without an account or without a link compares as NULL, which must count as "no".)
  if not coalesce(
    (p_actor_user_id is not null and r.requester_user_id = p_actor_user_id)
    or (p_token_hash is not null and r.access_token_hash = p_token_hash and r.access_token_expires_at > v_now),
    false
  ) then
    return jsonb_build_object('outcome', 'not_allowed', 'reason', 'not_owner');
  end if;

  select * into m from public.service_request_matches where id = p_match_id and request_id = r.id for update;
  -- The same quote again (a double tap or a second tab): the first choice stands, nothing is written.
  if r.status = 'won' and found and m.status = 'won' then
    return jsonb_build_object('outcome', 'already_chosen', 'match_id', m.id, 'org_id', m.org_id);
  end if;
  if r.status not in ('matched', 'quoted') then
    return jsonb_build_object('outcome', 'not_allowed', 'reason', 'request_closed');
  end if;
  if not found or m.status <> 'quoted' then
    return jsonb_build_object('outcome', 'not_allowed', 'reason', 'quote_not_available');
  end if;
  -- As isQuoteExpired (lib/service-requests/labels.ts): expired once its last valid day (UTC) has passed.
  if m.quote_valid_until is not null and m.quote_valid_until < (v_now at time zone 'utc')::date then
    return jsonb_build_object('outcome', 'not_allowed', 'reason', 'quote_expired');
  end if;

  update public.service_request_matches set status = 'won' where id = m.id;
  update public.service_request_matches set status = 'lost'
    where request_id = r.id and id <> m.id and status in ('offered', 'accepted', 'quoted');
  update public.service_requests set status = 'won', closed_at = v_now, closed_reason = 'completed' where id = r.id;
  insert into public.deals (source_type, source_id, match_id, org_id, title, currency, value_minor, lead_fee_minor, commission_minor, status, closed_at)
  values ('service_request', r.id, m.id, m.org_id, left(r.reference || ': ' || r.title, 200), coalesce(m.quote_currency, 'ETB'),
    m.quote_amount_minor, m.lead_fee_minor, m.commission_minor, 'won', v_now)
  returning id into v_deal;

  return jsonb_build_object('outcome', 'chosen', 'match_id', m.id, 'org_id', m.org_id, 'deal_id', v_deal);
end
$$;

comment on function public.choose_service_request_quote(uuid, uuid, uuid, text) is
  'Fix F-3: the customer chooses one quote, all or nothing (match won, others lost, request won, one deal). Service role only.';
revoke all on function public.choose_service_request_quote(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.choose_service_request_quote(uuid, uuid, uuid, text) to service_role;

insert into public.schema_migrations (version, name) values ('0046', 'safe_quote_choice') on conflict (version) do nothing;

commit;
