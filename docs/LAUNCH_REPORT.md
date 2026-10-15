# HagerLand relaunch — Launch report

**Date:** 13 October 2026 · **Branch:** `relaunch/construction` · **Status:** Phase 1 (WP-3 to WP-19) is built and tested. Nothing has been changed on the live site. WP-20 (cutover) waits for you.

This report is in four parts:

1. What is finished, and the evidence
2. A page-by-page checklist for you to review
3. Your to-do list before launch, in order
4. Known limitations and Phase 2

---

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

### Evidence (final commit on `relaunch/construction`)

| Check | Result |
|---|---|
| Lint (`npm run lint`) | No warnings or errors |
| Type check (`npx tsc --noEmit`) | 0 errors |
| Clean production build (`rm -rf .next && npm run build`) | Succeeds. JavaScript shared by every page: 87.5 kB |
| Unit tests (Vitest) | 85 passed, in 17 files |
| Browser tests (Playwright, local copy of the database) | **145 passed**, 3 skipped by design (checks that are the same at every width run once), 0 failed |
| Database security test (`supabase/tests/rls_test.sql`) | 28 of 28 PASS (local copy; 28 of 28 on live after migrations 0001–0009) |
| Accessibility (axe, WCAG 2.2 AA) | 0 serious or critical problems on 26 public pages (phone and desktop) and 9 admin screens |
| Phone and screen widths | No sideways scrolling on 25 page types at 360, 390, 768, 1024 and 1440 px |
| Link crawl | 290 internal pages followed: 0 broken links, 0 errors |
| Secrets in browser code | Every secret value checked against all browser files: none found |
| Speed (Lighthouse, phone) | See below |

The browser tests cover these complete journeys:

- An owner signs up, lists a property with photos, HagerLand approves it, a visitor reveals the phone number and sends an enquiry, and the owner sees it in their inbox.
- A contractor creates a business profile, it is approved, they upload verification documents and are marked Verified.
- Someone claims an imported business.
- A guest builds a quote list and HagerLand issues a quote.
- A guest sends a materials list with a file.
- A visitor registers interest in HagerLand Developments.
- A visitor sends the contact form.

They also cover every admin screen, admin sign-in and lock-out, the daily job, sitemaps, share images, canonicals, structured data, security headers, upload abuse and rate limits.

**Lighthouse (phone settings, test build).** Full table: `docs/qa/lighthouse-2026-10-13.md`.

| Page | Performance | Accessibility | Best practices |
|---|---|---|---|
| Homepage | 84 (89 with real throttling) | 100 | 100 |
| For sale results | 93 | 98 | 100 |
| Property page | 82 (95 with real throttling) | 100 | 100 |
| Supplies | 94 | 100 | 100 |
| Product page | 86 (98 with real throttling) | 100 | 100 |
| Professionals | 97 | 100 | 100 |
| Company page | 90 | 100 | 100 |
| Development page | 88 | 100 | 100 |
| Our developments | 95 | 100 | 100 |
| List with us | 95 | 100 | 100 |

- **Largest paint with real slow-4G throttling:** 1.7–2.0 s (target under 2.5 s).
- **Layout shift:** at most 0.089 (target under 0.1).
- **SEO scores:** these read 66–69 only because test and preview builds are deliberately marked "do not index". Production pages are indexable.
- **Next step:** please re-run Lighthouse on the Vercel preview. Real hosting is normally faster than this test machine.

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
| ☐ | `/terms`, `/privacy`, `/cookies` | **For your lawyer** (see to-do list) |
| ☐ | `/login`, `/signup`, `/signup?type=owner` | Sign-in and sign-up |
| ☐ | `/any-wrong-address` | "Page not found" screen |

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
| ☐ | `/account/settings` | Profile, password, delete account |

### Admin (sign in at `/roodber8-login`)

| ✓ | Path | What to check |
|---|---|---|
| ☐ | `/roodber8` | Dashboard numbers and queues |
| ☐ | `/roodber8/review` | All 9 tabs: approve, reject with reason, request changes, bulk approve |
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

