-- 0001 · Extensions, enums and shared helper functions for the HagerLand relaunch.
-- Additive only: creates new types and functions; touches no existing table.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Enums (spec 6.2)
create type public.account_type as enum ('personal', 'business');
create type public.org_kind as enum ('agency', 'developer', 'supplier', 'manufacturer', 'contractor', 'professional_firm', 'sole_trader', 'hagerland');
create type public.org_role as enum ('owner', 'admin', 'member');
create type public.verification_level as enum ('listed', 'claimed', 'verified');
create type public.listing_status as enum ('draft', 'pending_review', 'published', 'paused', 'expired', 'rejected', 'archived', 'removed');
create type public.listing_purpose as enum ('sale', 'rent');
create type public.property_type as enum ('apartment', 'condominium', 'house', 'villa', 'townhouse', 'g_plus_building', 'room', 'studio', 'land', 'commercial_building', 'office', 'shop', 'warehouse', 'hotel', 'mixed_use', 'other');
create type public.finishing_status as enum ('shell', 'semi_finished', 'fully_finished', 'not_applicable');
create type public.furnishing as enum ('unfurnished', 'semi_furnished', 'furnished');
create type public.tenure as enum ('leasehold', 'freehold_private', 'condominium_title', 'cooperative', 'unknown');
create type public.completion_status as enum ('off_plan', 'under_construction', 'ready');
create type public.development_kind as enum ('development', 'condominium_site', 'building', 'compound', 'mixed_use_project');
create type public.price_type as enum ('fixed', 'from', 'on_request');
create type public.stock_status as enum ('in_stock', 'low_stock', 'out_of_stock', 'made_to_order', 'available_on_request');
create type public.enquiry_status as enum ('new', 'contacted', 'qualified', 'won', 'lost', 'spam');
create type public.quote_status as enum ('submitted', 'in_review', 'quoted', 'accepted', 'declined', 'expired', 'cancelled');
create type public.location_level as enum ('region', 'city', 'sub_city', 'area');

-- Immutable unaccent wrapper so it can be used in generated search columns and indexes.
create function public.f_unaccent(text)
returns text
language sql immutable parallel safe strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- 8-character base36 identifier used in public URLs (e.g. k7f2q9ab).
create function public.gen_short_id()
returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789abcdefghijklmnopqrstuvwxyz';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
  i int;
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes, i) % 36) + 1, 1);
  end loop;
  return result;
end
$$;

-- True when the current request is an end user (PostgREST anon/authenticated role).
-- The service role, the SQL editor (postgres) and SECURITY DEFINER functions are privileged.
create function public.is_end_user()
returns boolean
language sql stable
set search_path = ''
as $$ select current_user in ('anon', 'authenticated') $$;

-- Keeps updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Guards moderation-protected columns (spec 6.1).
-- TG_ARGV[0]: JSON array of column names only the service role may change.
-- TG_ARGV[1]: JSON object of values forced on INSERT by end users.
-- TG_ARGV[2]: 'status' when the table has a listing_status column owners may move only
--             between draft, pending_review, paused and archived.
create function public.protect_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  protected_cols jsonb := coalesce(tg_argv[0], '[]')::jsonb;
  insert_defaults jsonb := coalesce(tg_argv[1], '{}')::jsonb;
  has_status boolean := coalesce(tg_argv[2], '') = 'status';
  old_row jsonb;
  new_row jsonb;
  col text;
begin
  if not public.is_end_user() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new := jsonb_populate_record(new, insert_defaults);
    if has_status and (to_jsonb(new) ->> 'status') not in ('draft', 'pending_review') then
      raise exception 'New records can only be created as draft or pending review' using errcode = '42501';
    end if;
    return new;
  end if;

  old_row := to_jsonb(old);
  new_row := to_jsonb(new);
  for col in select jsonb_array_elements_text(protected_cols) loop
    if (old_row -> col) is distinct from (new_row -> col) then
      raise exception 'Column % can only be changed by HagerLand', col using errcode = '42501';
    end if;
  end loop;

  -- Live records stay as approved: owners propose edits through pending_changes, or pause/archive.
  if has_status and (old_row ->> 'status') = 'published'
     and (old_row - 'pending_changes' - 'status' - 'updated_at' - 'search_tsv')
         is distinct from (new_row - 'pending_changes' - 'status' - 'updated_at' - 'search_tsv') then
    raise exception 'Published records are edited through pending changes' using errcode = '42501';
  end if;

  if has_status and (old_row ->> 'status') is distinct from (new_row ->> 'status') then
    if (old_row ->> 'status') = 'removed' then
      raise exception 'This record was removed by HagerLand and cannot be changed' using errcode = '42501';
    end if;
    if (new_row ->> 'status') not in ('draft', 'pending_review', 'paused', 'archived') then
      raise exception 'Status % can only be set by HagerLand', new_row ->> 'status' using errcode = '42501';
    end if;
  end if;

  return new;
end
$$;
