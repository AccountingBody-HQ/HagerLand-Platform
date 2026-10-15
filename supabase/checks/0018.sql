-- expect: 11|10
select (select count(*) from public.service_categories where vertical_key = 'finance' and parent_id is not null), (select count(*) from public.service_categories where vertical_key = 'insurance' and parent_id is not null);