---

## 3. Your to-do list before launch, in order

### Step 1 — Take a backup

Follow `docs/RUNBOOK.md` section 1.

### Step 2 — Run the new migration on live

There is one: **`supabase/migrations/0010_public_settings.sql`**. It lets the website read the business details you enter in Settings. It adds empty settings and changes no existing data.

1. Supabase → **SQL Editor → New query**. Paste the whole file and click **Run**.
2. Check it worked:
   ```sql
   select count(*) from site_settings_public;
   ```
   **You should see:** `14`
3. Run `supabase/tests/rls_test.sql` again. **You should see:** 28 rows, all starting with `PASS`.

### Step 3 — Vercel environment variables

Go to Vercel → Project **hagerland-platform** → Settings → Environment Variables.

Set each one for **Production**, and also for **Preview** where the last column says so. Never paste the values anywhere else.

| Variable | Where the value comes from | Preview too? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API keys → publishable key | Yes |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API keys → secret key | Yes |
| `NEXT_PUBLIC_SITE_URL` | `https://www.hagerland.com` | **No** (Production only) |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Your choice: use a new long password at launch | Yes |
| `ADMIN_SESSION_SECRET` | Run `openssl rand -hex 32` in the Codespace terminal | Yes |
| `ADMIN_TOTP_SECRET` | Your existing authenticator secret | Yes |
| `ADMIN_DIGEST_EMAIL` | The address that should receive the daily digest | Optional |
| `IP_HASH_SALT` | Run `openssl rand -hex 32` | Yes |
| `CRON_SECRET` | Run `openssl rand -hex 32` (Vercel Cron sends it automatically) | No |
| `RESEND_API_KEY` | Resend → API Keys | No (keep previews from emailing real people) |
| `EMAIL_FROM` | `HagerLand <hello@hagerland.com>` | No |
| `EMAIL_FROM_SUPPLY` | `HagerLand Supply <supply@hagerland.com>` | No |
| `EMAIL_REPLY_TO` | The address replies should go to | No |
| `HAGERLAND_INBOX_EMAIL` | Where contact-form and general enquiries go (otherwise the email in Settings is used) | No |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare → Turnstile → your site (hostname www.hagerland.com) | **No** (Production only) |
| `GOOGLE_PLACES_API_KEY` | Google Cloud → APIs & Services → Credentials (Places API (New) enabled) | Optional |
| `ANTHROPIC_API_KEY` | Anthropic Console → API keys (for AI drafts of imported businesses) | Optional |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Google Cloud, Maps Embed API, restricted to hagerland.com | Optional |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` only after step 4's Google set-up | Optional |
| `CRON_PURGE_RATE_LIMITS` | `true` if you agree to the daily clean-up of old rate-limit counters | Optional |
| `ANTHROPIC_MODEL` | Leave empty unless you want a different model | Optional |

After saving, redeploy: Deployments → latest → ⋯ → **Redeploy**. If anything is missing or malformed, Vercel's logs show a clear "Invalid environment configuration" line at start-up.

### Step 4 — Supabase Auth settings

All of these are in Supabase → **Authentication**. Details are in `docs/auth-email-templates/README.md`.

1. **URL Configuration:**
   - Site URL: `https://www.hagerland.com`.
   - Redirect URLs: `https://www.hagerland.com/**`, plus your Vercel preview pattern, for example `https://*-accountingbodys-projects.vercel.app/**`.
2. **Emails → Templates:** paste the four templates from `docs/auth-email-templates/`, with the subjects listed there.
3. **SMTP:** use Resend once the domain is verified (step 5): host `smtp.resend.com`, port 465, user `resend`, password = your Resend API key, sender `hello@hagerland.com`.
4. **Sign-in settings:** keep **Confirm email** on and set the minimum password length to 10.
5. **Google sign-in (optional):** create an OAuth client in Google Cloud, add it under Providers → Google, then set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in Vercel. Until then the Google button stays hidden.

