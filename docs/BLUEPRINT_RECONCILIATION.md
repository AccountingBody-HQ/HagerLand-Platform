# Transformation blueprint: reconciliation with the current code

Spec Section 26.0 and 26.18(c). `docs/TRANSFORMATION_BLUEPRINT.md` was written against the **pre-relaunch** repository (Next.js 14, the old `housing` table, manage tokens, BirrBank). Each row below was checked against the code on `relaunch/construction` on 15 Oct 2026 and recorded as **Resolved** (already true before Section 26, with evidence), **Built in Section 26**, or **Out of scope** (with the reason). Nothing the relaunch removed has been reintroduced: no `housing` table use, no `/api/housing` or `/api/property` routes (they answer 410 Gone), no manage-token flows, no BirrBank, no Sanity (verified: `grep` of `app/`, `components/`, `lib/` and `package.json` finds none; `scripts/legacy-sweep.sh` clean).

## Implementation backlog

| Pri | Initiative | Status | Evidence |
|---|---|---|---|
| P0 | Repair Property API namespace | Resolved | The old manage/verify/resend flows were replaced by accounts (WP-4/WP-6). `/api/housing/*` and `/api/property/*` answer 410 (`lib/legacy-api.ts`, e2e `edge-cases.spec.ts`). Old `/property/post|manage|edit-link` redirect to `/list-with-us` (`next.config.mjs`). |
| P0 | Remove/replace missing property-discovery cron | Resolved | `vercel.json` schedules only `/api/cron/daily` (exists, Bearer CRON_SECRET; e2e `cron.spec.ts`). |
| P0 | Automated critical-path tests | Resolved | Vitest (`tests/unit`, 36 files) and Playwright (`e2e/`, 37 specs) against a local Supabase copy. |
| P0 | Versioned DB migrations | Resolved | `supabase/migrations/0001–0033`, each with a check in `supabase/checks/`, recorded in `schema_migrations`. |
| P0 | Property v2 domain schema | Resolved | `properties`, `developments`, `locations` (0002) replace `housing`; legacy tables untouched and locked down at cutover. |
| P0 | Media/storage pipeline | Resolved | Signed uploads, sharp WebP re-encode, EXIF stripped, private documents (`lib/storage.ts`, WP-5). |
| P0 | Location/taxonomy model | Resolved | `locations` tree with countries, `service_categories`, `product_categories` (0002, 0013). |
| P0 | Shared Lead/Enquiry service | Resolved | `enquiries` (full lead record), `service_requests`, `interest_registrations`; Section 26 adds agency viewings, offers, applications and building projects. |
| P1 | Property information architecture | Built in Section 26 | Ten pillars, header with seven lifecycle menus, All services panel, hubs (S1–S2); every pillar reachable in ≤ 2 interactions (header menu or All services). |
| P1 | Knowledge/SEO hub | Built in Section 26 | `/advice`, market insight, area guides, checklists and glossary drafts (S7); guides hub existed (H2). |
| P1 | Supplier catalogue/RFQ MVP | Resolved | HagerLand Supply catalogue, quote list, materials list (WP-9); supplier self-serve products (H1). |
| P1 | Jobs industry taxonomy | Resolved | `job_posts` with construction/property categories (E8); Jobs live with recruitment by HagerLand (S1). |
| P1 | Public accounts + roles | Resolved | Supabase Auth accounts (WP-4), organisation teams with roles (H3); staff roles in admin built in Section 26 (S10). |
| P1 | Organisation/provider model | Resolved | `organisations` with kinds, services, verification (WP-7); providers choose pillars (S8). |
| P1 | Repair service request pilot | Resolved | Service request engine (E3, E4); HagerLand's own team can take requests (S5). |
| P1 | Finance lead integration | Built in Section 26 (partner model) | Finance pillar: Interest on; Aggregate switchable once verified lender/broker partners exist (stage gate). BirrBank integration is out of scope (frozen by AB, spec 26.17). |
| P1 | Insurance lead integration | Built in Section 26 (partner model) | As finance, with insurer/broker partners. |
| P1 | Saved searches/alerts | Resolved | `saved_searches` with instant/daily/weekly alerts (E6). |
| P2 | Diaspora management pilot | Built in Section 26 | Property Care (E5) plus the owner portal (S5). |
| P2 | Candidate/application model | Resolved | Applications with CVs and candidate profiles (E8). |
| P2 | Quote/job workflow | Resolved | Provider quotes, customer choice, deals ledger (E3); building projects link requests (S6). |
| P2 | Reviews/reputation | Built in Section 26 | Verified reviews from won jobs only, moderated, one reply (S8). |
| P3 | Payments/payouts | Out of scope | Deferred by rule (spec 25.3, 26.17). Integration interface in `lib/integrations.ts`, shown "Not configured" in admin → Settings. |
| P3 | Valuation/property history | Out of scope | Deferred by rule (spec 26.17). Market insight uses live asking prices only and says so. |

