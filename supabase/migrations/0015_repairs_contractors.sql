-- 0015 · Repairs & maintenance and contractors on the request engine (spec 24.5, PLATFORM_VISION §4–6).
-- Additive only: a new service group, new service categories with their request questions, a
-- qualifications field on organisations (shown on profiles), and vertical links for three existing services.

insert into public.service_categories (name, slug, description, icon, sort, vertical_key, is_active)
values ('Repairs & maintenance', 'repairs-maintenance', 'Repairs, servicing and upkeep for homes and buildings, including emergencies.', 'wrench', 15, 'repairs-maintenance', true)
on conflict (slug) do nothing;

insert into public.service_categories (parent_id, slug, name, sort, vertical_key, allows_emergency, question_schema, icon, is_active)
select p.id, c.slug, c.name, c.sort, c.vertical, c.emergency, c.questions::jsonb, c.icon, true
from (values
  ('repairs-maintenance', 'plumbing-repairs', 'Plumbing repairs', 10, 'repairs-maintenance', true, '[{"id": "problem", "label": "What is the problem?", "type": "select", "options": ["Leak", "Blocked drain or toilet", "No water", "Water heater", "Tap or fitting", "Other"], "required": true}, {"id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment or condominium", "Commercial building", "Other"]}]', 'droplets'),
  ('repairs-maintenance', 'electrical-repairs', 'Electrical repairs', 20, 'repairs-maintenance', true, '[{"id": "problem", "label": "What is the problem?", "type": "select", "options": ["No power in part of the property", "Sockets or switches", "Lighting", "Burning smell or sparks", "Other"], "required": true}, {"id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment or condominium", "Commercial building", "Other"]}]', 'zap'),
  ('repairs-maintenance', 'roofing-repairs', 'Roofing repairs', 30, 'repairs-maintenance', true, '[{"id": "roof_type", "label": "Type of roof", "type": "select", "options": ["Corrugated sheet", "Tiles", "Concrete slab", "Not sure"]}, {"id": "leaking", "label": "Is water coming in now?", "type": "yesno", "required": true}]', 'house'),
  ('repairs-maintenance', 'painting-repairs', 'Painting & touch-ups', 40, 'repairs-maintenance', false, '[{"id": "area", "label": "Inside or outside?", "type": "select", "options": ["Inside", "Outside", "Both"], "required": true}, {"id": "rooms", "label": "Roughly how many rooms?", "type": "number"}]', 'paint-roller'),
  ('repairs-maintenance', 'appliance-repair', 'Appliance repair', 50, 'repairs-maintenance', false, '[{"id": "appliance", "label": "Which appliance?", "type": "select", "options": ["Fridge or freezer", "Washing machine", "Cooker or oven", "Water heater", "Air conditioner", "Other"], "required": true}, {"id": "brand", "label": "Brand and model, if you know", "type": "text"}]', 'plug-zap'),
  ('repairs-maintenance', 'carpentry-repairs', 'Carpentry repairs', 60, 'repairs-maintenance', false, '[{"id": "item", "label": "What needs fixing?", "type": "multi", "options": ["Doors", "Windows", "Cupboards or kitchen units", "Floors", "Furniture", "Other"]}]', 'hammer'),
  ('repairs-maintenance', 'locksmiths', 'Locksmiths', 70, 'repairs-maintenance', true, '[{"id": "need", "label": "What do you need?", "type": "select", "options": ["Locked out", "Change or repair a lock", "New locks fitted", "Safe or security door"], "required": true}]', 'key-round'),
  ('repairs-maintenance', 'drainage', 'Drainage', 80, 'repairs-maintenance', true, '[{"id": "problem", "label": "What is the problem?", "type": "select", "options": ["Blocked drain", "Septic tank emptying", "Overflowing sewer", "Other"], "required": true}]', 'droplets'),
  ('repairs-maintenance', 'general-handyman', 'General handyman', 90, 'repairs-maintenance', false, '[{"id": "jobs", "label": "List the small jobs", "type": "textarea", "required": true}]', 'wrench'),
  ('repairs-maintenance', 'property-inspections', 'Property inspections', 100, 'repairs-maintenance', false, '[{"id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment or condominium", "Commercial building", "Other"]}, {"id": "purpose", "label": "Why do you need the inspection?", "type": "select", "options": ["Before buying", "Condition check for an owner abroad", "Before renting out", "Damage or defects", "Other"], "required": true}, {"id": "photo_report", "label": "Do you need a photo report?", "type": "yesno"}]', 'clipboard-list'),
  ('repairs-maintenance', 'preventative-maintenance', 'Preventative maintenance', 110, 'repairs-maintenance', false, '[{"id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment or condominium", "Commercial building", "Other"]}, {"id": "frequency", "label": "How often?", "type": "select", "options": ["One visit", "Every 3 months", "Every 6 months", "Every year"]}, {"id": "systems", "label": "What should be checked?", "type": "multi", "options": ["Plumbing", "Electrics", "Roof and gutters", "Generator", "Water tank and pump", "Solar system", "General condition"]}]', 'calendar-check'),
  ('repairs-maintenance', 'emergency-repairs', 'Emergency repairs', 120, 'repairs-maintenance', true, '[{"id": "what", "label": "What has happened?", "type": "select", "options": ["Burst pipe or flooding", "Electrical fault", "Roof damage", "Break-in or broken door/window", "Other"], "required": true}]', 'siren'),
  ('repairs-maintenance', 'property-refurbishment', 'Property refurbishment', 130, 'repairs-maintenance', false, '[{"id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment or condominium", "Commercial building", "Other"]}, {"id": "scope", "label": "What is included?", "type": "multi", "options": ["Kitchen", "Bathrooms", "Floors", "Painting", "Electrics", "Plumbing", "Whole property"]}, {"id": "area_m2", "label": "Floor area (m\u00b2), if known", "type": "number"}]', 'paintbrush'),
  ('repairs-maintenance', 'property-management-support', 'Property management support', 140, 'repairs-maintenance', false, '[{"id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment or condominium", "Commercial building", "Other"]}, {"id": "owner_abroad", "label": "Do you live outside Ethiopia?", "type": "yesno"}, {"id": "help", "label": "What help do you need?", "type": "multi", "options": ["Finding tenants", "Collecting rent", "Repairs and upkeep", "Regular inspections", "Security"]}]', 'building'),
  ('building-contracting', 'house-builders', 'House builders', 15, 'contractors', false, '[{"id": "project", "label": "What kind of project?", "type": "select", "options": ["New build", "Extension", "Renovation", "Fit-out", "Other"], "required": true}, {"id": "height", "label": "Building height, e.g. G+1", "type": "text"}, {"id": "area_m2", "label": "Floor area (m\u00b2), if known", "type": "number"}, {"id": "drawings", "label": "Do you have approved drawings?", "type": "yesno"}, {"id": "permit", "label": "Do you have a building permit?", "type": "yesno"}, {"id": "start", "label": "When do you want to start?", "type": "select", "options": ["As soon as possible", "Within 3 months", "Within a year", "Just getting prices"]}]', 'house'),
  ('building-contracting', 'interior-contractors', 'Interior fit-out contractors', 75, 'contractors', false, '[]', 'sofa'),
  ('building-contracting', 'groundworks', 'Groundworks contractors', 85, 'contractors', false, '[]', 'shovel'),
  ('building-contracting', 'electrical-contractors', 'Electrical contractors', 90, 'contractors', false, '[]', 'zap'),
  ('building-contracting', 'plumbing-contractors', 'Plumbing contractors', 95, 'contractors', false, '[]', 'droplets'),
  ('design-consultancy', 'electrical-engineers', 'Electrical engineers', 35, 'professionals', false, '[]', 'zap'),
  ('design-consultancy', 'mechanical-engineers', 'Mechanical engineers', 36, 'professionals', false, '[]', 'fan'),
  ('design-consultancy', 'planning-consultants', 'Planning consultants', 75, 'professionals', false, '[]', 'map'),
  ('design-consultancy', 'construction-managers', 'Construction managers', 95, 'professionals', false, '[]', 'hard-hat'),
  ('design-consultancy', 'environmental-consultants', 'Environmental consultants', 110, 'professionals', false, '[]', 'trees'),
  ('design-consultancy', 'other-specialists', 'Other property & construction specialists', 120, 'professionals', false, '[]', 'ruler'),
  ('property-services', 'property-consultants', 'Property consultants', 15, 'professionals', false, '[]', 'building'),
  ('property-services', 'property-accountants', 'Property accountants & tax advisers', 95, 'professionals', false, '[]', 'calculator'),
  ('property-services', 'insurance-professionals', 'Insurance professionals', 100, 'professionals', false, '[]', 'shield')
) as c(grp, slug, name, sort, vertical, emergency, questions, icon)
join public.service_categories p on p.slug = c.grp and p.parent_id is null
on conflict (slug) do nothing;

