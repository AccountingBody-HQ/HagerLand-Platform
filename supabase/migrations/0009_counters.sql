-- 0009 · Atomic enquiry counter (server use only). Additive.

create function public.increment_enquiries(p_entity_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  case p_entity_type
    when 'property' then update public.properties set enquiries_count = enquiries_count + 1 where id = p_id;
    when 'development' then update public.developments set enquiries_count = enquiries_count + 1 where id = p_id;
    when 'organisation' then update public.organisations set enquiries_count = enquiries_count + 1 where id = p_id;
    else null;
  end case;
end
$$;

revoke execute on function public.increment_enquiries(text, uuid) from public, anon, authenticated;
