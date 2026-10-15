# Pillars, their pages and canonical addresses

Spec Section 26.2. Every existing page still works at its address. Each belongs to one pillar (`lib/pillars.ts`, `PILLAR_DEEP_PATHS`), shows a "Part of …" link back to its pillar hub (`components/pillars/PillarTrail.tsx`), and keeps **its own address as its canonical**. A hub summarises its pillar and links to the deeper pages; it does not repeat their listings or text, so hubs and deeper pages never compete as duplicates. Coming-soon (interest-only) hubs are `noindex` and left out of the sitemap; hidden pillars return 404.

| # | Pillar | Hub (canonical) | Deeper pages (each its own canonical) |
|---|---|---|---|
| 1 | Buy & Sell Property | `/buy` | `/property/for-sale` (+ location and type pages, which follow the canonical rules of spec 16), `/property/<listing>`, `/property/<listing>/viewing`, `/offer` (noindex), `/developments`, `/agency/sell`, `/agency/buyer-representation`, `/agency/property-sourcing`, `/agency/developer-sales`, `/agency/valuation`, `/property/compare`, `/property/map`, `/agents`, `/developers` |
| 2 | Rent & Let Property | `/rent` | `/property/to-rent` (+ location pages), `/property/<listing>/apply` (noindex), `/agency/let`, `/agency/landlords`, `/agency/tenants` |
| 3 | Build & Develop Property | `/build` | `/contractors`, `/build/project`, `/build-cost-estimator`, `/our-developments` |
| 4 | Repair & Maintain Property | `/maintain` | `/repairs-maintenance`, `/request-service/<service>` |
| 5 | Manage Property | `/manage` | `/diaspora/property-care`, `/owner` (signed-in owners, noindex) |
| 6 | Property Finance | `/finance` | (hub only) |
| 7 | Property Insurance | `/insurance` | (hub only) |
| 8 | Knowledge & Advice | `/advice` | `/guides`, `/guides/<guide>`, `/advice/market-insight`, `/advice/checklists`, `/advice/glossary`, `/help` |
| 9 | Building & Construction Supplies | `/supplies` | `/supplies/<category>`, `/supplies/product/<product>`, `/suppliers`, `/supplies/quote`, `/supplies/materials-list`, `/supplies/special-buys`, `/supplies/trade` |
| 10 | Jobs, Recruitment & Staffing | `/jobs` | `/jobs/<job>` |
| Layer | Diaspora Services | `/diaspora` | `/diaspora/services-abroad` |
| Layer | Professionals & Service Providers | `/professionals` | `/professionals/<service>` (+ location pages), `/company/<business>` |

`/property` remains the property search hub shared by Buy and Rent; `/agency` lists the agency services of both.
