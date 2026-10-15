-- 0007 · Starting reference data (spec 6.4).
-- Regions and cities follow the spec's list; AB confirms or corrects them in admin
-- (Locations), where neighbourhood areas are also added. Safe to re-run: existing rows are kept.

-- Regions and chartered cities
insert into public.locations (level, name, slug, path, sort)
values
  ('region', 'Addis Ababa', 'addis-ababa', 'addis-ababa', 1),
  ('region', 'Dire Dawa', 'dire-dawa', 'dire-dawa', 2),
  ('region', 'Afar', 'afar', 'afar', 10),
  ('region', 'Amhara', 'amhara', 'amhara', 11),
  ('region', 'Benishangul-Gumuz', 'benishangul-gumuz', 'benishangul-gumuz', 12),
  ('region', 'Central Ethiopia', 'central-ethiopia', 'central-ethiopia', 13),
  ('region', 'Gambela', 'gambela', 'gambela', 14),
  ('region', 'Harari', 'harari', 'harari', 15),
  ('region', 'Oromia', 'oromia', 'oromia', 16),
  ('region', 'Sidama', 'sidama', 'sidama', 17),
  ('region', 'Somali', 'somali', 'somali', 18),
  ('region', 'South Ethiopia', 'south-ethiopia', 'south-ethiopia', 19),
  ('region', 'South West Ethiopia Peoples''', 'south-west-ethiopia', 'south-west-ethiopia', 20),
  ('region', 'Tigray', 'tigray', 'tigray', 21)
on conflict (path) do nothing;

-- Addis Ababa sub-cities (11)
insert into public.locations (parent_id, level, name, slug, path, sort)
select r.id, 'sub_city', s.name, s.slug, 'addis-ababa/' || s.slug, s.sort
from public.locations r
cross join (values
  ('Addis Ketema', 'addis-ketema', 1), ('Akaki Kality', 'akaki-kality', 2), ('Arada', 'arada', 3),
  ('Bole', 'bole', 4), ('Gulele', 'gulele', 5), ('Kirkos', 'kirkos', 6), ('Kolfe Keranio', 'kolfe-keranio', 7),
  ('Lemi Kura', 'lemi-kura', 8), ('Lideta', 'lideta', 9), ('Nifas Silk-Lafto', 'nifas-silk-lafto', 10), ('Yeka', 'yeka', 11)
) as s (name, slug, sort)
where r.path = 'addis-ababa'
on conflict (path) do nothing;

-- Key cities under their regions
insert into public.locations (parent_id, level, name, slug, path, sort)
select r.id, 'city', c.name, c.slug, r.path || '/' || c.slug, c.sort
from (values
  ('oromia', 'Adama', 'adama', 1), ('oromia', 'Bishoftu', 'bishoftu', 2), ('oromia', 'Sheger City', 'sheger-city', 3),
  ('oromia', 'Jimma', 'jimma', 4), ('oromia', 'Shashemene', 'shashemene', 5),
  ('sidama', 'Hawassa', 'hawassa', 1),
  ('amhara', 'Bahir Dar', 'bahir-dar', 1), ('amhara', 'Gondar', 'gondar', 2), ('amhara', 'Dessie', 'dessie', 3),
  ('tigray', 'Mekelle', 'mekelle', 1),
  ('dire-dawa', 'Dire Dawa', 'dire-dawa', 1),
  ('harari', 'Harar', 'harar', 1),
  ('south-ethiopia', 'Arba Minch', 'arba-minch', 1), ('south-ethiopia', 'Wolaita Sodo', 'wolaita-sodo', 2)
) as c (region, name, slug, sort)
join public.locations r on r.path = c.region
on conflict (path) do nothing;

-- Service categories (two levels)
with groups (name, slug, icon, sort) as (
  values
    ('Design & consultancy', 'design-consultancy', 'drafting-compass', 1),
    ('Building & contracting', 'building-contracting', 'hard-hat', 2),
    ('Trades', 'trades', 'hammer', 3),
    ('Systems & installation', 'systems-installation', 'plug-zap', 4),
    ('Property services', 'property-services', 'key-round', 5),
    ('Equipment & logistics', 'equipment-logistics', 'truck', 6)
)
insert into public.service_categories (name, slug, icon, sort)
select name, slug, icon, sort from groups
on conflict (slug) do nothing;

