-- 0038 · Supply Phase 5 (docs/HAGERLAND_SUPPLY_INTELLIGENCE_BLUEPRINT.md): insights and reports. Insights are worked
-- out by the server from existing tables; the only new data is the delivery date a supplier promised for an order.
--   - supply_orders gains promised_delivery_on and promised_change_reason (both empty for every existing order).
--   - The order guard and timeline functions are replaced with the same rules as 0037, plus: the promised date cannot
--     change once an order is delivered, completed or cancelled, and every change is written to the timeline.
--   - One index for partner performance (supplier lines by partner).
-- Additive: no existing row is changed, nothing is dropped. Safe to run again.

alter table public.supply_orders add column if not exists promised_delivery_on date;
alter table public.supply_orders add column if not exists promised_change_reason text check (char_length(promised_change_reason) <= 500);

-- Partner performance reads every supplier line of a partner (thousands of lines across all quotes).
create index if not exists supply_quote_lines_org_idx on public.supply_quote_lines (org_id, status);

-- Same as 0037, plus the promised-date rule (marked "0038").
create or replace function public.supply_orders_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total bigint;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'A new order starts as a draft' using errcode = '23514';
    end if;
    new.status_changed_at := now();
    return new;
  end if;
  if old.status <> 'draft' and (new.money_model, new.org_id, new.quote_request_id, new.agreement_id, new.commission_rate_bps, new.customer_delivery_charge_cents, new.supplier_delivery_charge_cents)
      is distinct from (old.money_model, old.org_id, old.quote_request_id, old.agreement_id, old.commission_rate_bps, old.customer_delivery_charge_cents, old.supplier_delivery_charge_cents) then
    raise exception 'Only a draft order can be changed' using errcode = '23514';
  end if;
  -- 0038: the promised delivery date is fixed once the order is delivered, completed or cancelled.
  if new.promised_delivery_on is distinct from old.promised_delivery_on and old.status in ('delivered', 'completed', 'cancelled') then
    raise exception 'The promised delivery date cannot change once the order is delivered, completed or cancelled' using errcode = '23514';
  end if;
  if new.status is distinct from old.status then
    if not public.supply_order_transition_allowed(new.money_model, old.status, new.status) then
      raise exception 'An order cannot go from % to %', old.status, new.status using errcode = '23514';
    end if;
    if new.status in ('cancelled', 'disputed') and coalesce(btrim(new.status_reason), '') = '' then
      raise exception 'Give a reason to % an order', case new.status when 'cancelled' then 'cancel' else 'dispute' end using errcode = '23514';
    end if;
    if new.money_model = 'A' and new.status in ('paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed') then
      total := public.supply_order_customer_total_cents(new.id);
      if total <= 0 or public.supply_order_paid_cents(new.id) < total then
        raise exception 'The customer has not paid this order in full yet' using errcode = '23514';
      end if;
    end if;
    if new.status = 'completed' and not exists (select 1 from public.supply_delivery_proofs p where p.order_id = new.id and p.removed_at is null) then
      raise exception 'Add delivery proof before completing the order' using errcode = '23514';
    end if;
    new.status_changed_at := now();
    if new.status = 'placed' then new.placed_at := now(); end if;
    if new.status = 'delivered' and old.status <> 'disputed' then new.delivered_at := now(); end if;
    if new.status = 'completed' then new.completed_at := now(); end if;
    if new.status = 'cancelled' then new.cancelled_at := now(); end if;
  end if;
  return new;
end
$$;

-- Same as 0037, plus a timeline entry for every promised-date change (old and new date, and the reason).
create or replace function public.supply_orders_timeline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.supply_order_events (order_id, event_type, to_status, actor) values (new.id, 'created', new.status, new.created_by);
  else
    if new.status is distinct from old.status then
      insert into public.supply_order_events (order_id, event_type, from_status, to_status, reason, actor)
      values (new.id, 'status', old.status, new.status, new.status_reason, new.updated_by);
    end if;
    if new.promised_delivery_on is distinct from old.promised_delivery_on then
      insert into public.supply_order_events (order_id, event_type, reason, detail, actor)
      values (new.id, 'promised_date', new.promised_change_reason, jsonb_build_object('from', old.promised_delivery_on, 'to', new.promised_delivery_on), new.updated_by);
    end if;
  end if;
  return null;
end
$$;

revoke all on function public.supply_orders_guard(), public.supply_orders_timeline() from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0038', 'supply_insights') on conflict (version) do nothing;
