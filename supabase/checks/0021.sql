-- expect: 3|0|0021
select (select count(*) from public.guides where needs_review and status = 'draft'), (select count(*) from public.build_cost_rates), (select version from public.schema_migrations where version = '0021');
