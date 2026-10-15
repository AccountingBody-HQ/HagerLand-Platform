-- 0008 · Helper for sign-up: find existing organisations with a similar name nearby,
-- so a business can claim its listing instead of creating a duplicate (spec 7.2).
-- Read-only; returns only public-safe fields of published organisations.

create function public.find_similar_organisations(p_name text, p_location_id uuid default null, p_limit int default 5)
returns jsonb
language sql stable
security definer
set search_path = public, extensions
as $$
  with target as (
    select split_part(l.path, '/', 1) as root from public.locations l where l.id = p_location_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'name', x.name, 'slug', x.slug, 'location_display', x.location_display,
      'verification_level', x.verification_level, 'has_members', x.has_members) order by x.score desc), '[]'::jsonb)
  from (
    select o.*, similarity(o.name, p_name) as score
    from public.organisations_public o
    left join public.locations l on l.id = o.location_id
    where similarity(o.name, p_name) > 0.45
      and not o.is_hagerland
      and (p_location_id is null or o.location_id is null
           or split_part(l.path, '/', 1) = (select root from target))
    order by score desc
    limit greatest(1, least(coalesce(p_limit, 5), 10))
  ) x
$$;

grant execute on function public.find_similar_organisations(text, uuid, int) to authenticated;