### Step 5 — Resend domain

1. Resend → **Domains → Add domain** → `hagerland.com`.
2. Add the DNS records Resend shows (at your DNS provider), then wait for **Verified**.
3. If your free plan's single domain is already used by accountingbody.com, upgrade to **Resend Pro** (about US$20 a month).
4. Send yourself a test: sign up with your own email on the preview, after adding `RESEND_API_KEY` to Preview **temporarily**. Remove it again afterwards.

### Step 6 — Supabase Pro

Upgrade the project to **Pro** (about US$25 a month) before launch. You get daily backups, no project pausing and more storage.

**Note:** your Supabase organisation has a quota restriction date of **3 November 2026**. Upgrade before then to avoid restrictions.

### Step 7 — Fill in the Section 23 items

Most of these are in **admin → Settings**. Anything left empty stays hidden, so you can launch with some still blank.

| # | Item | Where you set it |
|---|---|---|
| 1 | Tagline "Build. Buy. Live." (shown in the footer) | Confirm, or ask a developer to change `lib/brand.ts` |
| 2 | Free listing at launch | Settings → Business promises → "Listing is free". Private owners are limited to 3 live listings (Settings → Rules) |
| 3 | Legal entity (name, registration number, address, governing law) | Settings → Legal entity. **Then have a lawyer review `/terms`, `/privacy` and `/cookies`**, and set their dates in Settings → Legal pages dates |
| 4 | Contact details (phone, WhatsApp, Telegram, email, Supply email, address, hours) | Settings → Contact details |
| 4 | Delivery area and quote reply time | Settings → Business promises |
| 5 | Brand photography | No stock photos are used. Add real photos to listings, products and developments in admin. Add your first HagerLand project in admin → Developments → New, choosing HagerLand as the developer (it is then labelled as yours automatically) |
| 6 | "Why buy from HagerLand Developments" points | Settings → Business promises → Add a point. Hidden until at least one is filled in |
| 7 | Regions, cities and neighbourhoods | Admin → Locations (add areas, Amharic names, merge duplicates) |
| 8 | Launch content | Products: admin → Products, and CSV for prices. Businesses: admin → Imports. Developments: admin → Developments, and CSV import. Properties: admin → Properties → New |
| 9 | Map provider | Optional. Add `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` (step 3). No map pin picker at launch |
| 10 | Google sign-in | Step 4 |
| 11 | Sentry | Not used. The daily digest reports errors instead |
| 12 | Social media links | Settings → Social media (https links only; only filled ones show) |
| — | Announcement bar | Settings → Announcement bar (optional) |
| — | Homepage picks | Settings → Homepage picks (8-character property references) |

Also confirm this wording is true for your business. Edit it if not:

- **"usually within one business day"** for reviewing listings and profiles (onboarding, How it works, List with us, emails);
- **"Delivered to site"** and **"quoted fast and delivered to site"** on supplies pages;
- the HagerLand Developments FAQ and "How we build" text.

### Step 8 — Final checks on the preview, then cutover (WP-20)

1. Work through the checklist in section 2.
2. While signed in to Vercel, run Lighthouse (Chrome → Inspect → Lighthouse → Mobile) on the preview's homepage, a property page, a product page, a company page and a coming-soon page (e.g. `/jobs`). Target: Performance 90 or more on each. The Codespace results are in `docs/qa/lighthouse-2026-10-15.md`.
3. Paste one property, product, company page and the homepage into Google's Rich Results Test.
4. Check securityheaders.com on the preview.
5. When you are happy, ask for **WP-20 (cutover)**.

WP-20 merges to `main`, applies the legacy lockdown (making the old tables private) and rotates the admin secrets (`docs/RUNBOOK.md` section 3). After it, resubmit the sitemap in Google Search Console (`/sitemap/<type>.xml`, listed in robots.txt).

---

## 4. Known limitations and Phase 2

### Known limitations

