-- expect: 3|0|1
select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('service_requests', 'service_request_matches', 'deals')), (select count(*) from public.service_categories where vertical_key is null), (select count(*) from information_schema.views where table_schema = 'public' and table_name = 'service_requests_for_provider');