insert into public.service_categories (parent_id, name, slug, icon, sort)
select g.id, s.name, s.slug, s.icon, s.sort
from (values
  ('design-consultancy', 'Architects', 'architects', 'drafting-compass', 1),
  ('design-consultancy', 'Structural engineers', 'structural-engineers', 'ruler', 2),
  ('design-consultancy', 'Civil engineers', 'civil-engineers', 'ruler', 3),
  ('design-consultancy', 'MEP engineers', 'mep-engineers', 'cable', 4),
  ('design-consultancy', 'Quantity surveyors', 'quantity-surveyors', 'calculator', 5),
  ('design-consultancy', 'Land surveyors', 'land-surveyors', 'map', 6),
  ('design-consultancy', 'Interior designers', 'interior-designers', 'sofa', 7),
  ('design-consultancy', 'Landscape architects', 'landscape-architects', 'trees', 8),
  ('design-consultancy', 'Project managers', 'project-managers', 'clipboard-list', 9),
  ('design-consultancy', 'Property valuers', 'property-valuers', 'scale', 10),
  ('building-contracting', 'General contractors', 'general-contractors', 'hard-hat', 1),
  ('building-contracting', 'Building contractors', 'building-contractors', 'building-2', 2),
  ('building-contracting', 'Road & civil works contractors', 'road-civil-contractors', 'construction', 3),
  ('building-contracting', 'Specialised contractors', 'specialised-contractors', 'wrench', 4),
  ('building-contracting', 'Design & build firms', 'design-build', 'pencil-ruler', 5),
  ('building-contracting', 'Renovation & remodelling', 'renovation', 'paint-roller', 6),
  ('building-contracting', 'Demolition & site clearance', 'demolition', 'pickaxe', 7),
  ('building-contracting', 'Excavation & earthworks', 'excavation', 'shovel', 8),
  ('trades', 'Masons & bricklayers', 'masons', 'brick-wall', 1),
  ('trades', 'Concrete & formwork', 'concrete-formwork', 'boxes', 2),
  ('trades', 'Steel fixers', 'steel-fixers', 'grid-3x3', 3),
  ('trades', 'Carpenters & joiners', 'carpenters', 'axe', 4),
  ('trades', 'Electricians', 'electricians', 'zap', 5),
  ('trades', 'Plumbers', 'plumbers', 'droplets', 6),
  ('trades', 'Painters & decorators', 'painters', 'paintbrush', 7),
  ('trades', 'Tilers', 'tilers', 'layout-grid', 8),
  ('trades', 'Plasterers', 'plasterers', 'paint-bucket', 9),
  ('trades', 'Roofers', 'roofers', 'house', 10),
  ('trades', 'Welders & metal fabrication', 'welders', 'flame', 11),
  ('trades', 'Aluminium & glass', 'aluminium-glass', 'app-window', 12),
  ('trades', 'Gypsum & ceilings', 'gypsum-ceilings', 'layers', 13),
  ('trades', 'Flooring installers', 'flooring', 'square-stack', 14),
  ('trades', 'Waterproofing', 'waterproofing', 'umbrella', 15),
  ('systems-installation', 'Solar installers', 'solar-installers', 'sun', 1),
  ('systems-installation', 'Generator supply & service', 'generators-service', 'battery-charging', 2),
  ('systems-installation', 'Water tanks & pumps', 'water-tanks-pumps', 'cylinder', 3),
  ('systems-installation', 'Borehole drilling', 'borehole-drilling', 'drill', 4),
  ('systems-installation', 'HVAC & ventilation', 'hvac', 'fan', 5),
  ('systems-installation', 'CCTV & security systems', 'cctv-security', 'cctv', 6),
  ('systems-installation', 'Lifts & elevators', 'lifts', 'arrow-up-down', 7),
  ('systems-installation', 'Fire safety', 'fire-safety', 'fire-extinguisher', 8),
  ('property-services', 'Estate agents & brokers', 'estate-agents', 'key-round', 1),
  ('property-services', 'Property management', 'property-management', 'building', 2),
  ('property-services', 'Cleaning', 'cleaning', 'sparkles', 3),
  ('property-services', 'Movers & removals', 'movers', 'truck', 4),
  ('property-services', 'Pest control', 'pest-control', 'bug', 5),
  ('property-services', 'Landscaping & gardening', 'landscaping', 'flower-2', 6),
  ('property-services', 'Security guarding', 'security-guarding', 'shield', 7),
  ('property-services', 'Property lawyers', 'property-lawyers', 'scale', 8),
  ('equipment-logistics', 'Plant & equipment hire', 'equipment-hire', 'forklift', 1),
  ('equipment-logistics', 'Scaffolding', 'scaffolding', 'grid-2x2', 2),
  ('equipment-logistics', 'Materials transport', 'materials-transport', 'truck', 3),
  ('equipment-logistics', 'Skip & waste removal', 'waste-removal', 'trash-2', 4)
) as s (group_slug, name, slug, icon, sort)
join public.service_categories g on g.slug = s.group_slug
on conflict (slug) do nothing;