- **Next.js version (security advisories):** `npm audit` reports advisories in Next.js 14.2, which is already the newest 14.2 release. Fixing them needs **Next.js 15**, a major upgrade the project rules reserve for your decision.
  - Already reduced: AVIF image conversion is off, image resizing only accepts our own photo bucket, and the site runs on Vercel's own infrastructure.
  - **Recommendation:** schedule the Next.js 15 upgrade soon after launch, as its own piece of work with full re-testing.
- **Tailwind 3 build tools** have audit warnings too. They only run while building, never on the live site.
- **Lighthouse scores:** in the simulated phone test, the homepage, property page and product page score 82–86, just below the 90 target. With real throttling they score 89–98, and the largest paint is under 2.5 s. Please confirm on the Vercel preview.
- **Layout shift on property pages:** the heading fonts swap in after loading, which moves the page slightly (0.089, under the 0.1 limit).
- **Imports:** with no `GOOGLE_PLACES_API_KEY` the Imports screen shows a set-up message. With no `ANTHROPIC_API_KEY` you write each description yourself during review.
- **Admin user search by email** scans the account list page by page. This is fine for thousands of users; a faster lookup is a Phase 2 item.
- **Legacy tables:** the old tables stay readable as before until the WP-20 lockdown.
- **Legal pages:** these must be reviewed by a lawyer before launch.

### Phase 2 (from the spec)

- Amharic version of the site (`/am`) with translated pages and listings.
- Property-type landing pages (for example `/property/for-sale/addis-ababa/bole/apartments`) once there is enough content.
- Map pin picker for listings (after a map provider is chosen).
- Phone (SMS) sign-in and WhatsApp notifications.
- USD price display for buyers abroad.
- Special buys in Supplies; online orders and payments.
- Paid plans and paid promotions (the promotions screen already records price and paid status).
- Slug change with automatic redirects for categories and locations.
- A deals table for commissions on sales HagerLand brokers.
- Guides and articles.

---

## Phase 1.5 decisions log (Sections 24–25)

Decisions made while building Phase 1.5, recorded as the brief asks. The final report section replaces this log at the end.

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
| E9 | Speed: the mobile menu and search overlay are built only when first opened (homepage elements 1,237 → 773); breadcrumbs stay on one line; the property page's action buttons stack on phones; the heading font uses `display: optional` (preloaded, never swapped in late). Property page layout shift 0.337 → 0.091. Results: `docs/qa/lighthouse-2026-10-15.md`. With real slow-phone throttling all six measured pages score 92–98; Lighthouse's simulated estimate gives 79–95 in this Codespace, which shares its CPU. The ≥ 90 target is for the Vercel preview, which sits behind Vercel login, so you check it there (to-do list). | Spec 25.4 X-PERF-01…05. |
| E9 | Found and fixed on the way: the header menus could open on hover and then close on the click that followed; "Saved search" alerts can now be set from a development page ("Get alerts for new listings here"); admin dialogs announce their title to screen readers; warning text uses a darker amber for contrast; a long email address on Settings wraps on phones; approving partner applications and job applications is now counted in analytics; moving categories and places is recorded in the admin audit log. | Tests (crawl, accessibility, responsive). |
| 25.5 | Found before go-live: the live database still has the old site's table `jobs`, and migration 0019 created a new table with the same name, so 0019 would have failed on live. The new table is now `job_posts` (legacy `jobs` untouched). The local test copy now contains a structural replica of all 22 legacy tables (`supabase/local-stack/legacy.sql`, from the 13 Oct snapshot, no real data) so such clashes fail locally first, and every migration is applied as one transaction, as on live. | Spec 20.3: legacy tables are never dropped or renamed. |
| 25.5 | The legacy lockdown is `supabase/legacy/cutover_legacy_lockdown.sql` (with `_REVERSE` and `_check`), not a numbered migration: numbered migrations run at cutover step 3 while the old site still needs its public reads; the lockdown runs at step 7, after the new site is live. It removes the 12 remaining public read policies and the public-key permissions on all 22 legacy tables; data is kept. | Spec 20.3 / brief 25.6. |
| 25.5 | Each migration from 0010 has a machine check (`supabase/checks/NNNN.sql`, first line = expected result), the same query as in `supabase/README.md`. The cutover runner applies one migration, runs its check, and stops on any difference. | Brief 25.6 step 3. |
| 25.5 | Production smoke tests (`smoke-prod/`, `playwright.production.config.ts`) are read-only: they never sign in, submit or write, so no "HL-SMOKE-TEST" records are created and nothing needs cleaning. Forms are checked by submitting them empty (the server refuses; nothing is stored). Live forms are protected by Turnstile, which the tests do not bypass. | Brief 25.6 step 6. |
| 25.5 | Vercel previews are behind Vercel login. The smoke tests can run against a preview only if you create a "Protection Bypass for Automation" secret (Vercel → Settings → Deployment Protection) and pass it as `VERCEL_AUTOMATION_BYPASS_SECRET`; otherwise they run on production right after the merge. | Changing Vercel settings is yours to do. |
| 25.5 | Cutover rehearsal on the local copy (15 Oct 2026), starting from the live state (22 legacy tables + migrations 0001–0009): non-interactive backup (3 files written), migrations 0010–0026 applied one at a time with every check PASS (17 of 17; a second run applies nothing), security test 133/133 PASS, legacy lockdown proof 23/23 PASS (before it, the public key could read active legacy rows), reverse script restores the previous reads exactly, security test still 133/133 after the lockdown, rehearsal merge of relaunch/construction into main without conflicts, preflight against the local build (all PASS except the email and Turnstile keys, which the test copy does not have). | Brief 25.6, rehearsed with `CUTOVER_DB=local`. |