## Appendix A: immediate technical findings

| Finding | Status | Evidence |
|---|---|---|
| Technology stack (Next.js 14, no tests) | Resolved | Next.js 15.5.28, React 19 (E10); Vitest and Playwright. |
| Property submission writes to `housing` | Resolved | Listing wizard writes `properties` (WP-6). |
| Property management via `/api/property/manage` | Resolved | Replaced by accounts; endpoint answers 410. |
| Property resend link | Resolved | Replaced by accounts and email sign-in links; endpoint answers 410. |
| Equivalent APIs under `/api/housing/*` | Resolved | Removed; answer 410 (`lib/legacy-api.ts`). |
| Search queried `housing` | Resolved | `search_all` and vertical search functions over the new tables (WP-11). |
| Redirects and global no-store headers | Resolved | Legacy redirects kept; global no-store removed, ISR per route (WP-1, spec 19.2). |
| Missing property-discovery cron | Resolved | Only `/api/cron/daily`. |
| Admin security | Resolved | Kept (username + password + TOTP, HMAC session) and extended with staff roles (S10). |
| Admin moderation | Resolved | Generic review queue (WP-14). |
| Enquiry stores only section and listing id | Resolved | `enquiries` stores the full lead (WP-10). |
| No public auth | Resolved | Supabase Auth accounts (WP-4). |
| No media upload | Resolved | Media pipeline (WP-5). |
| No payments | Out of scope | Deferred by rule; integration point only. |
| No migrations | Resolved | 33 numbered migrations with checks. |
| Unused Sanity packages | Resolved | Removed in WP-1 (`package.json` has none). |

## Engineering handoff sequence

| Step | Status | Evidence |
|---|---|---|
| Branch and baseline | Resolved | `relaunch/construction`, tag `pre-construction-relaunch`. |
| Canonical property API adapters | Resolved (replaced) | Accounts and server actions replace the token APIs; old addresses answer 410. |
| Search with canonical fields and /property URLs | Resolved | WP-11. |
| Remove or implement property-discovery cron | Resolved | Removed. |
| Smoke E2E of property submit → approve → view → edit | Resolved | `e2e/flows/owner-listing.spec.ts`. |
| Export schema, commit migrations, typed repository | Resolved | `docs/legacy-schema-snapshot.md`, migrations, `lib/database.types.ts`. |
| Property v2 tables, legacy adapter | Resolved (no adapter needed) | New tables; legacy data is not migrated (spec 20.3) and is locked down at cutover. |
| Storage buckets and policies | Resolved | Migration 0006. |
| Ethiopia location and taxonomy | Resolved | Migrations 0002, 0007, 0013. |
| Shared lead service | Resolved | `enquiries`, `service_requests`. |
| Property index/detail/post on v2 | Resolved | WP-6. |
| Ten-pillar landing architecture | Built in Section 26 | S1–S2. |
| Accounts, organisations, provider profiles; migrate manage-token owners | Resolved / Out of scope | Accounts and organisations built; old manage-token owners are not migrated because legacy data is not migrated (spec 20.3). |
| Activate repair, management, finance/insurance, supplies, staffing with stage gates | Built in Section 26 | Pillar modes with stage gates (S1); launch modes set by migration 0027 per AB's update. |