-- Mortgage & finance advice is visible from Phase 2.
insert into public.service_categories (parent_id, name, slug, icon, sort, is_active)
select id, 'Mortgage & finance advice', 'mortgage-finance', 'landmark', 9, false
from public.service_categories where slug = 'property-services'
on conflict (slug) do nothing;

-- Product categories (two levels)
insert into public.product_categories (name, slug, icon, sort)
values
  ('Building materials', 'building-materials', 'brick-wall', 1),
  ('Roofing', 'roofing', 'house', 2),
  ('Plumbing', 'plumbing', 'droplets', 3),
  ('Electrical', 'electrical', 'zap', 4),
  ('Bathroom & sanitaryware', 'bathroom', 'bath', 5),
  ('Kitchen', 'kitchen', 'cooking-pot', 6),
  ('Tiles & flooring', 'tiles-flooring', 'layout-grid', 7),
  ('Doors, windows & ironmongery', 'doors-windows', 'door-open', 8),
  ('Paint & decorating', 'paint-decorating', 'paint-roller', 9),
  ('Fixings & fasteners', 'fixings-fasteners', 'nut', 10),
  ('Tools', 'tools', 'wrench', 11),
  ('Adhesives & sealants', 'adhesives-sealants', 'pipette', 12),
  ('Safety & workwear', 'safety-workwear', 'hard-hat', 13),
  ('Solar & power', 'solar-power', 'sun', 14)
on conflict (slug) do nothing;