## Regulatory checks before switching services on (spec 24.11)

HagerLand has built these services but makes no legal claims about them. Before you switch each one live (admin → Verticals), ask a qualified Ethiopian lawyer (and, for people in the UK, a UK adviser) these questions. Nothing below is legal advice.

| Service | Check with your lawyer | Where it matters on the site |
|---|---|---|
| Estate agency (Sell / Let with HagerLand, buyer representation, sourcing) | Does HagerLand need a brokerage or real-estate agency licence, and are there rules on commission and written agency agreements? | /agency pages, "Marketed by HagerLand" labels |
| Service requests and commissions | Can HagerLand charge providers a commission or referral fee, and how must it be invoiced (VAT, receipts)? Do customers need to be told? (The terms already say HagerLand may receive a fee.) | Request engine, deals ledger, Terms §12 |
| Finance | Is passing customer requests to banks or lenders an activity that needs approval from the National Bank of Ethiopia (for example as an agent or introducer)? Any rules on advertising credit? | /finance (coming soon), "Ask about financing" links |
| Insurance | Is passing requests to insurers or brokers insurance intermediation that needs a licence? | /insurance (coming soon) |
| Jobs and recruitment | Does a job board, or helping employers find staff ("staffing requirements", placements), need a private employment agency licence, especially for placements abroad? | /jobs (coming soon), Recruitment request type |
| HagerLand Property Care | Is managing properties, collecting rent or holding money for owners abroad regulated (property management, foreign exchange, tax on rent)? | /diaspora/property-care |
| Personal data | What does Ethiopia's personal data protection law require (for example registration, a named contact, consent wording, keeping data outside Ethiopia)? For UK visitors, does the UK GDPR apply and is an ICO registration needed? | Privacy policy, CVs, data export and deletion |
| Selling online | Do consumer protection or e-commerce rules apply to HagerLand Supply quotes, Special Buys and trade prices (price display, VAT-inclusive prices)? | /supplies, Special Buys, trade accounts |
| Terms and privacy wording | Ask the lawyer to review `/terms`, `/privacy` and `/cookies` as a whole, then set the "last updated" dates in admin → Settings. | Legal pages |

Until a service is cleared, keep it "coming soon": its pages explain what is coming and collect interest without offering the service.
