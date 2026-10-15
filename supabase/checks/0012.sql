-- expect: 4
select count(*) from pg_enum e join pg_type t on t.oid = e.enumtypid where (t.typname = 'location_level' and e.enumlabel = 'country') or (t.typname = 'org_kind' and e.enumlabel in ('lender', 'insurer', 'broker'));
