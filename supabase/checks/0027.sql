-- expect: 10|3|live|coming_soon|0027
select (select count(*) from public.pillars), (select count(*) from public.pillar_services), (select status from public.verticals where key = 'jobs'), (select status from public.verticals where key = 'finance'), (select version from public.schema_migrations where version = '0027');
