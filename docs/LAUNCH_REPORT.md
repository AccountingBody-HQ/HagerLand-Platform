# HagerLand relaunch — Launch report

**Date:** 15 October 2026 · **Status: LIVE.** The new HagerLand went live on www.hagerland.com on 15 October 2026 at 16:05 UTC (merge commit `8752162` on `main`). Phase 1 (WP-0 to WP-19), Phase 1.5 (E1–E10, H1–H6, Section 25), Section 26 (S1–S12) and the cutover (WP-20) are done. The go-live record is directly below.

## Go-live record (WP-20, spec 25.6), 15 October 2026

AB typed GO LIVE on 15 Oct 2026 with the checklist status recorded under "Checklist as confirmed by AB" below. The cutover ran in the spec's order (the legacy lockdown comes after the merge, so the old site was never cut off from its tables while it was still serving).

| Step | What happened | Result |
|---|---|---|
| 1. Checklist items that can be verified | `SUPABASE_DB_URL` present. The preview's `/api/health/full` could not be read: previews are behind Vercel login and this Codespace has no Vercel sign-in (changing that setting is off-limits). Relied on AB's confirmation; the same checks were covered on production after the deploy (rows 6 and 8) with the automatic rollback armed. | Done, with that limit |
| 2. Fresh live backup | `backups/hagerland-public-20261015-1602.dump` (+ `.sql`) and `hagerland-auth-storage-20261015-1602.dump`: all 50 tables with data | PASS |
| 3. Migrations 0010–0033 on live | 24 migrations, one at a time, each one transaction, each check PASS; 33 recorded in `schema_migrations`. Legacy row counts identical to the backup (companies 23, housing 20, jobs 1, events 3, …) | PASS |
| 4. Security test on live | 190 of 190 PASS; no test users left behind | PASS |
| 5. Merge to `main` | Merge commit `8752162` (parents `00de73c` and `f12d013`), no squash, no force. www.hagerland.com served it 130 seconds after the push (16:05 UTC) | PASS |
| 6. Production smoke tests (read-only) | 176 passed. `/property/map` answered 404 on both screen sizes: correct, because no map provider is configured (no page or sitemap links to it); the test now expects that. 2 skipped: `/api/health/full` (see "Not verified" below) | PASS |
| 7. Legacy lockdown on live | Proof 23 of 23 PASS; every legacy row still there. Smoke tests re-run after it: same result as row 6 | PASS |
| 8. Preflight against production | Robots, all 12 sitemaps, the six security headers, hagerland.com → www redirect, admin sign-in protection and noindex: PASS. DNS: PASS after the script learned Vercel's newer DNS names and addresses (`vercel-dns-016.com`, `216.150.x.x`; responses come from `server: Vercel`). `/api/health/full`: not verifiable (below) | PASS except the item below |

**Not verified, and why (no rollback, because none of them is a fault on the site):**

- **`/api/health/full` on production.** `CRON_SECRET` in the Codespace's `.env.local` is empty, so the request was refused (401), which is the correct behaviour. Its parts were checked another way where possible: database and all 33 migrations (read from the database), storage buckets (`public-media` public, `private-docs` private), Supabase keys and site address (pages load data, canonical addresses are www.hagerland.com), the Turnstile site key (the widget loads and Cloudflare serves its challenge on `/contact`). Not checkable from here: `RESEND_API_KEY`, `EMAIL_FROM` domain verification, `ADMIN_DIGEST_EMAIL`, `IP_HASH_SALT`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET` on Vercel.
- **Admin sign-in with real details.** The sign-in page renders, is not indexed, and refuses visitors without a session (smoke tests). One sign-in attempt with the username, password and authenticator secret from `.env.local` was refused ("Those details did not match"): the Codespace copy differs from Vercel's values. Not retried, to avoid the 15-minute lock-out. AB signs in once to confirm (below).
- **The daily job (cron).** Scheduled in `vercel.json` for 06:00 UTC; without the secret it correctly answers 401. Its first run is 16 Oct 2026 at 06:00 UTC, and it emails the daily digest to `ADMIN_DIGEST_EMAIL`: that email is the proof.