insert into public.product_categories (parent_id, name, slug, sort)
select c.id, s.name, s.slug, s.sort
from (values
  ('building-materials', 'Cement & concrete', 'cement-concrete', 1),
  ('building-materials', 'Steel & rebar', 'steel-rebar', 2),
  ('building-materials', 'Blocks & bricks', 'blocks-bricks', 3),
  ('building-materials', 'Sand & aggregates', 'sand-aggregates', 4),
  ('building-materials', 'Timber & boards', 'timber-boards', 5),
  ('building-materials', 'Gypsum & plaster', 'gypsum-plaster', 6),
  ('building-materials', 'Waterproofing', 'waterproofing-materials', 7),
  ('roofing', 'Corrugated sheets', 'corrugated-sheets', 1),
  ('roofing', 'Roof tiles', 'roof-tiles', 2),
  ('roofing', 'Gutters & downpipes', 'gutters-downpipes', 3),
  ('roofing', 'Insulation', 'insulation', 4),
  ('plumbing', 'Pipes & fittings (PPR, PVC, GI)', 'pipes-fittings', 1),
  ('plumbing', 'Valves & taps', 'valves-taps', 2),
  ('plumbing', 'Water tanks', 'water-tanks', 3),
  ('plumbing', 'Pumps', 'pumps', 4),
  ('plumbing', 'Drainage', 'drainage', 5),
  ('plumbing', 'Water heaters', 'water-heaters', 6),
  ('electrical', 'Cable & wire', 'cable-wire', 1),
  ('electrical', 'Switches & sockets', 'switches-sockets', 2),
  ('electrical', 'Breakers & distribution boards', 'breakers-boards', 3),
  ('electrical', 'Conduit & trunking', 'conduit-trunking', 4),
  ('electrical', 'Lighting', 'lighting', 5),
  ('electrical', 'Earthing', 'earthing', 6),
  ('bathroom', 'Toilets', 'toilets', 1),
  ('bathroom', 'Basins', 'basins', 2),
  ('bathroom', 'Showers', 'showers', 3),
  ('bathroom', 'Mixers & taps', 'mixers-taps', 4),
  ('bathroom', 'Bathroom accessories', 'bathroom-accessories', 5),
  ('kitchen', 'Sinks', 'sinks', 1),
  ('kitchen', 'Kitchen taps', 'kitchen-taps', 2),
  ('kitchen', 'Worktops', 'worktops', 3),
  ('kitchen', 'Cabinet hardware', 'cabinet-hardware', 4),
  ('tiles-flooring', 'Ceramic & porcelain tiles', 'ceramic-porcelain-tiles', 1),
  ('tiles-flooring', 'Floor tiles', 'floor-tiles', 2),
  ('tiles-flooring', 'Wall tiles', 'wall-tiles', 3),
  ('tiles-flooring', 'Laminate & vinyl', 'laminate-vinyl', 4),
  ('tiles-flooring', 'Tile adhesive & grout', 'tile-adhesive-grout', 5),
  ('doors-windows', 'Doors', 'doors', 1),
  ('doors-windows', 'Windows & frames', 'windows-frames', 2),
  ('doors-windows', 'Locks', 'locks', 3),
  ('doors-windows', 'Handles', 'handles', 4),
  ('doors-windows', 'Hinges', 'hinges', 5),
  ('doors-windows', 'Door closers', 'door-closers', 6),
  ('paint-decorating', 'Interior paint', 'interior-paint', 1),
  ('paint-decorating', 'Exterior paint', 'exterior-paint', 2),
  ('paint-decorating', 'Primers', 'primers', 3),
  ('paint-decorating', 'Brushes & rollers', 'brushes-rollers', 4),
  ('paint-decorating', 'Wallpaper', 'wallpaper', 5),
  ('fixings-fasteners', 'Screws', 'screws', 1),
  ('fixings-fasteners', 'Nails', 'nails', 2),
  ('fixings-fasteners', 'Bolts & nuts', 'bolts-nuts', 3),
  ('fixings-fasteners', 'Anchors & plugs', 'anchors-plugs', 4),
  ('fixings-fasteners', 'Brackets', 'brackets', 5),
  ('tools', 'Power tools', 'power-tools', 1),
  ('tools', 'Hand tools', 'hand-tools', 2),
  ('tools', 'Measuring & levelling', 'measuring-levelling', 3),
  ('tools', 'Blades & bits', 'blades-bits', 4),
  ('tools', 'Tool storage', 'tool-storage', 5),
  ('adhesives-sealants', 'Silicone', 'silicone', 1),
  ('adhesives-sealants', 'Construction adhesive', 'construction-adhesive', 2),
  ('adhesives-sealants', 'Foam', 'foam', 3),
  ('adhesives-sealants', 'Tapes', 'tapes', 4),
  ('safety-workwear', 'Helmets', 'helmets', 1),
  ('safety-workwear', 'Gloves', 'gloves', 2),
  ('safety-workwear', 'Boots', 'boots', 3),
  ('safety-workwear', 'Hi-vis', 'hi-vis', 4),
  ('safety-workwear', 'Eye & ear protection', 'eye-ear-protection', 5),
  ('safety-workwear', 'Fall protection', 'fall-protection', 6),
  ('solar-power', 'Solar panels', 'solar-panels', 1),
  ('solar-power', 'Inverters', 'inverters', 2),
  ('solar-power', 'Batteries', 'batteries', 3),
  ('solar-power', 'Generators', 'generators', 4),
  ('solar-power', 'Stabilisers & UPS', 'stabilisers-ups', 5)
) as s (parent_slug, name, slug, sort)
join public.product_categories c on c.slug = s.parent_slug
on conflict (slug) do nothing;

-- HagerLand's own organisations (contact details come from site settings).
insert into public.organisations (kind, name, slug, is_hagerland, verification_level, verified_at, status, source, description)
values
  ('hagerland', 'HagerLand Supply', 'hagerland-supply', true, 'verified', now(), 'published', 'admin',
   'HagerLand''s own construction materials business. Send us your materials list or add products to a quote, and we come back with a clear price and delivery.'),
  ('hagerland', 'HagerLand Developments', 'hagerland-developments', true, 'verified', now(), 'published', 'admin',
   'Homes HagerLand builds itself, with materials sourced through HagerLand Supply.')
on conflict (slug) do nothing;

-- Site settings defaults
insert into public.site_settings (key, value)
values
  ('listing_expiry_days', '60'),
  ('min_results_for_index', '3'),
  ('private_owner_max_active_listings', '3'),
  ('verified_business_count_min', '25'),
  ('contact_details', '{}'),
  ('social_links', '{}'),
  ('announcement_bar', '{"enabled": false, "text": "", "href": ""}'),
  ('homepage_featured_ids', '[]'),
  ('quote_response_target', '""'),
  ('legal_last_updated', '{}')
on conflict (key) do nothing;