-- Cleaning, pest control and gardening are requested through Repairs & Maintenance (PLATFORM_VISION §6).
update public.service_categories set vertical_key = 'repairs-maintenance' where slug in ('cleaning', 'pest-control', 'landscaping');

-- Questions for the main building services (spec 24.5); admin can change them in Request questions.
update public.service_categories set question_schema = '[{"id": "project", "label": "What kind of project?", "type": "select", "options": ["New build", "Extension", "Renovation", "Fit-out", "Other"], "required": true}, {"id": "height", "label": "Building height, e.g. G+1", "type": "text"}, {"id": "area_m2", "label": "Floor area (m\u00b2), if known", "type": "number"}, {"id": "drawings", "label": "Do you have approved drawings?", "type": "yesno"}, {"id": "permit", "label": "Do you have a building permit?", "type": "yesno"}, {"id": "start", "label": "When do you want to start?", "type": "select", "options": ["As soon as possible", "Within 3 months", "Within a year", "Just getting prices"]}]'::jsonb
where slug in ('general-contractors', 'building-contractors', 'design-build') and question_schema = '[]'::jsonb;
update public.service_categories set question_schema = '[{"id": "rooms", "label": "Which rooms?", "type": "multi", "options": ["Kitchen", "Bathroom", "Bedrooms", "Living areas", "Whole property"]}, {"id": "area_m2", "label": "Floor area (m\u00b2), if known", "type": "number"}, {"id": "property_type", "label": "Type of property", "type": "select", "options": ["House", "Apartment or condominium", "Commercial building", "Other"]}]'::jsonb
where slug = 'renovation' and question_schema = '[]'::jsonb;
update public.service_categories set allows_emergency = true where slug in ('plumbers', 'electricians', 'roofers');