**Checks on production after the deploy (AB's step 13), reported rather than blocking:**

| Check | Result |
|---|---|
| Lighthouse (phone, simulated), live pages | Accessibility 100 and SEO 100 on every page. Performance: `/` 80, `/buy` 91, `/jobs` 90, `/company/hagerland-supply` 69, `/supplies` 67–87 (the same page measured 2.4 s and 7.3 s back to back: this Codespace's busy 2-core CPU, not the site). Best practices 96 (a browser "issues" note). Use PageSpeed Insights (Google's machines) for reliable speed figures |
| Rich results (structured data) | Valid JSON-LD on `/` (Organization, WebSite), company pages (HomeAndConstructionBusiness), `/agency` (RealEstateAgent), breadcrumbs on hubs; every URL on www.hagerland.com |
| Indexing | Live pages say `index, follow` with www canonicals; areas on Interest only (Finance, Insurance) are `noindex` on purpose until they have partners |
| Security headers | All six present (preflight) |

**Found during the cutover and fixed on `relaunch/construction`** (scripts only; the live site's code is unchanged): the merge script stopped waiting for the deployment at the old site's first 404 (the wait was done by hand); the preflight did not recognise Vercel's newer DNS; the smoke test assumed a map provider.

### Checklist as confirmed by AB (15 Oct 2026)

| Step | Status |
|---|---|
| 1 Supabase Pro | **Declined by AB**: stays on the Free plan (no downloadable backups, project pauses after a week without activity). Fresh backup taken before every write, as above. Keep taking backups with `scripts/backup-supabase.sh`. |
| 2 Vercel environment variables | Done. Email is sent from `HagerLand <hello@accountingbody.com>` and `HagerLand Supply <supply@accountingbody.com>` (Resend free plan, domain accountingbody.com verified; hagerland.com is not verified in Resend). |
| 3 Admin secrets | `ADMIN_PASSWORD` deliberately kept by AB; `ADMIN_SESSION_SECRET` may have been rotated in Vercel. |
| 4 Supabase Auth | Done (site and redirect URLs, confirm email, minimum password 10, custom SMTP through Resend as hello@accountingbody.com, all four templates). |
| 5 Resend | Free-plan fallback on accountingbody.com. |
| 6 Turnstile | Done (hagerland.com, www.hagerland.com and the branch preview). Widget verified on production. |
| 7 CRON_SECRET | Done in Vercel. (The Codespace's `.env.local` copy turned out to be empty.) |
| 8 SUPABASE_DB_URL | Done; used for the cutover, then removed from `.env.local`. |
| 9 Admin settings | Contact details saved; everything else on the defaults, to adjust from the live admin. |
| 10 Lawyer review | **Not done. AB accepts launching with the drafted `/terms`, `/privacy` and `/cookies` and will arrange a review after launch.** |
| 11 ICO | Done (confirmed by AB). |
| 12 Licence references | **Deferred by AB.** The fields are empty, so no licence lines show; add them in admin → Settings → Licences and approvals when ready. |
| 13 Preview review | Accepted by AB; production checks above. |

### What AB does next

1. **Sign in to the admin once** at https://www.hagerland.com/roodber8-login with your usual username, password and authenticator code, and open admin → Pillars and Settings. If it refuses you, check `ADMIN_USERNAME`, `ADMIN_PASSWORD` and `ADMIN_TOTP_SECRET` in Vercel (Production).
2. **Tomorrow (16 Oct) after 06:00 UTC**, check that the daily digest email arrived. If it did not, check `CRON_SECRET` and `ADMIN_DIGEST_EMAIL` in Vercel, and Vercel → Settings → Cron Jobs.
3. **Rotate the database password** once more in Supabase (Project Settings → Database). It was used in this Codespace for the cutover. `SUPABASE_DB_URL` has already been deleted from `.env.local`.
4. **Download the backup files** in `backups/` to your computer, then delete them from the Codespace (they contain personal data).
5. **Lawyer review** of `/terms`, `/privacy` and `/cookies`; then set their "last updated" dates in admin → Settings.
6. **Licence and approval references**: add them in admin → Settings → Licences and approvals when you have them; each one then shows on its pages.
7. **Google Search Console**: submit https://www.hagerland.com/sitemap.xml (and check the old addresses are being redirected).
8. **First week**: read the daily digest, admin → Email problems and the error count every day; run PageSpeed Insights on `/`, `/supplies` and a company page.
9. Optional: copy `CRON_SECRET` from Vercel into `.env.local` so `bash scripts/preflight.sh` can check `/api/health/full` on production; then run it once.

This report is in four parts:

1. What is finished, and the evidence
2. A page-by-page checklist for you to review
3. Your pre-go-live checklist (spec 25.7)
4. Known limitations and what is not built yet

---

## Releases

| Date (UTC) | Release | Merge commit on `main` | Checks after release |
|---|---|---|---|
| 15 Oct 2026, 16:05 | Go-live (WP-20) | `8752162` | See "Go-live record" above |
| 15 Oct 2026, 20:02 | **Polish round 1** (AB typed "RELEASE POLISH 1"): plain customer language on every public page; the homepage "Everything your property needs" section replaces the ecosystem diagram (now on admin → Pillars and modes); AB's support line and hero eyebrow; Knowledge & Advice without dead ends; focus rings for keyboard only; 28 of 31 audit issues fixed. Details: `docs/POLISH_AUDIT.md`; AB's live checklist: `docs/LIVE_JOURNEY_TEST.md`. No database change. | `16c3ce8` (parents `8752162` and `9ac9431`) | Before merging: unit 230/230; full browser run 480 passed, 2 failed because the Codespace disk filled up, and both passed when rerun (9 of 9, then 4 of 4 repeats); clean build, lint and typecheck pass. After: production served `16c3ce8` 100 seconds after the push; `/api/health` ok; read-only production smoke tests 178 passed, 0 failed (2 need `CRON_SECRET`, empty in the Codespace); all 72 public pages at 390 px and 1440 px load with no console errors from our code, no sideways scroll and none of the banned internal words (`/property/map` is off by design, no map provider); the homepage shows the new eyebrow, support line and services section |
| 15 Oct 2026, 22:43 | **Final small changes** (authorised by AB in the brief): thin divider lines (existing border colour, 32 px phones / 36 px wider) between the four service groups on the homepage and About; header menus fixed so a menu opened by a click stays open while the mouse travels to a link (All services, the main-row menus, List with us), with new browser tests that failed before the fix. Rounds 2 and 2b were not released. | `a2247e3` (parents `1f97a41` and `618a64b`) | Before: lint, typecheck, build, unit 230/230, browser tests for header menus, homepage and navigation, plain language, phone widths, About and smoke: 249 passed, 0 failed. After, on www.hagerland.com (read-only): `/api/health` ok on `a2247e3`; dividers present on the homepage and About at 1440 and 390 px; "All services" → "Buy & Sell Property" opens `/buy`; the Maintain menu's last link opens the right page |
| 16 Oct 2026, 04:52 | **Priorities** (authorised by AB in the brief): a "Start here" band under the hero with Supplies, Jobs and Knowledge & Advice as three larger cards; "Everything your property needs" now holds the other seven in rows without gaps (Property 3, Build and improve 2, Coming soon 2); Supplies, Jobs and Advice first in the desktop menu, All services and the mobile menu (More now holds Finance and Insurance only); About follows the same groups. Wording: group titles "Supplies, jobs and advice", "Property" ("Buy, sell, rent and look after property, with our own estate agents and Property Care."), "Coming soon" ("Finance and insurance through licensed partners."), the "Supplies, jobs and advice" line, band heading "Start here", buttons "Browse supplies" and "Post a job"; replaced "Buy, sell and rent", "Own and manage", "Supplies and jobs" and their lines. The Advice menu label ("Advice & guides") comes from admin → Pillars and modes. | `e81b589` (parents `84f1fb2` and `8fa531f`) | Before: lint, typecheck, build, unit 230/230, browser tests for header menus (All services and every dropdown), homepage and navigation, plain language, phone widths, About and smoke: 249 passed, 0 failed. After, on www.hagerland.com (read-only): `/api/health` ok on `e81b589`; band order and gap-free rows confirmed; All services, Supplies and Advice menus, the Jobs link and the mobile menu all open the right pages; no page errors |
| 21 Oct 2026, 10:19 | **Sitemap index** (`fix/sitemap-index`, authorised by AB in the brief): `/sitemap.xml` now answers 200 `application/xml` with a `<sitemapindex>` of the 11 per-type sitemaps, and robots.txt names it as its first Sitemap line (the 11 existing lines and every Allow/Disallow rule unchanged). Root cause: `app/sitemap.ts` uses `generateSitemaps`, so Next 15 serves only `/sitemap/[id].xml` and creates no `/sitemap.xml`; that URL (the one in Search Console) fell through to the 404 page. Fix: route handler `app/sitemap.xml/route.ts`; the index and robots.txt both build their list from `sitemapUrls()` in `lib/sitemap-rules.ts` (origin `NEXT_PUBLIC_SITE_URL`, else www.hagerland.com), which also now holds the robots Disallow list and the static paths. Static sitemap: all 39 live URLs checked (200, no redirect, `index, follow`, not disallowed), so **nothing added or removed**: `/developments` (other developers' projects) and `/contractors`, `/repairs-maintenance` are real indexable pages; `/agents` was already listed; `/our-developments`, `/finance`, `/insurance` and `/guides` are left out because they are Coming soon / empty and carry `noindex` (the sitemap already drops them until they go live). Tests: new unit tests (index = robots list, static paths never disallowed), an e2e check in `e2e/seo.spec.ts` (not run: needs the local stack; run only the targeted checks per the brief) and a read-only production check in `smoke-prod`, passed on live. | `1afcc12` | `/api/health` ok (version `1afcc12`); homepage 200; `/sitemap.xml` valid index; all 11 child sitemaps 200 XML; robots.txt index line first; smoke-prod sitemap and robots tests 2/2 passed on live |
| 21 Oct 2026, 19:01 | **Guide studio** (`feature/guide-studio`, authorised by AB in the brief; how-to and field mapping in `docs/GUIDE_STUDIO.md`): admin-only `/roodber8/guides/studio` builds a prompt for AB's own Claude chat (Topic / Idea / Reference URL, topic, reader, guide type, length; 40 static ideas marked “Already exists” when a similar guide title exists; copy button) and `/roodber8/guides/import` validates the returned JSON (fences stripped, plain-English per-field errors, HTML refused, unapproved links removed), previews it with the real public guide renderer (now shared as `GuideArticle`) and imports it as a draft with “Needs AB review”, audited as `guide.import`. `[CHECK: …]` notes block “Content checked” and publishing server-side (gold notice on the edit page), and a guide containing one answers 404 and is left out of lists and `/sitemap/guides.xml`. Decisions: no migration; guide text stays in the existing plain-text format (`## `, `- `), so the prompt asks for that and links are kept as their words (clickable links in guide text deferred: needs a small public renderer change); `reader`, `guide_type`, `read_time_minutes` are not stored (no columns); marker count is computed server-side; a database-level marker block is deferred (migration). The 9 existing guides have no markers (checked on the local copy). No AI calls, keys or paid services. Tests: 20 new unit tests; new browser test `e2e/admin/guide-studio.spec.ts` (sign-out redirect, build and copy a prompt, validate, preview, import on the local stack only, publish blocked) plus the existing guides test, 7 of 7 passed; admin, staff and plain-language tests passed. | `1fd8ed2` | `/api/health` ok (version `1fd8ed2`); homepage, `/advice`, `/guides` 200; published guides `/guides/buying-checklist` and `/guides/property-glossary` 200; `/sitemap/guides.xml` 200 XML; `/roodber8/guides/studio` and `/import` redirect to `/roodber8-login` when signed out |
| 21 Oct 2026, 19:17 | **Clickable links in guides** (`feature/guide-links`, authorised by AB in the brief; link format and approved list in `docs/GUIDE_STUDIO.md`): `[anchor text](/path)` in guide paragraphs and bullets renders as a green link (existing body-link style `font-semibold text-green hover:underline`, global focus ring) only when the path, optionally with a `#fragment`, is on the Guide studio approved list (`lib/guides/studio-options.ts`, the single source for prompt, importer and renderer); external, unknown, `javascript:`/`data:` and broken links show as their plain words. The prompt now asks for 2–4 links in exactly that form; the importer keeps approved links and turns every other link into words, listing each change in the preview (which uses the same renderer). Decisions: links only in guide text, never in title, summary or FAQ; the `.gov.et` exception is dropped (government links now become plain words like any external link), so the unused helper went with it; Vitest now compiles JSX (`vitest.config.mts`) so the renderer is unit-tested; CHECK guard and publish block unchanged; no existing guide edited. Tests: new renderer unit tests incl. a snapshot proving link-free guides render as before, updated prompt/import tests (260 unit tests pass); guides, Guide studio and plain-language browser tests 79/79. | `c83c740` | `/api/health` ok (version `c83c740`); homepage, `/advice` 200; `/sitemap/guides.xml` 200 XML; `/guides/buying-checklist` and `/guides/property-glossary` 200 and their article HTML byte-identical to before the release (fresh render, cache MISS) |
| 23 Oct 2026, 14:06 | **Supply partners, Phase 1a** (`feature/supply-partners`, authorised by AB: RELEASE SUPPLY PHASE 1; spec `docs/HAGERLAND_SUPPLY_INTELLIGENCE_BLUEPRINT.md`, merged in with it; how-to `docs/SUPPLY_PARTNERS.md`): **migration 0034 applied to live by AB** before the release, verify query `docs/sql/0034_supply_partners_verify.sql` 11/11 PASS. New private tables `supply_partners` and `supply_contacts` (RLS on, no grants, server only). Admin: a “Supply partner” panel on every organisation page (roles, relationship status, other names, source and confidence, verification dates and private evidence files, re-verify date defaulting to 12 months after the latest check, notes, phone-first contacts with consent and a red “Do not contact” flag), possible duplicates by phone and similar name before a record is created, and a new “Supply partners” list (filters for status, role, re-verification due; search by name, other name or any phone). Merging organisations carries supply records and contacts. Operations staff get `/roodber8/supply/partners`; agent and content do not. Decisions in `docs/RELAUNCH_PROGRESS.md` (Supply intelligence). No public page changed; organisations CSV unchanged. Tests: lint, typecheck, build, unit 299/299, RLS 193/193 local, new browser tests 3/3 plus existing merge, admin, staff and plain-language 80/80. | `415f274` | `/api/health` ok (version `415f274`, so migration 0034 is present on live); homepage, `/advice`, `/supplies` 200; `/roodber8/supply/partners` signed out redirects (307) to `/roodber8-login` |
| 23 Oct 2026, 14:52 | **Private organisations and “Add new supplier”** (`fix/private-suppliers`, authorised by AB in the brief; no migration): admin → New organisation now asks for Visibility, default “Keep private” (status `draft`, source `admin`); “Publish now with the Listed badge” keeps the old behaviour. Supply partners has “Add new supplier” (Supplier, Building and construction supplies ticked, Keep private) which creates the private organisation and its supply partner record (“Discovered”) in one action, both audited, and lands on the Supply partner panel; if the second step failed the page says so and offers “Create supply partner record”. Both forms warn about possible duplicates (normalised phone across organisation phone/WhatsApp/Telegram and contacts, plus similar names) with links, never blocking. Organisation pages have a visibility banner with Publish (confirmation “Publish only after confirming the details with the business”) and Make private, audited as `organisation.publish`/`organisation.unpublish`, stale-edit checked, refreshing the company page, lists, search, products and sitemaps; never offered on HagerLand’s own organisations. Organisations list shows “private” and filters on it. Decisions: `draft` rather than `pending_review`, so private leads stay out of the Review queue, the Imports review tab and the daily “waiting for review” count; pillars ticked on the admin create form are now saved (they were ignored before; edits unchanged); the redirect cannot carry `#anchor`, so the page scrolls to the panel itself. Discovery: every public path already reads only published organisations, so no public code changed. Tests: lint, typecheck, build, unit 300/300; new browser tests 5/5 incl. the J1–J8 journey and a 19-path public exclusion matrix (private hidden, published shown, hidden again: all as expected); regression 130 passed, 2 failed in the long run then passed alone (staff timing; supply list clashed with this test's leftover data, fixed in the test). | `1191320` | `/api/health` ok (version `1191320`); homepage, `/supplies`, `/professionals` 200; `/sitemap/companies.xml`, `/sitemap/products.xml` 200 XML; `/roodber8/supply/partners` and `/roodber8/organisations` signed out redirect (307) to `/roodber8-login` |
| 23 Oct 2026, 15:14 | **CLAUDE.md: standards for every job** (`docs/claude-md-standards`, authorised by AB in the brief; docs only): new section “Standards for every job (AB's rules)”, 25 numbered rules: understand before changing, AB's click-by-click journey tested end to end (including how data first gets in), side-effect hunt (public paths, admin flows, emails, cache, roles, existing data, silent failures), stop rules, safety and release procedure, tests, the final report format, and working style (Ethiopia first). Existing rules kept word for word; overlaps point to the stricter existing rule (no SQL against the live database, lint/typecheck/build always, “Needs AB” items are a stop). | `97607c9` | `/api/health` ok (version `97607c9`) |
| 23 Oct 2026, 16:28 | **Supply prices, Phase 2** (`feature/supplier-offers`, authorised by AB: RELEASE SUPPLY PHASE 2; how-to `docs/SUPPLY_PARTNERS.md`): **migration 0035 applied to live by AB** before the release, verify query `docs/sql/0035_supplier_offers_verify.sql` 8/8 PASS. New private table `supplier_offers` (RLS on, no grants, server only; one current price per partner, branch, item and unit; a new price supersedes the old one in the same statement by trigger, history kept). Admin: price list per partner (`/roodber8/supply/partners/<id>/offers`) with Add price, Paste a price list (checked preview, all lines or none), History, Withdraw and Fresh/Ageing/Expired badges; default validity 7 days for cement and reinforcement steel, 14 if foreign-currency-linked, 30 otherwise; price counts on the Supply partner panel and the partners list with a Prices filter; Prices expiring this week (`/roodber8/supply/partners/expiring`) with whom to call, never a do-not-contact person, nothing sent. Merge moves prices (newer stays current). CLAUDE.md: the outdated relaunch-branch working rule now points to “Standards for every job”. Public product prices never written; no public page changed. Tests: lint, typecheck, build, unit 357/357, RLS 195/195 local, new browser tests 5/5 (journey J1–J8, security, simultaneous saves, all-or-nothing paste, merge), regression 123/123. | `8139e00` | `/api/health` ok (version `8139e00`, so 0035 is present on live); homepage, `/supplies`, `/supplies/building-materials` and `/supplies/building-materials/cement-concrete` 200; `/sitemap/products.xml` 200 XML (empty: no published products on live yet, so no product page could be opened; an unknown product address returns 404); `/roodber8/supply/partners` signed out redirects (307) to `/roodber8-login` |
| 23 Oct 2026, 17:10 | **Admin menu: grouped, searchable, collapsible** (`feature/admin-nav-groups`, authorised by AB in the brief; no migration): the 40 admin menu items, unchanged in label and address, now sit in 11 groups in AB's order (Overview, Customer requests, Supplies, Jobs, Property, Businesses & people, Money, Content, Insights, Setup, System); click a group heading to collapse it (remembered per browser; the current page's group always stays open); “Find a section” at the top filters as you type, with a few other words (money, suppliers, prices, staff, jobs, blog, articles…), Enter opens the first match, Esc clears, “/” jumps to it; same on the phone menu. Roles unchanged: staff see only their items, and groups with nothing for them are hidden. Decision: the staff dashboard's list of areas now follows the same group order. No item needed placing outside AB's list. Tests: lint, typecheck, build, unit 366/366 (incl. a check against the old 40-item list), new browser tests 5/5 (groups, collapse after reload, search, shortcut, Enter, Esc, active item on nested pages, every menu link 200, operations sees only its groups, phone menu), regression 89/89. | `3f71b1e` | `/api/health` ok (version `3f71b1e`); homepage 200; `/roodber8` signed out redirects (307) to `/roodber8-login` |
| 23 Oct 2026, 18:17 | **Supply Phase 3: suppliers for each customer quote** (`supply/phase-3-quote-suppliers`, authorised by AB: RELEASE SUPPLY PHASE 3; how-to “Finding suppliers for a quote” in `docs/SUPPLY_PARTNERS.md`): **migration 0036 applied to live by AB** before the release, verify query `docs/sql/0036_supply_quote_lines_verify.sql` 20/20 PASS. Quote items gain added_by_admin, category, removed_at/by (defaults only); the customer read rule now hides HagerLand-added items (ALTER POLICY, nothing dropped); new private `supply_quote_lines`. Admin quote page: Add item (labelled “Added by HagerLand”, edit, soft remove), Suppliers panel (suggestions ranked by delivered total with plain reasons, Trial label, Not suggested with reasons, add manually, Mark as asked with contacts and do-not-contact blocked, Enter reply optionally saved as the supplier’s price through the Phase 2 path, comparison, basket with the 3% one-supplier rule, choose one per item, reject with reason), Suggested total (owner-only margin and commission worked out on screen, not stored). Closed quotes read-only. Issue quote, customer emails and /account/quotes unchanged. Also fixed: a delivery charge of 0 was refused when adding a price. Tests: lint, typecheck, build, unit 384/384, RLS 198/198 local, new browser tests 4/4 (journey J0–J12), regression 128/128. | `1bf9648` | `/api/health` ok (version `1bf9648`, so 0036 is present on live); homepage, `/supplies`, `/supplies/materials-list` 200; `/roodber8/quotes` signed out redirects (307) to `/roodber8-login` |

## 1. What is finished

### The website

| Area | What it does |
|---|---|
| **Homepage** | Search with tabs (Buy, Rent, Supplies, Professionals). The sections follow the spec and only show when they have real content. Business details come from admin Settings. |
| **Property marketplace** | Results for sale and to rent, filtered by place, plus listing pages with photo gallery, key facts, safety tips, contact reveal and an enquiry form. Owners list through a step-by-step wizard. Every listing is reviewed before it goes live and expires after 60 days, with a reminder email first. |
| **HagerLand Supply** | Catalogue by category, product pages, a quote list, a materials-list upload and a "quote sent" page. Customers can download their quote PDF from their account. |
| **Professionals** | Service and location directories, company profiles with portfolio, claiming of imported businesses, and Verified badges. |
| **Developments** | Third-party developments and your own HagerLand Developments, always labelled as yours, with a register-interest form. |
| **Search** | One search across property, supplies, professionals and developments. Searches with no results are logged so you can see what people want. |
| **Accounts** | Sign up (by audience), email confirmation, sign in (password or email link), onboarding, listings, enquiries inbox, quotes, company profile, portfolio, verification, developments and settings (including "delete my account"). |
| **Content pages** | About, How it works, List with us, Contact, Help (with safety advice), Terms, Privacy and Cookies. |

### The admin (`/roodber8`)

All 17 sections in spec 18.2 are built: dashboard, review queue (9 tabs), properties, developments (with CSV import), organisations (members, merge, verification documents), products (specs builder, photos, CSV price and stock update), categories, locations (Amharic names, page intros, merge), enquiries, quotes (issue a quote with a PDF and email), HagerLand sales, users (suspend, password reset, carry out deletion requests), promotions, Google imports (with AI-drafted descriptions and bulk review), reports (CSV and simple charts), settings, the audit log and a global search. Every admin action is recorded in the audit log.

### Added in Phase 1.5 (October 2026, Sections 24–25)

| Area | What it does |
|---|---|
| **Verticals** | Every part of HagerLand can be shown Live, Coming soon or Hidden. Coming-soon parts have their own page with register-interest and become-a-partner forms, and are hidden from search engines. Since Section 26, most parts follow the pillar modes (admin → Pillars and modes); Professionals and Diaspora keep their own switch. |
| **Service requests** | One request goes to up to three suitable providers chosen by HagerLand; providers accept and quote; the customer compares and chooses. Emergencies are flagged. Deals, lead fees and commissions are recorded. Repairs, contractors, valuations, finance, insurance and recruitment all use it. |
| **International** | Countries and cities abroad, Ethiopian-run businesses abroad, approximate prices in other currencies (only once you enter rates). |
| **Diaspora and Property Care** | A diaspora hub and HagerLand Property Care: consultation requests, pipeline, managed properties, private inspection photos, rent statements. |
| **Property extras** | Estate agency pages, save, compare, saved searches with email alerts, map (once a tile provider is set), property-type pages, valuation and financing requests. |
| **Supplies extras** | Suppliers manage their own products, Special Buys, trade accounts and trade prices. |
| **Jobs** | Job board, applications with CVs and candidate profiles. Live since Section 26 (recruitment approved), with recruitment and placement by HagerLand and candidate and employer registers. |
| **Teams** | Businesses invite colleagues with roles and add branches. |
| **Guides and estimator** | A guides hub (three starter drafts for your review) and a build-cost estimator that appears once you enter rates. |
| **Amharic** | `/am` version of the site's menus and homepage, switched off until a native speaker has reviewed it. |
| **Hardening** | Emails that fail are retried; stale edits are refused instead of overwriting; "Download my data"; old API addresses answer "gone"; retention clean-ups; health checks; Next.js 15 / React 19. |

### Added in Section 26 (15 October 2026): the property ecosystem

Built from AB's ecosystem diagram (`docs/PROPERTY_ECOSYSTEM_MODEL.png`), the brief (`docs/BRIEF_SECTION_26.md`) and AB's update of the same day (regulatory approval covers every service).

| Area | What it does |
|---|---|
| **Ten pillars and three modes** | Buy & Sell, Rent & Let, Build & Develop, Repair & Maintain, Manage, Finance, Insurance, Knowledge & Advice, Supplies, Jobs. Each has three switches in admin → **Pillars and modes**: Direct ("Provided by HagerLand"), Aggregate ("Trusted partners") and Interest ("Register your interest"). Any mode on shows the pillar; Interest alone shows "Coming soon"; all off hides it everywhere. Switching Direct or Aggregate on needs a short **stage-gate checklist** (owner, capability, verified partners for Aggregate, regulatory clearance pre-filled "confirmed by AB, 15 Oct 2026", terms), recorded in the audit log. The older area switches now follow the pillars. |
| **Navigation and homepage** | Seven lifecycle menus (Buy · Rent · Build · Maintain · Manage · Supplies · More), an "All services" panel, "Living abroad?", hubs at `/buy` `/rent` `/build` `/maintain` `/manage` `/advice` (Supplies, Finance, Insurance and Jobs use their existing pages), a "From abroad?" panel and next steps on every hub, a "Part of …" link on deeper pages, and the homepage "Property ecosystem" drawn from your diagram (keyboard and screen-reader friendly, a simple list on phones). |
| **HagerLand estate agency** | Admin → **Agency**: contacts with consent records, buyer and tenant requirements matched to live listings (match emails only with consent), instructions from lead to completion with written terms, valuations, viewings (confirmation and reminder emails, video links, feedback), offers (non-binding wording, owner decisions, sale progression checklist), applications to rent, tenancies (renewal and notice reminders), tasks, timelines, private documents, reports and CSV. Completing an instruction creates the deal (commission or letting fee). Public: Book a valuation, and on listings you market: Book a viewing, Make an offer, Apply to rent. Customers follow everything in their account. Licence numbers appear on agency pages, the footer and the terms once entered in Settings. |
| **Rent & Let** | Landlord services (let only, let and manage, management only) with an editable rent-ready checklist, a page explaining how renting through HagerLand works, tenancy records, and repairs on managed tenancies sent to Repair & Maintain. |
| **Manage Property** | Owner portal at `/owner` for owners you link to a managed property: inspections with private photos, rent statements, maintenance log, shared documents, messages and repair requests. Its own switch (on). |
| **Repair & Maintain** | Admin can give a request to HagerLand's own team ("HagerLand Services") as well as, or instead of, providers, and send HagerLand's quote; customers see the same flow. |
| **Build & Develop** | "Start a building project": a four-step brief that creates one project reference (HLP-…) with linked design, engineering and contractor requests, a materials quote and finance interest, all on one project page. |
| **Knowledge & Advice** | Market insight (median asking prices by area and type, only with enough listings, always "not valuations"), area guides on place pages (your notes and FAQs), checklists and a glossary (drafts for your review), newsletter with its own consent and one-click unsubscribe. |
| **Providers and reviews** | Businesses choose the pillars they serve; their lead list shows the pillar of each lead. Verified reviews only from customers who chose the provider for a job, moderated, one reply, average on profiles, rating data for search engines from three reviews. |
| **Demand and performance** | Admin → **Demand**: interest, unmatched and declined requests, empty searches and enquiries by pillar, category, place and country, weekly trend, activation recommendations linked to each stage gate, monthly CSV, a line in the daily digest. Admin → **Performance**: leads, median first response, conversion, revenue, live listings and providers per pillar, plus agency figures, with CSV. |
| **Staff accounts** | Admin → **Staff**: invite staff as owner, agent, operations or content. Each sets a password and must connect an authenticator app; each sees only their role's areas (checked on every page and action); their actions are logged under their name; disabling ends access at once. Your master sign-in stays as your break-glass access. No staff exist until you invite someone. |
| **Content and legal** | Estate agency terms of business, Property Care, building projects and reviews in the Terms; agency, tenancies, reviews, newsletter and staff access in Privacy. All drafts for your lawyer. |

### Behind the scenes

- **Daily job** at 06:00 UTC, which:
  - expires old listings and emails their owners;
  - sends reminders 7 days before expiry;
  - expires quotes 14 days after they are issued;
  - switches featured badges on and off;
  - deletes old verification documents and old contact-reveal records;
  - emails you a digest, only when there is something to report.
- **Search engines:** sitemaps split by type, robots.txt, a canonical address on every page, structured data, and branded share images for WhatsApp, Facebook and Telegram previews.
- **Security:**
  - row-level security on every table;
  - security headers on every page;
  - rate limits on sign-ups, enquiries, quotes, contact reveals and admin sign-in;
  - upload checks (file type, size and content);
  - no secrets in the browser.
- **Monitoring:** server errors are counted in the `errors` table and appear in the daily digest. Vercel Analytics and Speed Insights record cookieless events on Vercel.

### Evidence (final commit on `relaunch/construction`, 15 Oct 2026, after Section 26)

| Check | Result |
|---|---|
| Lint (`npm run lint`) | No warnings or errors |
| Type check (`npx tsc --noEmit`) | 0 errors |
| Clean production build (`rm -rf .next && npm run build`) | Succeeds with no warnings (Next.js 15.5.28, React 19). JavaScript shared by every page: 103 kB; homepage 145 kB, every public page under the 170 kB budget |
| Unit tests (Vitest) | 230 passed, in 36 files |
| Browser tests (Playwright, local copy of the database) | **408 passed**, 61 skipped by design (tests that only apply to one screen width), 0 failed |
| Production smoke tests (read-only, `smoke-prod/`), rehearsed on the local build | 178 passed; the only failure is the health check reporting the email and Turnstile keys, which the test copy does not have |
| Database security test (`supabase/tests/rls_test.sql`) | 190 of 190 PASS (local copy, also after the legacy lockdown) |
| Migrations on a copy in the live state (22 legacy tables + 0001–0009) | All 24 (0010–0033) apply, each as one transaction, each check PASS; a second run applies nothing |
| Legacy lockdown proof | 23 of 23 PASS (rehearsal); reverse script restores the old reads |
| Preflight (`scripts/preflight.sh`) against the local build | All PASS except the email and Turnstile keys (test copy) |
| Accessibility (axe, WCAG 2.2 AA) | 0 serious or critical problems on every public, account and admin page, including every Section 26 page |
| Phone and screen widths | No sideways scrolling at 360, 390, 768, 1024 and 1440 px |
| Link crawl | 0 broken internal links |
| `npm audit` | 0 critical; no Next.js advisories; Section 26 added no packages; build-time tooling findings explained in `docs/qa/npm-audit-2026-10-15.md` |
| Legacy sweep (`scripts/legacy-sweep.sh`) | No relevant hits ("pillars" is a word of the new platform again and is no longer searched) |
| Requirements matrix (`docs/REQUIREMENTS_MATRIX.md`) | See "Requirements matrix summary" below |
| Speed (Lighthouse, phone) | See below and `docs/qa/lighthouse-2026-10-15-s26.md` |

The browser tests cover these complete journeys:

- An owner signs up, lists a property with photos, HagerLand approves it, a visitor reveals the phone number and sends an enquiry, and the owner sees it in their inbox.
- A contractor creates a business profile, it is approved, they upload verification documents and are marked Verified.
- Someone claims an imported business.
- A guest builds a quote list and HagerLand issues a quote.
- A guest sends a materials list with a file.
- A visitor registers interest in HagerLand Developments.
- A visitor sends the contact form.

They also cover every admin screen, admin sign-in and lock-out, the daily job, sitemaps, share images, canonicals, structured data, security headers, upload abuse and rate limits.

**Lighthouse (phone settings, test build, after Section 26).** Full tables: `docs/qa/lighthouse-2026-10-15-s26.md` (earlier runs: `lighthouse-2026-10-15.md`, `lighthouse-2026-10-13.md`).

| Page | Performance, real slow-4G throttling | Performance, simulated (two runs) | Accessibility |
|---|---|---|---|
| Homepage | 91 (quiet machine; 84 under load) | 73–81 | 100 |
| Property page | 89 | 70–77 | 100 |
| Product page | 92 | 76–79 | 100 |
| Company page | 93 | 80–85 | 100 |
| Jobs board (`/jobs`, now live) | 86 | 74–86 | 100 |
| Buy hub (`/buy`, new) | 92 | 75–82 | 100 |

- **Largest paint with real slow-4G throttling:** 1.6–1.9 s (target under 2.5 s).
- **Layout shift:** at most 0.027 (target under 0.1).
- **This Codespace has 2 CPU cores** and scores move by up to 10 points between identical runs; the homepage went from 94 to 91 after Section 26 added the ecosystem diagram and the All services panel.
- **SEO and best-practice scores** read lower on test builds only because they are deliberately marked "do not index" and run over plain http.
- **Please check on the Vercel preview** (section 3, step 13): several pages are below 90 here.

### Problems found and fixed during final testing

1. **Owners could not see enquiries from visitors without an account.** These are most enquiries. The inbox, the unread badge and the overview count are fixed and tested.
2. **The duplicate-business warning blocked sign-up.** Clicking "No, none of these. Create my business." did nothing. It now works and is tested.
3. **Accessibility fixes:**
   - the gold buttons and gold text are a little darker so they are readable (the brand gold #B8862E itself is unchanged);
   - the blue info messages and badges are darker for the same reason;
   - breadcrumb links and the links on the "page not found" screen are bigger, so they are easier to tap.
4. **Speed fixes:**
   - about 60 kB less code on every page;
   - admin screens no longer load all the other admin screens in the background.
5. **Found in the Section 26 regression (S12):**
   - the Build page linked to the build-cost estimator even when no build-cost rates exist, which gave "page not found". The link now shows only when the estimator is available;
   - the new header menus (Buy, Rent, Build, Supplies, All services, Living abroad?, the mode badges) had no Amharic text. They are added to the Amharic catalogue, which still needs a native speaker's review before Amharic is switched on;
   - if you switch a pillar's last mode off and straight back on, the site can keep showing it as hidden for up to 5 minutes (a page drawn in between refills the cache). Switch once, or wait a few seconds between switches.

### Decisions I made where the spec left a choice

| Decision | Why |
|---|---|
| Business details (phone, email, legal name, social links, delivery area, quote reply time, "why buy" points, announcement, homepage picks) are edited in **admin → Settings**, not in code | You can change them without a developer. Anything empty is hidden. |
| Migration **0010** lets the website read the new settings | Additive only. It changes no data. |
| The daily job does **not** delete expired rows from the old `rate_limits` table unless you set `CRON_PURGE_RATE_LIMITS=true` | The rules forbid deleting data from pre-existing tables without your agreement. The rows are only short-lived counters, so switching it on is safe. |
| Quotes are valid for **14 days** | This is the spec's quote terms. The daily job then marks them expired. |
| No map pin at launch | No map provider has been confirmed. If you add `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY`, places that have coordinates (for example imported businesses) show a Google map. Otherwise they show an "Open in Google Maps" link. |
| Sentry is not added | Errors are counted in the `errors` table and reported in the daily digest instead. |
| Rate limiter counts per fixed time window, not a sliding window | Simpler and good enough at launch. |
| HEIC photos (iPhone) | The image library cannot read HEIC. Phones convert to JPEG when uploading through a browser, so this is not a problem in practice. |
| Turnstile (anti-bot check) | Skipped only when its secret is not set, which is the case on previews and tests. Production must have it. |
| AI drafts for imported businesses use `claude-sonnet-5-5` | You can change the model with `ANTHROPIC_MODEL`. Every draft is reviewed by you before going live. |
| The old About, Contact and Terms pages were removed in WP-1 | They were rebuilt in WP-13. |
| The `gold-dark` and `info-dark` colour tokens are slightly darker | Needed for readable contrast (WCAG AA). |

Phase 1.5 decisions are in the "Phase 1.5 decisions log" at the end of this report.

### Requirements matrix summary

`docs/REQUIREMENTS_MATRIX.md` lists 1,038 requirements from spec Sections 1–26 and PLATFORM_VISION (summary: `bash scripts/matrix-summary.sh`):

| Status | Count |
|---|---|
| Done (with a passing test or a recorded verification) | 1,029 |
| Deferred by rule (Sections 25.3 and 26.17: payments, SMS codes, WhatsApp Business API, live bank/insurer partner connections, native apps, BirrBank, a valuation/price-history dataset) | 9 |
| Not done | 0 |

Rows that can only be completed by you (for example the Resend domain, the lawyer's review, secrets) are marked Done for the platform side and point to the step in section 3 that finishes them; the cutover checks them again (health check and preflight) before and after going live.

---

## 2. Page-by-page review checklist

**Where to open the preview:** Vercel → project **hagerland-platform** → **Deployments** → the newest deployment from branch `relaunch/construction` → **Visit**. Then add each path below to the end of that address (for example `…vercel.app/property/for-sale`).

On a fresh preview most lists will be empty until content is added. Check that the empty states look deliberate and helpful.

For each page, check it on your phone and on a computer:

- it looks right;
- the wording is right;
- nothing looks unfinished;
- buttons are easy to tap.

### Public pages

| ✓ | Path | What to check |
|---|---|---|
| ☐ | `/` | Hero, search tabs, sections, footer (your details appear only once set in Settings) |
| ☐ | `/property` | Property hub |
| ☐ | `/property/for-sale` and `/property/to-rent` | Filters (phone: the filter sheet), sorting, empty state |
| ☐ | `/property/for-sale/addis-ababa/bole` | Location page and its intro text |
| ☐ | `/property/<a listing>` | Gallery, price, key facts, safety tips, "Show phone number", enquiry form |
| ☐ | `/supplies` | Categories and how quotes work |
| ☐ | `/supplies/<category>` | Category page |
| ☐ | `/supplies/product/<a product>` | Product page and "Add to quote" |
| ☐ | `/supplies/quote` | Quote list and request form |
| ☐ | `/supplies/materials-list` | Upload a list and request a quote |
| ☐ | `/professionals` and `/professionals/<service>` | Directory and service pages |
| ☐ | `/agents`, `/developers`, `/suppliers` | Directory hubs |
| ☐ | `/company/<a company>` | Profile, portfolio, Verified badge, "Claim this business" (unclaimed only) |
| ☐ | `/company/<a company>/claim` | Claim form |
| ☐ | `/developments` and `/developments/<one>` | Third-party developments |
| ☐ | `/our-developments` | HagerLand Developments, gold treatment, register interest |
| ☐ | `/search?q=bole` | Combined search |
| ☐ | `/about`, `/how-it-works`, `/list-with-us` | Wording |
| ☐ | `/contact` | Contact options (from Settings) and the form |
| ☐ | `/help` | FAQs and safety advice |
| ☐ | `/terms`, `/privacy`, `/cookies` | **For your lawyer** (section 3, step 10) |
| ☐ | `/login`, `/signup`, `/signup?type=owner` | Sign-in and sign-up |
| ☐ | `/any-wrong-address` | "Page not found" screen |
| ☐ | `/contractors`, `/repairs-maintenance` | Service hubs with "Get quotes" and the emergency route |
| ☐ | `/request-service/plumbers` (and other services) | Request form with its own questions; emergency option where it applies |
| ☐ | `/requests/resend` | "Send me my request link again" |
| ☐ | `/diaspora`, `/diaspora/services-abroad?country=GB`, `/diaspora/property-care` | Diaspora hub, services abroad, Property Care consultation form |
| ☐ | `/agency`, `/agency/sell`, `/agency/let`, `/agency/buyer-representation`, `/agency/property-sourcing`, `/agency/developer-sales` | Estate agency pages (no fees shown) |
| ☐ | `/property/compare`, `/property/map` | Compare (up to four); map only appears with a tile provider |
| ☐ | `/property/for-sale/addis-ababa/bole/apartments` | Property-type page |
| ☐ | `/supplies/special-buys`, `/supplies/trade` | Special Buys (empty until you add one), trade account application |
| ☐ | `/finance`, `/insurance` | Coming-soon pages: what is coming, register interest, become a partner, “From abroad?” and next steps |
| ☐ | `/jobs` | Live job board, “Recruitment and placement by HagerLand”, candidate and employer registers |
| ☐ | Header: menus, **All services**, **Living abroad?**; phone: the menu | Seven lifecycle menus with mode labels; every pillar and both layers in the drawer (Section 26) |
| ☐ | `/` “Property ecosystem” section | Your diagram: PROPERTY in the middle, pillars 1–8 around it, Supplies and Jobs below, Diaspora and Professionals as layers, the journey strip |
| ☐ | `/buy`, `/rent`, `/build`, `/maintain`, `/manage`, `/advice` | Pillar hubs: what each does, “Provided by HagerLand” / “Trusted partners”, actions, deeper pages, “From abroad?”, next steps |
| ☐ | Any deeper page, e.g. `/property/to-rent` | “Part of Rent & Let Property” link at the top |
| ☐ | `/agency/valuation`, `/agency/landlords`, `/agency/tenants` | Book a valuation; landlord services with the rent-ready checklist; how renting through HagerLand works |
| ☐ | A listing marked “Marketed by HagerLand”: `/property/<listing>`, `/viewing`, `/offer` or `/apply` | Agency panel, viewing form (in person or video, your time zone), offer form (non-binding wording), application form (optional documents) |
| ☐ | `/build/project` | Four-step building project brief (sign in first) |
| ☐ | `/advice/market-insight`, `/advice/checklists`, `/advice/glossary` | Market figures appear once 5 listings exist per figure; checklists and glossary say “coming shortly” until you publish the drafts |
| ☐ | `/property/to-rent/addis-ababa/bole` (bottom) | “About Bole”: market figures and your area guide once published |
| ☐ | `/owner` | Owner portal (owners you link only) |
| ☐ | `/company/<a company>` with reviews | Reviews with average and replies |
| ☐ | `/newsletter/unsubscribe` (from a newsletter email) | One-click unsubscribe |
| ☐ | `/guides` | Hidden from search engines until you publish a guide |
| ☐ | `/build-cost-estimator` | "Page not found" until you enter build-cost rates (then the estimator) |
| ☐ | `/advertise` | Advertising enquiry form |

### Account pages (sign up with a test email first)

| ✓ | Path | What to check |
|---|---|---|
| ☐ | `/onboarding` | Welcome and choices |
| ☐ | `/account` | Overview |
| ☐ | `/account/listings`, `/account/listings/new` | Listing wizard (all steps), pause, renew, edit |
| ☐ | `/account/enquiries` | Inbox (Received, Sent by me, statuses) |
| ☐ | `/account/quotes` | Quote requests and quote PDF download |
| ☐ | `/account/company` | Business profile |
| ☐ | `/account/company/portfolio` | Portfolio projects |
| ☐ | `/account/company/verification` | Document upload |
| ☐ | `/account/developments` | Developer's developments |
| ☐ | `/account/settings` | Profile, password, "Download my data", delete account, sign out |
| ☐ | `/account/saved`, `/account/alerts` | Saved properties and saved searches with alerts |
| ☐ | `/account/requests` | Service requests you sent |
| ☐ | `/account/service-requests` | As a provider: requests offered to you, accept, quote |
| ☐ | `/account/products` | As a supplier: your products, submit for review |
| ☐ | `/account/company/team`, `/account/company/branches` | Invite people, roles, branches |
| ☐ | `/account/jobs`, `/account/applications`, `/account/candidate` | Jobs is live: post a job, applications, candidate profile |
| ☐ | `/account/agency` | Viewings, offers, valuations, applications and tenancies; “Report a repair” on managed tenancies |
| ☐ | `/account/projects` and one project | Building projects with linked requests and quotes |
| ☐ | `/account/reviews` | As a provider: reviews and one reply each |
| ☐ | `/account/company` | “Which parts of HagerLand do you serve?” |
| ☐ | `/account/requests` | Leads labelled and filterable by pillar |
| ☐ | `/account/service-requests/<a won request>` | “How did it go?” review box |

### Admin (sign in at `/roodber8-login`)

| ✓ | Path | What to check |
|---|---|---|
| ☐ | `/roodber8` | Dashboard numbers and queues |
| ☐ | `/roodber8/review` | All tabs (including jobs, products and progress updates): approve, reject with reason, request changes, bulk approve |
| ☐ | `/roodber8/properties` (and `/new`, one listing) | Filters, editing, feature, notes, audit trail |
| ☐ | `/roodber8/developments` (and `/new`, `/import`) | CSV import preview |
| ☐ | `/roodber8/organisations` (and `/new`, one company) | Members, merge, verification documents |
| ☐ | `/roodber8/products` (and `/new`, `/prices`) | Product editor and CSV price update |
| ☐ | `/roodber8/categories` (both tabs) | Add, rename, reorder, switch off |
| ☐ | `/roodber8/locations` | Add an area, Amharic name, merge |
| ☐ | `/roodber8/enquiries` (and one enquiry) | Filters, "unopened over 48 h", CSV |
| ☐ | `/roodber8/quotes` (and one quote) | Pipeline, issue a quote with a PDF |
| ☐ | `/roodber8/sales` | HagerLand Developments leads |
| ☐ | `/roodber8/users` (and one user) | Search, suspend, password reset, delete |
| ☐ | `/roodber8/promotions` | Create and end a promotion |
| ☐ | `/roodber8/import` | Search Google, import, review tab, history |
| ☐ | `/roodber8/reports` | Tables, charts, CSV |
| ☐ | `/roodber8/settings` | Fill in your details here (see section 3) |
| ☐ | `/roodber8/audit` | Every action you took above appears |
| ☐ | `/roodber8/search` | Search by name, reference, phone or email |
| ☐ | `/roodber8/verticals` | Live / Coming soon / Hidden for each part of HagerLand |
| ☐ | `/roodber8/service-requests` (and one request) | Match up to three providers, emergencies first |
| ☐ | `/roodber8/request-questions` | Questions asked for each service |
| ☐ | `/roodber8/deals` | Deals, lead fees and commissions |
| ☐ | `/roodber8/property-care`, `/roodber8/managed-properties` | Property Care pipeline, inspections, rent statements |
| ☐ | `/roodber8/interest`, `/roodber8/partners` | Register-interest and partner applications |
| ☐ | `/roodber8/exchange-rates`, `/roodber8/build-costs` | Rates for approximate prices and the estimator |
| ☐ | `/roodber8/guides` | Starter guides marked "Needs AB review" |
| ☐ | `/roodber8/trade-accounts` | Approve or reject trade accounts |
| ☐ | `/roodber8/jobs` | Job review (when Jobs is live) |
| ☐ | `/roodber8/email-problems` | Emails waiting to be resent |
| ☐ | `/roodber8/pillars` | Ten pillars, three switches each, stage-gate checklist, sub-switches (estate agency, owner portal, Our Developments) |
| ☐ | `/roodber8/verticals` | Areas that follow a pillar say so; Professionals and Diaspora keep their own switch |
| ☐ | `/roodber8/agency` (and Contacts, Instructions, Valuations, Viewings, Offers, Applications, Tenancies, Checklists) | Overview, reports and CSV; each record with tasks, documents and timeline |
| ☐ | `/roodber8/managed-properties/<one>` | Owner portal panel: link the owner’s account, share documents, reply to messages |
| ☐ | `/roodber8/service-requests/<one>` | “Assign HagerLand’s own team” and HagerLand’s quote (Repair & Maintain) |
| ☐ | `/roodber8/projects` | Building projects with linked requests |
| ☐ | `/roodber8/reviews` | Review moderation |
| ☐ | `/roodber8/area-guides`, `/roodber8/newsletter` | Area guide editor; newsletter sign-ups and CSV |
| ☐ | `/roodber8/demand`, `/roodber8/performance` | Demand, recommendations, monthly CSV; pillar KPIs and agency figures |
| ☐ | `/roodber8/staff` | Invite staff, change role, disable |
| ☐ | `/roodber8-login` → “Staff sign in”; `/roodber8-login/staff?token=…` (from an invitation) | Staff sign-in; password and authenticator set-up |
| ☐ | `/roodber8/settings` | New: Licences and approvals, Stage gates, Estate agency and market insight, Integrations (“Not configured”) |

---

## 3. Your pre-go-live checklist (spec 25.7), in order

Do these steps, then type **GO LIVE**. I then run the cutover myself (backup, migrations 0010–0033 with checks, security test, merge to `main`, production smoke tests, legacy lockdown, preflight; `scripts/cutover/README.md`), and roll back automatically if anything fails. You no longer run any SQL by hand.

Never paste secret values into chat, email or a git commit.

### Step 1 — Supabase Pro

Supabase → your organisation → **Billing** → upgrade the project to **Pro** (about US$25 a month). You get daily backups, no project pausing and more storage. Your organisation has a quota restriction date of **3 November 2026**: upgrade before then.

### Step 2 — Vercel environment variables

Vercel → Project **hagerland-platform** → Settings → Environment Variables. Set each one for **Production**, and also for **Preview** where the last column says so.

| Variable | Where the value comes from | Preview too? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API keys → publishable key | Yes |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API keys → secret key | Yes |
| `NEXT_PUBLIC_SITE_URL` | `https://www.hagerland.com` | **No** (Production only) |
| `ADMIN_USERNAME` | Your choice | Yes |
| `ADMIN_PASSWORD` | A **new** long passphrase from your password manager (step 3) | Yes |
| `ADMIN_SESSION_SECRET` | A **new** value from `openssl rand -hex 32` (step 3) | Yes |
| `ADMIN_TOTP_SECRET` | Your existing authenticator secret | Yes |
| `ADMIN_DIGEST_EMAIL` | The address that receives the daily digest | Optional |
| `IP_HASH_SALT` | `openssl rand -hex 32` | Yes |
| `CRON_SECRET` | Step 7 | **No** (Production only) |
| `RESEND_API_KEY` | Resend → API Keys (after step 5) | **No** (keeps previews from emailing real people) |
| `EMAIL_FROM` | `HagerLand <hello@hagerland.com>` | No |
| `EMAIL_FROM_SUPPLY` | `HagerLand Supply <supply@hagerland.com>` | No |
| `EMAIL_REPLY_TO` | The address replies should go to | No |
| `HAGERLAND_INBOX_EMAIL` | Where contact forms, service requests and general enquiries go | No |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Step 6 | **No** (Production only) |
| `GOOGLE_PLACES_API_KEY` | Google Cloud → Credentials (Places API (New) enabled), for business imports | Optional |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Google Cloud, Maps Embed API, restricted to hagerland.com | Optional |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION` | A map tile provider that allows commercial use (e.g. MapTiler); maps stay hidden without it | Optional |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Anthropic Console, for AI drafts of imported businesses (leave the model empty) | Optional |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` only after Google sign-in is set up in step 4 | Optional |
| `CRON_PURGE_RATE_LIMITS` | `true` if you agree to the daily clean-up of old rate-limit counters | Optional |

Never set `EMAIL_TEST_MAILPIT_URL` or `SUPABASE_DB_URL` on Vercel. After saving: **Deployments → latest → ⋯ → Redeploy**.

### Step 3 — Rotate the admin password and session secret

Follow `docs/RUNBOOK.md` section 3: a new `ADMIN_PASSWORD` and a new `ADMIN_SESSION_SECRET` in Vercel (Production and Preview), then redeploy. Keep `ADMIN_TOTP_SECRET` unless your phone was lost. The admin path `/roodber8` and its sign-in stay as they are.

### Step 4 — Supabase Auth

Supabase → **Authentication** (details in `docs/auth-email-templates/README.md`):

1. **URL Configuration:** Site URL `https://www.hagerland.com`. Redirect URLs: `https://www.hagerland.com/**` and `https://*-accountingbodys-projects.vercel.app/**`.
2. **Emails → Templates:** paste the four templates from `docs/auth-email-templates/`, with the subjects listed there.
3. **SMTP** (after step 5): host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `hello@hagerland.com`, sender name `HagerLand`.
4. **Sign-in settings:** keep **Confirm email** on; minimum password length `10`.
5. **Google sign-in (optional):** OAuth client in Google Cloud → Providers → Google, then `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in Vercel.

### Step 5 — Resend sending domain (hagerland.com)

1. Resend → **Domains → Add domain** → `hagerland.com` (region: the one closest to Europe/Africa is fine). If your free plan's one domain is used by accountingbody.com, upgrade to **Resend Pro** first.
2. At your DNS provider, add exactly the records Resend shows. They are of three kinds:
   - **SPF:** an `MX` record and a `TXT` record on `send.hagerland.com` (the TXT starts with `v=spf1 include:amazonses.com`).
   - **DKIM:** a `TXT` record on `resend._domainkey.hagerland.com` (a long key Resend gives you).
   - **DMARC:** add yourself a `TXT` record on `_dmarc.hagerland.com` with the value `v=DMARC1; p=none; rua=mailto:hello@hagerland.com` (start with `p=none`; tighten to `p=quarantine` after a few weeks of clean reports).
3. Click **Verify** in Resend and wait for **Verified** on every record. `/api/health/full` reports this too (`emailDomain: true`).

### Step 6 — Cloudflare Turnstile

Cloudflare → **Turnstile** → your widget → **Hostname management**: make sure the list contains `www.hagerland.com` and `hagerland.com`. Copy the **Site key** and **Secret key** into Vercel (step 2, Production only).

### Step 7 — CRON_SECRET

Run `openssl rand -hex 32` in the Codespace terminal. Put the result in Vercel as `CRON_SECRET` (Production), and add the same line to `.env.local` in the Codespace (`CRON_SECRET=...`) so I can run the go-live checks against `/api/health/full`.

### Step 8 — SUPABASE_DB_URL in .env.local (Codespace only)

Supabase → **Connect** → **Session pooler** → copy the URI, replace `[YOUR-PASSWORD]` with your database password, and add one line to `.env.local` in the Codespace:

```
SUPABASE_DB_URL="postgresql://postgres.<project-ref>:<password>@<pooler-host>:5432/postgres"
```

`.env.local` is never committed. Delete this line after the cutover.

### Step 9 — Business details in admin → Settings

Open the preview, sign in at `/roodber8-login`, and fill in **Settings**: legal entity (name, registration number, address, governing law), contact details (phone, WhatsApp, Telegram, email, Supply email, address, hours), social links (https only), delivery area and quote reply time. Anything left empty stays hidden, so it is safe to launch with some blank. The preview writes to your live database's settings table, which already exists; if the Settings page shows an error before go-live, fill it in within the first hour after go-live instead.

Also in Settings (new in Section 26):
- **Licences and approvals:** for estate agency, property management, recruitment and placement, finance and insurance introductions, enter the licence or approval number, issuing authority, holder and date. Each appears on its pages (estate agency also in the footer and the Terms, and in the agency's search-engine data) once its number is filled in; empty ones stay hidden.
- **Estate agency and market insight:** a published fee schedule (leave empty to say "fees are agreed in writing") and the minimum number of listings before a market figure is shown (5).
- **Stage gates:** the number of verified partners needed before Aggregate can be switched on (3) and the pre-filled clearance note ("Regulatory clearance confirmed by AB, 15 Oct 2026").
- **Agency → Checklists:** the sale progression steps and the rent-ready checklist (plain steps, no legal statements).

Also confirm or edit:
- the master line "One platform for property, construction and everything around it." (`lib/brand.ts`);
- "usually within one business day" for reviews, and "Delivered to site" on supplies pages;
- the pillar modes at launch (admin → **Pillars and modes**; defaults in the table below), and, in admin → **Guides**, the six new drafts marked "Needs AB review" (a tenants' guide, four checklists, the glossary): publish them once you have checked the wording;
- optionally, invite staff (admin → **Staff**). Each must connect an authenticator app. Nobody else has access until you do.

**Pillar modes at launch** (set by migration 0027, changeable in admin):

| Pillar | Provided by HagerLand (Direct) | Trusted partners (Aggregate) | Register your interest | Shows as |
|---|---|---|---|---|
| 1 Buy & Sell | On (HagerLand estate agency) | On (marketplace) | Off | Live |
| 2 Rent & Let | On (HagerLand lettings) | On | Off | Live |
| 3 Build & Develop | Off (no HagerLand development yet) | On (professionals, contractors, developments, estimator) | On (Our Developments) | Live; Our Developments coming soon |
| 4 Repair & Maintain | On (HagerLand coordinates; own team) | On (providers) | Off | Live |
| 5 Manage Property | On (HagerLand Property Care; owner portal on) | On (third-party managers) | Off | Live |
| 6 Property Finance | Off | Off (switchable once verified partners are added) | On | Coming soon |
| 7 Property Insurance | Off | Off (switchable once verified partners are added) | On | Coming soon |
| 8 Knowledge & Advice | On | Off | Off | Live |
| 9 Supplies | On (HagerLand Supply) | On (supplier marketplace) | Off | Live |
| 10 Jobs | On (HagerLand recruitment and placement) | On (job board) | On (candidate and employer registers) | Live |

Diaspora Services and Professionals are cross-cutting layers with their own switch in admin → Verticals (both live).

### Step 10 — Lawyer review of the legal pages

Send `/terms`, `/privacy` and `/cookies` (from the preview) to a qualified lawyer with the questions in **Regulatory checks** below. After their review, set the "last updated" dates in admin → **Settings → Legal pages dates**.

### Step 11 — UK data-protection (ICO) check

HagerLand serves people in the UK. Do the ICO's self-assessment "Does my organisation need to pay a data protection fee?" at ico.org.uk (search "data protection fee self assessment"). If it says yes, register and pay (usually £52 a year for a small organisation) and note the registration number in the privacy policy via your lawyer.

### Step 12 — Regulatory approval and licence references

You confirmed on 15 Oct 2026 that HagerLand's approval covers every service: estate agency, property management (including collecting and holding rent for owners), recruitment and placement, and finance and insurance introductions (see **Regulatory checks** below, now all "Approved"). What remains for you: enter each licence or approval reference in admin → Settings → **Licences and approvals** (step 9), and, before switching Finance or Insurance Aggregate on, add and verify the partner organisations (the stage gate needs 3 by default).

### Step 13 — Final look at the preview

1. Work through the page-by-page checklist in section 2.
2. While signed in to Vercel, run Lighthouse (Chrome → Inspect → Lighthouse → Mobile) on the homepage, a property page, a product page, a company page, `/jobs` and `/buy`. Target: Performance 90 or more. Codespace results: `docs/qa/lighthouse-2026-10-15-s26.md`.
3. Paste the homepage and a property, product and company page into Google's Rich Results Test, and check securityheaders.com.

### Step 14 — Type GO LIVE

When every step above is done, type exactly **GO LIVE**. After go-live: resubmit the sitemaps in Google Search Console (the `/sitemap/<type>.xml` files listed in `https://www.hagerland.com/robots.txt`) and watch the admin digest and error log daily for the first week.

---

## 4. Known limitations and what is not built yet

Checked again on 15 Oct 2026 after Section 26: everything below is genuinely not built, or a limitation of what is built. (The earlier "Phase 2" list is gone because almost all of it was built in Phase 1.5: Amharic architecture, property-type pages, the map, approximate prices in other currencies, Special Buys, the deals ledger and guides.)

### Known limitations

- **Lighthouse:** see the Section 26 results in `docs/qa/lighthouse-2026-10-15-s26.md`. With real slow-4G throttling the measured pages score in the 90s; Lighthouse's simulated estimate in this Codespace is lower and varies between runs. Please check on the Vercel preview (step 13). If the homepage stays under 90 there, trimming its JavaScript is the first performance task after launch.
- **Build tools:** Tailwind 3 and ESLint have `npm audit` warnings; they only run while building, never on the live site (`docs/qa/npm-audit-2026-10-15.md`).
- **Amharic:** the `/am` version translates menus, headings and the main buttons only, machine-assisted and marked for native review, and is off until you switch it on.
- **Maps:** hidden until you choose a tile provider (`NEXT_PUBLIC_MAP_TILE_URL`).
- **Imports and AI drafts:** need `GOOGLE_PLACES_API_KEY` and `ANTHROPIC_API_KEY`; without them the Imports screen says so and you write descriptions yourself.
- **Admin user search by email** scans the account list page by page: fine for thousands of users.
- **Staff two-factor set-up** shows a setup key and an "open in authenticator" link, not a QR code (no QR library was added).
- **Market insight and demand** count asking prices and requests on HagerLand only; empty searches have no day-by-day history, so their period uses the date they were last seen; revenue figures count deals in birr (deals in other currencies are listed in Deals).
- **Legal pages** must be reviewed by your lawyer (step 10).
- **Legacy tables** stay readable as before until the lockdown in the cutover.

### Not built yet (needs a decision or an outside contract)

- Online payments and payouts (Chapa, Telebirr, cards), orders, invoices, delivery scheduling, delivery zones and fees. An integration point exists (`lib/integrations.ts`, admin → Settings → Integrations: "Not configured").
- Phone (SMS) sign-in codes and WhatsApp Business notifications (integration points as above).
- Live connections to banks', insurers' and mortgage providers' own systems (requests reach partners by email and their account today).
- Native mobile apps (the website works on phones).
- A valuation and property price-history dataset (market insight uses live asking prices only and says so).
- BirrBank integration (frozen by you).
- Paid plans, billing, paid featured placements and advertising slots (the promotions screen records price and paid status; nothing is charged).
- Changing the web address (slug) of a category or place with automatic redirects.
- Equipment hire marketplace.

---

## Section 26 decisions log

| Package | Decision | Why |
|---|---|---|
| S1 | Pillars are a new registry (`pillars`, `pillar_services`) beside the vertical registry, not a rename: the areas that belong to one pillar (Supplies, Contractors, Repairs, Finance, Insurance, Jobs, Our Developments) and Property (the more visible of Buy and Rent) follow the pillar modes through a database trigger; Professionals and Diaspora remain layers with their own switch. | Every existing URL, gate, test and the coming-soon pages keep working (spec 26.2). |
| S1 | The stage gate is enforced in the database too: switching Direct or Aggregate on is refused unless a checklist was completed in the last 15 minutes; Aggregate also needs at least N verified, live providers or partners for that pillar (N = 3, Settings). Partners count from the business kind (for example lenders and brokers for Finance) or from the pillars a business chose. | Spec 26.3; a direct database change cannot bypass it. |
| S1 | Estate agency, the owner portal and Our Developments are sub-services with their own three switches. Agency sales need Buy & Sell Direct and lettings need Rent & Let Direct as well as the agency switch. | Spec 26.1 "dedicated on/off control", 26.7. |
| S1 | Licence references are one Settings group for the five regulated services; each is shown only once its number is filled in. | AB's update of 15 Oct 2026. |
| S2 | Desktop header: seven lifecycle menus on the second row; "All services", "Living abroad?", search, sign in and List with us on the top row. Pillar hubs live at the short URLs; Supplies, Finance, Insurance and Jobs keep their existing pages as hubs and gain the hub panels. | Spec 26.4: at most 7 top-level items. |
| S2 | The homepage diagram is an ordered list (1 to 8, then 9 and 10) placed in a ring with CSS grid from 1024 px; the PROPERTY nucleus is decorative with a screen-reader sentence. | Keyboard and screen-reader order follow the pillar numbers; phones get a clean list. |
| S3 | Agency records are staff-only tables; customers see their own records through server pages that match their account or the confirmed email they used, so staff notes are never exposed. Contacts are matched by email (by phone only when there is no email). | Privacy; found by the tests (two people can share a phone). |
| S3 | Viewing and valuation times are typed and shown in Ethiopia time ("10:30 Ethiopia time") and stored in UTC; reminders go 36 hours ahead from the daily job. | Spec 25.4 time rules; the daily job runs once a day. |
| S3 | Offers and applications are only on listings HagerLand markets (lister type "hagerland" and a live instruction side switched on); all other listings keep the enquiry form. | Spec 26.5. |
| S3 | Completing an instruction creates a won deal: commission = fee % × final price (or the fixed fee), pillar Buy or Rent. Deals gained a pillar column (backfilled for older deals). | Spec 26.5, 26.14. |
| S4 | The tenant guidance is a guide draft for your review; `/agency/tenants` only describes HagerLand's own process (viewing, application, tenancy, repairs). | Spec 26.6 "draft for AB review"; no legal statements. |
| S5 | Repairs raised by a tenant or an owner become Repair & Maintain service requests (source tenancy or owner portal) and a planned maintenance-log entry. HagerLand's own team is a labelled organisation, "HagerLand Services". | Spec 26.6–26.8: one consistent flow. |
| S6 | Starting a building project needs a free account (it runs over months and is followed on one page). Finance becomes registered interest while Finance is coming soon. The HLP reference counter is shared with partner applications, so every HLP number stays unique. | Spec 26.9. |
| S7 | Market insight is rebuilt daily into a table; visitors see only figures with at least the minimum number of listings, labelled "Based on asking prices on HagerLand — not valuations". Checklists and the glossary pages are honest and unindexed until you publish the drafts. | Spec 26.10. |
| S8 | A review needs the job to be "won" with that provider (database rule), one per job; the provider's single reply cannot be changed (database rule). Guests review through their request link. | Spec 26.12. |
| S10 | Staff sign in on the admin sign-in page with email, password and authenticator. Their authenticator secrets are encrypted with a key derived from `ADMIN_TOTP_SECRET` (kept at cutover), so no new setting is needed. Roles are checked by the middleware, on every page and in every admin action (each action file names its area); staff logins are never customer sessions. | Spec 26.15. |
| S11 | Closed viewings, offers and applications are deleted after 24 months by the daily job, as the privacy policy now says. | Privacy statements must be true. |
| S11 | The matrix had pointed the deferred integrations at a file that did not exist; `lib/integrations.ts` and an admin "Not configured" panel now provide them. | Spec 25.3 "clean integration point". |
| S12 | Browser tests that switch an area on or off now use the pillar modes (the old area switches no longer control pillar-owned areas), refreshing the site with one admin click so no in-between state can stay cached. The legacy sweep no longer searches the word "pillars", which Section 26 reuses. | Spec 26.19 regression. |
| S12 | 25.5 re-run after Section 26: cutover rehearsed again from the live state (0010–0033, every check PASS; security test 190/190; lockdown proof 23/23), preflight and production smoke tests against the local build (all pass except the email and Turnstile keys the test copy does not have), npm audit (0 critical), legacy sweep clean. | Brief 26.19, 25.5. |
| WP-20 | Launch without the lawyer's review: AB accepts launching with the drafted `/terms`, `/privacy` and `/cookies` and will arrange a review after launch. | AB's decision, 15 Oct 2026 (checklist step 10). |
| WP-20 | Licence and approval references deferred: the Settings fields stay empty, so no licence lines show on the site until AB adds them. | AB's decision, 15 Oct 2026 (checklist step 12). |
| WP-20 | Supabase stays on the Free plan (Pro declined); backups are taken with `scripts/backup-supabase.sh`, including a fresh one before the cutover. | AB's decision, 15 Oct 2026 (checklist step 1). |
| WP-20 | Email is sent from accountingbody.com (verified in Resend, free plan) instead of hagerland.com, which is not verified. The health check verifies the domain of `EMAIL_FROM`, so it follows this choice. | AB's decision, 15 Oct 2026 (checklist steps 2 and 5). |
| WP-20 | The cutover kept the spec's order (lockdown after the merge) rather than the order in AB's GO LIVE message (lockdown before the merge), which AB also asked to follow "exactly as specified". | Locking the legacy tables first would have cut the old site off from its data while it was still serving. |

## Phase 1.5 decisions log (Sections 24–25)

Decisions made while building Phase 1.5 and preparing go-live, recorded as the brief asks. Some were later changed by Section 26 (for example the owner portal now exists, and Jobs is live): see the Section 26 log above.

| Package | Decision | Why |
|---|---|---|
| E1 | The tagline "Build. Buy. Live." and the old hero lines are replaced by the three 24.1 lines (master, support, audience) in `lib/brand.ts`. The descriptor "Ethiopia's construction and property platform" stays for emails. | Section 24.1 sets the new positioning; the tagline was never confirmed (Section 23 item 1). |
| E1 | The homepage proof point "Built and supplied by us: HagerLand develops and supplies" became "We know construction: HagerLand Supply sources building materials". | PLATFORM_VISION §11: HagerLand is not developing yet, so we must not say it is. |
| E1 | On desktop the header has two rows (logo, search, sign in and "List with us" on top; the six menus below). Below 1024 px the menu button opens the drawer. | The six menus in 24.3 do not fit on one row next to the logo at common laptop widths. |
| E1 | Every vertical has honest "coming soon" copy, so AB can switch any of them (even Property) to Coming soon and still get a complete page. Live pages owned by a vertical (e.g. `/property/…`) show that landing while it is coming soon and return 404 while hidden. | Section 24.2: admin can switch any vertical. |
| E1 | Pages of a vertical that is not live carry an `X-Robots-Tag: noindex` header (set by the middleware from the registry, refreshed every minute) as well as noindex metadata. | Guarantees noindex even on deep pages whose own metadata says "index". |
| E1 | While Our Developments is coming soon, its register-interest form saves to Interest registrations (admin → Interest registrations). When switched live, the full hub returns and interest goes to the HagerLand sales inbox as before. | One place for all coming-soon interest; the live sales flow is unchanged. |
| E1 | "Register your interest" asks for email (required), phone (optional), country and city, plus a separate optional tick box for other HagerLand news, stored with the time of consent. | Interest emails are expected by the person; marketing needs separate consent (25.4). |
| E1 | Added an `/advertise` page with an enquiry form and no prices. | PLATFORM_VISION lists "Advertise" as a supporting area; prices are not set. |
| E1 | In the local test copy every site email goes to the local mail catcher (Mailpit) through `EMAIL_TEST_MAILPIT_URL`, which only accepts a localhost address. | Lets tests read real emails; impossible to send real email this way. |
| E1 | Server errors are never recorded in the database during `next build`. | A local build reads the live database; a failed read must never cause a write there (checked: the live `errors` table is empty). |
| E1 | `/finance`, `/insurance` and `/jobs` show their coming-soon landing; their "live" pages are built in E7 and E8. | Work-package order. |
| E1 | Phone numbers typed with a leading 0 after a non-Ethiopian country code (e.g. UK 07…) now drop the 0. Norway (+47) and South Africa (+27) added to the code list. | Bug fix found while adding international forms. |
| E2 | Countries are top-level places with the level "country"; their cities sit under them. Ethiopian places keep their addresses and URLs. | Spec 24.4: Ethiopia stays the core market and its URLs do not change. |
| E2 | Location search on forms is Ethiopia-only unless the form is for businesses or services (business location, areas served, portfolio, directory and professional search). | Property, supplies delivery and developments are Ethiopia-only. |
| E2 | Directories without a chosen place show Ethiopian businesses only; choosing a place abroad (e.g. /professionals/plumbers/united-kingdom/london) shows businesses there. Site-wide search shows every country. | Pages titled "… in Ethiopia" must only list Ethiopian businesses. |
| E2 | A business's country follows its main location and its currency follows the country (database trigger). | One source of truth; no mismatches. |
| E2 | Approximate prices: you enter "1 USD = X birr" (etc.) in admin → Exchange rates. Visitors choose a currency in the footer; the choice is kept only in their browser. The converted amount is rounded and always marked "approx." with the rate date. Nothing shows until you enter a rate. | Spec 25.2f; ETB stays the price of record. |
| E2 | Partner organisation kinds (lender, insurer, broker) were added now, in a small separate migration (0012). | Postgres needs new list values committed before use. |
| E2 | Structured data for a business abroad uses its real country (e.g. GB), not Ethiopia. | Correct address data for search engines. |
| E3 | A request goes to at most three providers at a time. You choose them from suggestions (same service, nearest place first, verified businesses first) or by searching a name. | Spec 24.5. |
| E3 | Providers see what the job is straight away, but the customer's name, phone, email and files only after they press "Accept". | Protects customers from unwanted contact. |
| E3 | Guests follow their request through a private emailed link that works for 30 days. Only a fingerprint (hash) of the link is stored, so each new quote email carries a fresh link and older links stop working. Anyone can ask for a new link with their email and reference; the page never says whether a request exists. | Security and privacy (25.4). |
| E3 | Quote amounts are stored in the smallest unit of the quote's currency. Lead fees and commissions are entered per provider match and are never visible to providers. | Spec 24.5 commercial fields. |
| E3 | When a customer chooses a quote, a deal is created automatically in Deals and commissions with the quote value and the lead fee/commission entered so far. | Spec 25.2k: deals linked to service requests. |
| E3 | Emergency requests email the HagerLand inbox and admin immediately, are listed first, and are counted in the daily digest until handled. Every new request is also emailed to the inbox. | Spec 24.5 / 25.4. |
| E3 | Providers are reminded once if they have not answered within 48 hours; overdue answers appear in the digest. If every provider declines, the request returns to the queue and admins are emailed. | Spec 25.4. |
| E3 | Existing service categories were linked to Professionals (design & consultancy, property services) or Contractors (all others). E4 reorganises repairs and maintenance. | Needed so requests follow each vertical's status. |
| E3 | On phones, long email addresses now wrap instead of pushing the page wider. | Bug found by the tests. |
| E4 | Repairs & Maintenance and Contractors each have their own hub page that lists their services with "Get quotes" (the request engine) and, for contractors, "Browse businesses" (the directory). | PLATFORM_VISION §4 and §6. |
| E4 | Cleaning, pest control and gardening stay in the "Property services" group but now belong to Repairs & Maintenance, so they follow that vertical's switch. | Vision lists them under repairs. |
| E4 | Repair services that can be urgent (plumbing, electrical, roofing, locksmiths, drainage, emergency repairs, and the plumber, electrician and roofer trades) allow "Emergency". The hub tells people to call the emergency services first if anyone is in danger; no phone numbers are given because we have not verified them. | Safety without unverified claims. |
| E4 | Starter questions were written for each repair service and for building, house-building and renovation work. They are plain and optional where possible, and editable in admin → Request questions. A unit test checks every seeded question list. | Spec 24.5. |
| E4 | Services and their questions are cached for up to an hour on the live site. After running a migration that changes services, new services can take up to an hour to appear. | Performance (the cutover steps note this). |
| E5 | The Diaspora page has two parts: "Property in Ethiopia" (14 needs, each linking to a live page or a ready-made request form) and "Services where you live" (search by country, city and service). Needs that point to a coming-soon service show "Soon"; hidden ones disappear. | Spec 24.6. |
| E5 | Property Care is presented as a service HagerLand offers now, with "Request a consultation". The page makes no claims of round-the-clock cover, response times or numbers of properties, and shows prices only if you enter them in Settings. | PLATFORM_VISION §9 without unverified claims. |
| E5 | The consultation form suggests the visitor's time zone from their device and asks for the best time to call. Leads go to admin → Property Care, where each moves through: New, Contacted, Consultation booked, Proposal sent, Client, Not going ahead. "Create managed property" copies the owner's details into a managed-property record. | Spec 24.6 pipeline. |
| E5 | Inspection photos are stored privately (re-encoded, metadata removed) and only staff can open them, through 10-minute links. Rent statements show "to owner" = received − expenses − fees. | Owner portal is Phase 2. |
| E5 | No owner-facing portal pages were built, so there is nothing to switch on yet; the data model is ready for it. | Spec 24.6: portal hidden until enabled. |
| E6 | HagerLand's own estate agency work uses the existing "hagerland" lister type. Such listings say "Marketed by HagerLand"; listings in a HagerLand development say "HagerLand Development". Neither is boosted in search. | Spec 24.7 and the integrity rule. |
| E6 | Agency pages (Sell, Let, Buyer representation, Property sourcing, Developer sales) use the normal enquiry form; enquiries appear in admin → HagerLand sales. "Request a valuation" uses the request engine with the property valuers service. No fees are published; the pages say fees are agreed in writing. | Spec 24.7. |
| E6 | "Ask about financing" goes to the Finance page's interest form while Finance is coming soon, and to the Finance page itself when it is live (E7 adds finance requests there). | Spec 24.7. |
| E6 | Compare works for everyone (kept in the browser, up to four); Save and saved searches need an account. | Spec 24.7. |
| E6 | Saved-search alerts: instant (sent when HagerLand approves a matching listing), daily or weekly (sent by the daily job). Each email lists up to 10 new matches and has "Stop these emails" (one press, no sign-in) and a List-Unsubscribe header. | Spec 25.2a / 25.4. |
| E6 | Map search and the listing pin appear only when NEXT_PUBLIC_MAP_TILE_URL is set to a tile provider that allows commercial use (e.g. MapTiler or Stadia). Pins are approximate (about 1 km) unless the owner shows the exact address. The site's security policy allows images only from that tile server. | Spec 25.2b; provider is AB's choice (Section 23 item 9). |
| E6 | Property-type pages use the path, e.g. /property/for-sale/addis-ababa/bole/apartments, and are not indexed until they have at least the minimum number of listings (Settings). A location page filtered to one type points search engines to its type page. | Spec 16 / 25.2l. |
| E6 | Investment opportunities are found with a new listing feature, "Investment property (income or already let)", which listers can tick and buyers can filter by. | PLATFORM_VISION §2. |
| E7 | Finance and Insurance stay "coming soon" with interest forms by category and "Become a partner" forms. When switched live, their pages list every category with "Get quotes", and requests go through the request engine to partner organisations you add in admin (new kinds: lender, insurer, broker) and link to those services. Partners decide eligibility, prices and terms; HagerLand shows no rates, quotes, advice or eligibility anywhere. | Spec 24.8. Regulated activity must be cleared first (see regulatory checks). |
| E7 | "Ask about financing" appears on property pages (mortgage or home-improvement finance), development pages (mortgages) and the contractors page (construction finance). | PLATFORM_VISION §8: finance enquiries from property, development and construction pages. |
| E8 | Jobs & Recruitment is built fully and stays "coming soon" (landing with "I am hiring" / "I am looking for work" interest forms). When live: public job board with keyword, location (Ethiopia or abroad), category and type filters; job pages with schema.org JobPosting data; employers post jobs from their account (reviewed by HagerLand before going live; jobs close on their closing date or 60 days after approval). | Spec 24.9. |
| E8 | Jobs are posted by organisations, not individuals. A live job must be paused before it is edited, and then goes back to review (no "pending changes" for jobs). | Keeps moderation simple and honest: what candidates see was always reviewed. |
| E8 | Applying needs a free account, so candidates can follow and withdraw applications. CVs: PDF or Word (.docx) only, up to 15 MB, private storage, opened through 10-minute links by the applicant, the employer's team or HagerLand only. CVs sent with applications are deleted after 12 months (daily job); the privacy policy says so. | Spec 24.9 privacy rules. |
| E8 | Candidate profiles are private by default. "Visible to approved employers" shows first name, headline, skills, qualifications, experience and availability, never contact details or the CV. Employers meet candidates through a staffing requirement naming the candidate reference (C-…); HagerLand asks the candidate first. | Spec 24.9 and Vision §10 ("employers search candidates", opted-in only). |
| E8 | "Submit a staffing requirement" is a request-engine service (Recruitment → Staffing requirement) under the Jobs vertical. Revenue fields for recruitment fees and placement commissions use the existing deals ledger (E3); paid job ads are not charged until payments exist (deferred by rule). | Spec 24.9, 25.3. |
| E8 | Developers (and HagerLand) post dated construction-progress updates with up to 12 photos; developer updates are reviewed first. They show as a "Construction progress" timeline on development and Our Developments pages. Our Developments, when live, groups HagerLand projects into current, coming soon and completed. | Spec 25.2j, 24.10, Vision §11. |
| H5 | `/api/health` (public) answers only `ok` and a version (the commit). `/api/health/full` needs `Authorization: Bearer <CRON_SECRET>` and answers true/false only: each required environment variable present, database reachable, every migration 0001–0019 recorded in `schema_migrations`, both storage buckets present (public and private), and the sending domain of `EMAIL_FROM` verified in Resend. A unit test keeps the expected migration list equal to the files in `supabase/migrations`. | Spec 25.2n. |
| H1 | Suppliers and manufacturers manage their own products from their account (Products menu): drafts, photos, submit for review, pause, archive. Edits to live products wait for review as pending changes, like properties. Suppliers choose existing brands only (new brands are added by HagerLand) and cannot set Special Buys. Products show in a "Products" tab on the supplier's company page. | Spec 25.2c. |
| H1 | Special Buys are set by HagerLand on the admin product page (was-price higher than the price, quantity, end date). `/supplies/special-buys` and a strip on `/supplies` show live offers only; they hide themselves when ended or sold out. | Spec 25.2d. |
| H1 | Trade accounts: businesses apply at `/supplies/trade` (signed in); HagerLand approves, rejects or closes accounts in admin → Trade accounts (emails sent). Approved accounts see "Your trade price" on product pages; the price is loaded privately after the page and never appears in public pages, views or caches. | Spec 25.2e. |
| H1 | Added the four building-supplies categories still missing from PLATFORM_VISION §1: Construction equipment, Interior finishing, Landscaping, Specialist products (with subcategories). The other vision categories already existed (e.g. Cement → Building materials › Cement & concrete). | Vision §1. |
| H2 | Guides hub at `/guides` and `/guides/[slug]` with an admin editor (title, address, topic, summary, plain-text body with headings and bullets, Q&A pairs shown as FAQ and FAQPage data, SEO title and description, draft/published/archived). Three starter guides (materials list, questions for a contractor, viewing checklist) exist only as drafts marked "Needs AB review". A guide cannot be published until "Content checked" is ticked; the database enforces this too. Each guide carries a "general information, not advice" note. Guide teasers on the homepage and property hub appear only once a guide is published; `/guides` is noindex while empty. | Spec 25.2g. No legal or regulatory statements were written as fact. |
| H2 | Build-cost estimator at `/build-cost-estimator`: floor area per storey × number of floors (G to G+4) × HagerLand's rate per m² for the place and finish (falls back to the nationwide rate). It is labelled "Estimate only… not a quote", shows the rate and its date, and links to building quotes, Supply materials pricing and professionals. It returns 404 and is left out of the sitemap until you enter a rate (admin → Build-cost rates). | Spec 25.2h; rates are AB's to set (Section 23 style: no invented figures). |
| H3 | Teams: Account → Team lists members and roles. Owners invite admins or members, and admins invite members, by email (7-day link, usable only by the invited email address; sign-up keeps the link). Owners change roles and hand over ownership (the new owner takes over, the old owner becomes an admin). Admins remove members; anyone can leave. The database refuses to remove or demote the last owner; archived duplicates (admin merge) are exempt. | Spec 25.2i. |
| H3 | Branches: Account → Branches (owners and admins) adds offices with name, place, address and hours. They show as a "Branches" section on the public company page. Branch phone and email are never public (contact still goes through the profile's contact panel). | Spec 25.2i and the contact-reveal rule (6.4). |
| H4 | i18n architecture: a message catalogue keyed by the English text (`lib/i18n`). English needs no catalogue; any text without an Amharic entry falls back to English, so nothing can break. Server components use `getT()`, client components `useI18n()`, and links keep the visitor's language through `localizeHref`. | Spec 25.2m. Chosen over moving every route under `[locale]`: same result for visitors, far smaller change. |
| H4 | `/am/…` is served by the middleware, which rewrites to the same page with a language header that only it can set (any header a visitor sends is removed). It sends `Content-Language: am` and `<html lang="am">`, and while Amharic is on, every public page sends hreflang alternates (en, am, x-default) as an HTTP `Link` header. The `/am` versions of the main pages are added to the sitemap. Admin (`/am/roodber8…`) is never available. The Ethiopic font (Noto Sans Ethiopic) is in the font stack. | Spec 25.2m. |
| H4 | Coverage of the machine-assisted Amharic (marked "needs native review" in the file and in admin): header, menus, mobile drawer, footer, account/sign-in links, badges, homepage hero and main sections, vertical names and descriptions. Other page text and all user content (listings, profiles) stay in English until translated; they fall back cleanly. | Spec 25.2m: OFF by default (admin → Settings → Amharic) until you approve it. Adding translations means adding lines to `lib/i18n/messages/am.ts`. |
| H4 | Making the page language available on every request means the ~30 pages that were pre-built now render on request. Their data is still cached, so the effect on speed is small. | Needed so `/am` serves real Amharic HTML for search engines. |
| H6 | Email never blocks a visitor: if delivery fails, the email goes to an outbox (migration 0024). The daily job retries up to five times with growing gaps, admin → Email problems shows what is waiting (retry now / stop), and the daily digest counts it. | Spec 25.4 forms and email rows. |
| H6 | Plans and limits live in `lib/entitlements.ts`. Everyone is on the free plan with no limits; the only limit is the private-owner listing cap you set in Settings. | Spec 17.2; payments deferred (25.3). |
| H6 | Concurrent edits: the property, development, organisation and product editors send the version they opened. If someone saved in between, the second save is refused with "Someone else changed this since you opened it…" rather than silently overwriting. Approving refuses records that are no longer waiting for review (so a bulk approval cannot republish something just removed) and reports "Approved X of Y". | Spec 25.4 admin rows. |
| H6 | Account: users can now sign out from the account menu (this was missing). "Download my data" in Settings gives a JSON file of everything linked to the account (no tokens or passwords). Deletion requests were already in place. | Spec 25.4 / privacy policy. |
| H6 | Old API addresses of the previous site (`/api/housing/…`, `/api/birrbank-…`, `/api/enquiry`, old cron jobs, etc.) answer 410 Gone. Interest registrations are deleted after 24 months (now in the privacy policy). New records with generated short ids or slugs retry automatically on the very rare duplicate. | Spec 25.4, Section 20. |
| H6 | Recorded verifications (no extra code needed): the sign-in session is refreshed on every page load, so it does not expire while someone is using the site, and the listing wizard keeps every finished step as a draft. The server only fetches fixed addresses (Supabase, Resend, Cloudflare, Google Places), never a URL a visitor supplied, so there is no SSRF route. Logs mask email addresses and never record phone numbers or message text. | Spec 25.4 X-AUTH-04, X-SEC-05, X-SEC-09. |
| H6 | Found and fixed on the way: a long "Serves the Ethiopian community abroad" badge made company cards wider than a 360px phone screen. | Responsive test. |
| E9 | About, How it works, List with us and Help now describe every part of HagerLand from the vertical registry: a part that is coming soon is marked "Soon", a hidden part disappears. How it works has a "Getting quotes" tab; List with us has sections for businesses, employers and partners whose buttons follow each vertical's status. | Spec 24.11 / 25.2. |
| E9 | Terms gained sections 12–16 (service requests and matching, finance and insurance partners, jobs, people outside Ethiopia, HagerLand as a possible developer, worded "intends to develop"). Privacy covers service requests, partners, CVs, people abroad, the legal basis and "Download my data"; Cookies lists browser storage (currency, compare, recent searches) and staff sign-in. These are drafts for your lawyer (see the regulatory checks below). | Spec 24.11; no legal claims written as fact. |
| E9 | Migration 0025 lets signed-in users read the one column "My quotes" needs (the page failed to load before); the page now shows an honest error message if loading ever fails. Migration 0026 adds 22 indexes. | Bugs and performance found in the E9 sweep. |
| E9 | Recorded verification, copy: no exclamation marks or hype words in user-facing text (search for "!" in page text and for words such as "revolutionary", "world-class", "seamless", "amazing"); the one "Copied!" was changed to "Copied". | Spec 3.3 voice. |
| E9 | Recorded verification, icons: all icons are lucide-react. The only hand-written SVGs are the logo, the favicon, the Google sign-in logo (Google's required mark), social-network logos (lucide has no brand logos) and the admin bar chart. The only `dangerouslySetInnerHTML` is structured data (JSON-LD), which is escaped. A hand-drawn share icon and the unused share button and old breadcrumb were removed. | Spec 5.2 and no dead code. |
| E9 | Recorded verification, settings: every environment variable the code reads is listed in `.env.example`, except those Vercel and Next.js set themselves (`VERCEL_*`, `NEXT_PUBLIC_VERCEL_*`, `NODE_ENV`, `NEXT_RUNTIME`, `NEXT_PHASE`), which the file now explains. | Spec 19.1. |
| E9 | Recorded verification, "coming soon": every "coming soon" text on the site comes from a vertical's status (registry), apart from admin labels and the privacy policy's retention line. HagerLand Developments' future projects are called "Upcoming projects" so they are not confused with a coming-soon service. | Spec 24.2. |
| E9 | Recorded decision, times: all timestamps are stored in UTC (`timestamptz`) and shown as calendar dates in Ethiopian time (Africa/Addis_Ababa). The site shows dates, not clock times, to visitors, so people abroad see the same date as people in Ethiopia; Property Care asks for the caller's own time zone. | Spec 25.4 X-I18N-02. |
| E9 | Recorded verification, indexes: a database query for links between tables (foreign keys) without an index now lists only "who created this" columns and place links on small tables, which are scanned only when an admin merges two places. | Spec 25.4 X-PERF-09. |
| E9 | Recorded verification, repeated queries (N+1): no public page runs a database query per item in a list. The loops that remain are admin actions on a handful of rows (reordering, exchange rates, deleting a user), the daily job's capped batches (one email per row is the job), and looking up team members' email addresses (Supabase's sign-in service has no lookup of many users at once; teams are small and the lookups run in parallel). The company merge now moves members, services and categories in one statement each (covered by a new test), and the team page loads names in one query. | Spec 25.4 X-PERF-10. |
| E9 | Speed: the mobile menu and search overlay are built only when first opened (homepage elements 1,237 → 773); breadcrumbs stay on one line; the property page's action buttons stack on phones; the heading and body fonts use `display: optional` (preloaded, never swapped in late). Property page layout shift 0.337 → 0.091. Results: `docs/qa/lighthouse-2026-10-15.md`. With real slow-phone throttling all six measured pages score 92–98; Lighthouse's simulated estimate gives 79–95 in this Codespace, which shares its CPU. The ≥ 90 target is for the Vercel preview, which sits behind Vercel login, so you check it there (to-do list). | Spec 25.4 X-PERF-01…05. |
| E9 | Found and fixed on the way: the header menus could open on hover and then close on the click that followed; "Saved search" alerts can now be set from a development page ("Get alerts for new listings here"); admin dialogs announce their title to screen readers; warning text uses a darker amber for contrast; a long email address on Settings wraps on phones; approving partner applications and job applications is now counted in analytics; moving categories and places is recorded in the admin audit log. | Tests (crawl, accessibility, responsive). |
| E10 | Upgraded to Next.js 15.5.28 and React 19 (fully green: lint, typecheck, clean build, unit and full browser tests). Reason: Next.js 14 gets no more security fixes, and `npm audit` listed 23 Next.js advisories, two of them critical, fixed only in 15.5.24 or later. After the upgrade no advisory against Next.js remains; Next's own PostCSS copy is pinned to the patched 8.5 line. The remaining findings are build-time tooling only (Tailwind CSS 3, ESLint), see `docs/qa/npm-audit-2026-10-15.md`. | Spec 24 (E10), 25.4 X-SEC-11. |
| E10 | What changed for the code: request data (`cookies`, `headers`, page `params` and `searchParams`) is now read with `await` (official codemod, then tidied to the house style); admin checks became async; `useFormState` became `useActionState`. React 19 clears a form after it is sent, which would have wiped what visitors typed when the server reports an error: forms now use a small `NoResetForm` wrapper that keeps the values, and the tests that check "errors keep what was typed" pass again. Shared page JavaScript grew from 88 kB to 103 kB (React 19); every public page stays under the 170 kB budget (largest: sign-up, 151 kB). | Spec 16 budgets; no behaviour change for visitors. |
| E10 | Found and fixed while testing: a form with a file upload (inspection photos, service-request files, claims, CVs) could be sent while a file was still uploading, and that file was then left out without a word. Such forms now refuse to send until every upload has finished and say "Please wait until your files have finished uploading". | Spec 25.4 forms. |
| 25.5 | Found before go-live: the live database still has the old site's table `jobs`, and migration 0019 created a new table with the same name, so 0019 would have failed on live. The new table is now `job_posts` (legacy `jobs` untouched). The local test copy now contains a structural replica of all 22 legacy tables (`supabase/local-stack/legacy.sql`, from the 13 Oct snapshot, no real data) so such clashes fail locally first, and every migration is applied as one transaction, as on live. | Spec 20.3: legacy tables are never dropped or renamed. |
| 25.5 | The legacy lockdown is `supabase/legacy/cutover_legacy_lockdown.sql` (with `_REVERSE` and `_check`), not a numbered migration: numbered migrations run at cutover step 3 while the old site still needs its public reads; the lockdown runs at step 7, after the new site is live. It removes the 12 remaining public read policies and the public-key permissions on all 22 legacy tables; data is kept. | Spec 20.3 / brief 25.6. |
| 25.5 | Each migration from 0010 has a machine check (`supabase/checks/NNNN.sql`, first line = expected result), the same query as in `supabase/README.md`. The cutover runner applies one migration, runs its check, and stops on any difference. | Brief 25.6 step 3. |
| 25.5 | Production smoke tests (`smoke-prod/`, `playwright.production.config.ts`) are read-only: they never sign in, submit or write, so no "HL-SMOKE-TEST" records are created and nothing needs cleaning. Forms are checked by submitting them empty (the server refuses; nothing is stored). Live forms are protected by Turnstile, which the tests do not bypass. | Brief 25.6 step 6. |
| 25.5 | Vercel previews are behind Vercel login. The smoke tests can run against a preview only if you create a "Protection Bypass for Automation" secret (Vercel → Settings → Deployment Protection) and pass it as `VERCEL_AUTOMATION_BYPASS_SECRET`; otherwise they run on production right after the merge. | Changing Vercel settings is yours to do. |
| 25.5 | Cutover rehearsal on the local copy (15 Oct 2026), starting from the live state (22 legacy tables + migrations 0001–0009): non-interactive backup (3 files written), migrations 0010–0026 applied one at a time with every check PASS (17 of 17; a second run applies nothing), security test 133/133 PASS, legacy lockdown proof 23/23 PASS (before it, the public key could read active legacy rows), reverse script restores the previous reads exactly, security test still 133/133 after the lockdown, rehearsal merge of relaunch/construction into main without conflicts, preflight against the local build (all PASS except the email and Turnstile keys, which the test copy does not have). | Brief 25.6, rehearsed with `CUTOVER_DB=local`. |

## Regulatory checks (spec 24.11, updated for Section 26)

On 15 Oct 2026 you confirmed that HagerLand's regulatory approval covers all its services. Record each licence or approval reference in admin → Settings → **Licences and approvals** so it can be shown on the relevant pages. Nothing below is legal advice.

| Service | Status | Where it matters on the site |
|---|---|---|
| Estate agency (sell, let, buyer representation, sourcing, developer sales, valuations, viewings, offers, tenant applications) | **Approved — confirmed by AB (15 Oct 2026)** | `/agency` pages, listing agency panel, "Marketed by HagerLand" labels, Terms |
| Property management, including collecting and holding rent for owners (HagerLand Property Care, owner portal) | **Approved — confirmed by AB (15 Oct 2026)** | `/manage`, `/diaspora/property-care`, `/owner` |
| Recruitment and placement (staffing requirements) and the job board | **Approved — confirmed by AB (15 Oct 2026)** | `/jobs`, Recruitment request type |
| Finance introductions | **Approved — confirmed by AB (15 Oct 2026)** | `/finance` (Interest on; Aggregate once verified partners are added), "Ask about financing" |
| Insurance introductions | **Approved — confirmed by AB (15 Oct 2026)** | `/insurance` (Interest on; Aggregate once verified partners are added) |
| Service requests, commissions and lead fees | **Approved — confirmed by AB (15 Oct 2026)** | Request engine, deals ledger, Terms |

Still for your lawyer (not services, but the documents and data rules):

| Topic | Check with your lawyer | Where it matters |
|---|---|---|
| Terms and privacy wording | Review `/terms` (including the new estate agency terms of business), `/privacy` and `/cookies` as a whole, then set the "last updated" dates in admin → Settings. | Legal pages |
| Personal data | What does Ethiopia's personal data protection law require (registration, a named contact, consent wording, data held outside Ethiopia)? For UK visitors, is an ICO registration needed (step 11)? | Privacy policy, CVs, tenant applications, data export and deletion |
| Selling online | Do consumer protection or e-commerce rules apply to HagerLand Supply quotes, Special Buys and trade prices (price display, VAT-inclusive prices)? | `/supplies`, Special Buys, trade accounts |