-- Professional profiles: qualifications (PLATFORM_VISION §5).
alter table public.organisations add column qualifications text check (char_length(qualifications) <= 2000);

create or replace view public.organisations_public with (security_barrier = true) as
select
  o.id, o.kind, o.name, o.slug, o.short_id, o.tagline, o.description, o.logo_path, o.cover_path,
  o.website, o.location_id, l.display_name as location_display, l.path as location_path,
  o.areas_served, o.year_established, o.team_size, o.licence_category, o.licence_grade,
  o.verification_level, o.verified_at, o.is_hagerland, o.is_featured, o.featured_until,
  o.social, o.opening_hours, o.published_at, o.updated_at,
  (o.phone is not null) as has_phone,
  (o.whatsapp is not null) as has_whatsapp,
  (o.telegram is not null) as has_telegram,
  (o.email is not null) as has_email,
  exists (select 1 from public.organisation_members m where m.org_id = o.id) as has_members,
  o.search_tsv,
  o.country_code, o.currency, o.serves_diaspora,
  o.qualifications
from public.organisations o
left join public.locations l on l.id = o.location_id
where o.status = 'published';
comment on view public.organisations_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only published organisations and only public-safe columns.';
revoke all on public.organisations_public from public, anon, authenticated;
grant select on public.organisations_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0015', 'repairs_contractors') on conflict (version) do nothing;
