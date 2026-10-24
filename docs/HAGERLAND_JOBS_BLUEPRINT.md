# HagerLand Jobs, Recruitment & Staffing: blueprint (Ethiopia)

Status: **Phase 1 released** on 24 Oct 2026 (branch `jobs/phase-1-fixes`, no migration; record in `docs/LAUNCH_REPORT.md` "Releases" and `docs/RELAUNCH_PROGRESS.md`). Phases 2–6 are not built. Written 24 Oct 2026 on branch `docs/jobs-blueprint`, from `main` at `90946c0`. AB accepted the 10 decisions (13.4) and the 13 assumptions (13.3) on 24 Oct 2026.

How to read it:

- **Verified fact** means checked by reading the code, the migrations, an existing test, or the live site as a visitor (no forms submitted). The file or page is named.
- **Proposal** means a suggestion that has not been built.
- **Assumption** means a decision taken so the work could continue. Every assumption is listed again in Section 13.
- Legal points about Ethiopia are things to consider. They are marked **lawyer to confirm** and are not legal advice.

**Security check first (stop rule S2): no live privacy problem found.** On 24 Oct 2026, as an anonymous visitor on www.hagerland.com, the database refused to show job applications, candidate profiles, the employer candidate view and unpublished jobs (permission denied), and the private CV folder listed nothing. Only the public jobs view answered, with 0 open jobs.

---

## 0. For AB (one page)

**What we have today.** Jobs is switched **live** on www.hagerland.com, with 0 jobs open. The pieces work end to end (proved on the local copy, Section 2.1):

- A **job board** at `/jobs` with keyword, place, category and job-type filters, a page for each job with Google-ready job data, and a jobs sitemap.
- **Employers** (members of a business profile on HagerLand) write a job; **you approve it** in admin before it goes live; it closes on its closing date or after 60 days.
- **Candidates** sign in, apply with an email, an optional phone, a note and a CV (PDF or Word). The employer gets an email, reads the application in their account, opens the CV through a 10-minute private link and marks it viewed, shortlisted, not progressing or hired.
- A **candidate profile**, private unless the candidate chooses to be visible; employers then see skills and experience but never contact details or the CV, and ask HagerLand for an introduction.
- **"Submit a staffing requirement"**: a request form that lands in admin → Service requests, for HagerLand's own recruitment service.
- **Registers** for people hiring or looking for work, and the daily job that closes old jobs and deletes CVs after 12 months.

**What is missing.**

1. **Workers without email cannot apply.** Applying needs an account and an email. Most masons, carpenters, steel fixers and labourers find work by phone, Telegram and word of mouth.
2. **The staffing request form reads like a building request** (“Staffing requirement for a G+1 house in Bole”, “size, materials, access”, ETB budget bands). It works, but it confuses employers.
3. **No recruitment desk.** When an employer asks HagerLand to find staff, everything after the request happens in your head or on WhatsApp: roles, candidates found, introductions, who was hired, the fee.
4. **A person building a house (often from abroad) cannot post a job** without first creating a business profile.
5. **Trades are not in the categories.** “Skilled trades” is one box; job types have no “daily labour”.
6. **One automatic test has been broken since 16 Oct** because of an ambiguous line in the test, not the site (Section 2.1, D6).
7. **Two privacy wordings are not exact** (Section 3, R4 and R5).

**What a full Jobs service would add.** Phone-first applying (call-back, WhatsApp, Telegram, Amharic), a trades list, a HagerLand recruitment desk with consent-based introductions and a fee record, job posting for private individuals through HagerLand, scam and fairness checks, and later Telegram job alerts.

**What it could earn** (options, Section 8): recruitment fees from employers (never from candidates), paid or featured posts, and later employer subscriptions or day-labour supply. Each needs the recruitment licence numbers on the site, written terms and VAT advice.

**Recommended first step: Phase 1, no database change.** Fix the broken test line, give the staffing form hiring words, keep the return address when people sign in, let Operations staff see Jobs admin, and correct the two privacy wordings. Details in Section 9.

**What you must decide** (full list in 13.4): whether candidates may apply by phone without an account; whether HagerLand posts jobs on behalf of private clients; whether to hide “International placements” until a lawyer confirms the overseas-employment rules; the fee model for recruitment; and who runs the recruitment desk day to day.

---

## 1. Who uses Jobs (Ethiopia)

| Who | What they need | How they reach us |
|---|---|---|
| Daily labourers and trades (masons, carpenters, steel fixers, electricians, plumbers, painters, tilers, welders) | Work near them this week, the day rate, a quick way to say “I’m available” | Phone, Telegram, word of mouth; often no email; may prefer Amharic; some read little |
| Site staff and professionals (site engineers, foremen, quantity surveyors, architects, surveyors) | Proper vacancies with salary, a CV upload, a profile employers can find | Web and email, LinkedIn-style; Telegram groups |
| Drivers, security, office and sales staff | Clear jobs and simple applying | Phone first |
| Contractors and developers | Many workers quickly, reliable people, references | Phone; the site for formal posts |
| Diaspora clients building at home | Trusted workers or a foreman, without travelling | Web, WhatsApp, from abroad |
| Supply partners | Drivers, loaders, shop staff | Phone |
| HagerLand (you, staff) | Approve jobs, run recruitment for employers, record fees | Admin `/roodber8` |

---

## 2. What exists today (verified)

### 2.1 Public side (D1)

| Item | What it does | Files |
|---|---|---|
| Live switch | Jobs pages follow the Jobs pillar (Direct, Aggregate and Interest all on). Migration 0027 set Jobs live (“recruitment is approved”). When off, account pages show “Jobs on HagerLand open soon”. | `supabase/migrations/0027_pillars.sql` (pillar row, line 91; licences setting with an empty `recruitment` entry, line 302), `app/(site)/jobs/layout.tsx` (`VerticalGate`), `components/jobs/JobsNotLive.tsx` |
| Job board `/jobs` | Navy hero with blueprint grid, “Post a job” (gold) and “Create a candidate profile”; filters: keywords (full-text), place (any level, includes the places below), category (18), job type (6); 20 per page; honest empty state; “Need help hiring?” box; HagerLand recruitment section; candidate/employer register. Indexed when unfiltered, `noindex` when filtered. | `app/(site)/jobs/page.tsx`, `lib/data/jobs.ts` (`searchJobs`), `components/jobs/JobCard.tsx` |
| Job page `/jobs/[slug]` | Title, employer (linked, verification badge), place, type, closing date, salary (“ETB 30,000 – 45,000 per month”), description, requirements; “Apply now”; the warning “Never pay an employer or agent to get a job. Report anything suspicious to HagerLand.”; schema.org **JobPosting** (title, description, identifier, datePosted, validThrough, employmentType, hiringOrganization, jobLocation, baseSalary). | `app/(site)/jobs/[slug]/page.tsx`, `lib/jobs.ts` (`SCHEMA_EMPLOYMENT`, `formatSalary`) |
| Apply `/jobs/[slug]/apply` | **Account required.** Fields: full name, **email (required)**, phone (optional), cover note, CV (PDF or .docx, private folder `docs/cv/<user>/`) or the profile CV. Server checks: job still open, not your own organisation’s job, one application per job, 20 applications a day. Emails: “New application for …” to the employer’s managers, “Application sent: …” to the candidate. No Turnstile (account required instead). `noindex`. | `app/(site)/jobs/[slug]/apply/page.tsx`, `components/jobs/ApplyForm.tsx`, `app/actions/job-actions.ts` (`applyForJobAction`), `lib/email/templates.ts` |
| Post a job | `/account/jobs/new`: only a member of an organisation (any kind); jobs go live only if the business profile is approved. Fields: title, category, type, place (required), salary min/max/period (optional; currency follows the place), description (30+ characters), requirements, closing date. “Save draft” or “Submit for review”. A live job must be paused before editing. No payment. | `app/(account)/account/jobs/*`, `components/jobs/JobForm.tsx`, `lib/jobs.ts` (`jobSchema`) |
| Employer’s applications | `/account/jobs/[id]`: each application with name, email, phone, note, “Download CV” (10-minute private link; opening it marks the application viewed), status and private notes. | `app/(account)/account/jobs/[id]/page.tsx`, `app/(account)/account/cv/[id]/route.ts` |
| Candidate side | `/account/candidate` profile (headline, skills, qualifications, years, experience, availability, place, CV, visibility “Only me” or “Approved employers on HagerLand”, “Register me for placement help”); `/account/applications` (status, withdraw). | `components/jobs/CandidateForm.tsx`, `app/(account)/account/applications/page.tsx` |
| Find candidates | `/account/jobs/candidates`: members of a **published** organisation see opted-in candidates (first name, headline, skills, qualifications, experience, place) with a reference like C-1A2B3C4D, never contact details or CV; “Submit a staffing requirement” with the reference to ask for an introduction. | `app/(account)/account/jobs/candidates/page.tsx`, view `candidates_for_employers` (0019) |
| Registers | “Candidate and employer registers” form on `/jobs` (name, **email required**, phone optional, country; Turnstile). Stored in `interest_registrations`; old rows purged by the daily job. | `components/verticals/InterestForm.tsx`, `supabase/migrations/0011_vertical_registry.sql` |
| Site search | Jobs appear in `/search` while Jobs is live. | `lib/data/search.ts` |
| Sitemap | `/sitemap/jobs.xml` lists open jobs (empty on live today). | `lib/data/jobs.ts` (`jobSitemapEntries`) |
| Amharic | Jobs pages, forms and job emails are **English only** (they do not use `t()`); Amharic is off site-wide by default. | `app/(site)/jobs/*`, `components/jobs/*` |
| Mobile | Single-column forms, 44 px tap targets on buttons; the filter panel stacks above the results. Not re-measured at 375 px in this job. | — |

**D6, the broken test, in plain words.** `e2e/jobs.spec.ts`, test “switched live: an employer posts a job, HagerLand approves it, a candidate applies with a CV and the employer shortlists them”, checks the whole journey: post, review, approve, public board and filters, JobPosting data, site search, candidate profile with a CV, applying, duplicate refused, employer opens the CV privately and shortlists, a stranger cannot open the CV, employers find the candidate without contact details. At line 60 it checks the employer’s account menu shows “Jobs” with `getByRole('link', { name: 'Jobs', exact: true })`. Since the 16 Oct release that put “Jobs” in the main header (commit `8fa531f`), that page has **two** links named Jobs (header and account menu), so the test stops with “strict mode violation … resolved to 2 elements”. **The bug is in the test, not the site:** both links are correct and a user sees nothing wrong. Proof: it failed the same way on `main` at `ee3084f` before the supply work; and on 24 Oct, a temporary copy of the test with only that line narrowed to the account menu (`getByRole('navigation', { name: 'Account' }).getByRole('link', { name: 'Jobs', exact: true })`) **passed in full** (59 s) on today’s code. The copy was deleted. The real cost of the broken line: this journey has had no automatic check since 16 Oct. **Smallest correct fix:** that one-line change (Phase 1).

### 2.2 Data (D2)

All from `supabase/migrations/0019_jobs.sql` unless named.

| Table / view | Holds | Who can read or write |
|---|---|---|
| `job_posts` (not the legacy `jobs` table, which is untouched) | title, category, employment type (full time, part time, contract, temporary, internship, apprenticeship), place, country, currency (follows the place), salary min/max and period (hour, day, month, year), description, requirements, closing date, status (`listing_status`: draft, pending_review, published, paused, expired, rejected, archived, removed), dates, counts | RLS: organisation members read, insert and edit their own jobs; nobody deletes. A trigger sets country/currency and, on publishing, `published_at` and `expires_at` (closing date + 1 day, else 60 days). Protected columns (dates, counts, employer, status rules) via `protect_privileged_columns`. |
| `jobs_public` (view) | Published, unexpired jobs of **published** employers | Visitors and signed-in users (read only) |
| `job_applications` | reference (HLA-…), job, applicant user, name, email, phone, cover note, CV path, status (submitted, viewed, shortlisted, rejected, hired, withdrawn), employer notes, `cv_purged_at` | RLS: the applicant reads their own; the employer’s members read and may change only status and notes. Inserts only by the server. |
| `candidate_profiles` | name, headline, skills (≤30), qualifications, years, experience, availability, place, CV path, visibility (private/employers), placement wanted | RLS: the candidate only (read, create, edit, delete). |
| `candidates_for_employers` (view) | Opted-in, available candidates without contact details or CV | Signed-in members of **any published organisation** |
| `interest_registrations` (0011) | Register sign-ups (email required) | Server/admin |
| `partner_applications` (0011) | Includes partner type `recruiter` | Server/admin |
| `deals` (0014) | Money list linked to an enquiry, service request, quote or manual entry | Admin |
| Storage | CVs in the private bucket `private-docs` under `docs/cv/<user id>/`; uploads only into your own folder; PDF/.docx only (`app/api/uploads/sign/route.ts`, `lib/media-access.ts`) | Opened only through `/account/cv/[id]` (RLS decides) or the admin job page (signed 10-minute links) |

**Retention.** The daily job deletes CV files 12 months after the application and marks `cv_purged_at` (`lib/cron/daily.ts`, `purgeApplicationCvs`). The rest of the application (name, email, phone, note) is **kept with no end date**. Profiles stay until the candidate deletes them.

### 2.3 Admin (D3)

| Item | Files |
|---|---|
| “Jobs and applications” (menu group Jobs): overview counts (live, waiting, applications, last 30 days, hired), list with status filter; job page with Approve / Send back (reason emailed), pause, close, remove; the applications with CV links; audit trail. Development progress updates are approved from the same area. | `app/roodber8/jobs/page.tsx`, `app/roodber8/jobs/[id]/page.tsx`, `app/roodber8/actions/jobs.ts` (`AREA = '/roodber8/jobs'`) |
| Review queue tab “Jobs” lists jobs waiting for review | `app/roodber8/review/page.tsx` |
| Roles: `/roodber8/jobs` is in **no** staff role, so only the owner opens Jobs admin. Operations has Service requests (where staffing requests land). Agent has the review queue but cannot approve jobs (the action checks `/roodber8/jobs`). | `lib/admin/roles.ts` |
| Audit: `job.approve`, `job.reject`, `job.paused/archived/removed` | `app/roodber8/actions/jobs.ts` |
| Daily digest: “Jobs waiting for review”, “New job applications (24 h)”, “Jobs closed today” | `lib/cron/daily.ts` |
| Exports: **none** for jobs or applications | `app/roodber8/export/[kind]` |
| Emails: job approved/sent back (`jobDecisionEmail`), new application, application sent | `lib/email/templates.ts` |

### 2.4 Recruitment & Staffing service (D4)

- **“Submit a staffing requirement”** is a service request in the request engine: category `recruitment` › `staffing` (0019) with questions (roles, how many people, contract type, start date, hiring from or placing abroad). It uses the general request form (`components/service-requests/ServiceRequestForm.tsx`), so it also asks for a building-style title, “Describe what you need — size, materials, access…”, “How soon?”, an ETB budget band and “Where is the work?”. Name, **phone and email are required**. It lands in admin → **Service requests** (Operations area), where it can be matched to providers like any request.
- **Fees**: there is no recruitment-specific record. A fee could be typed into **Deals and commissions** (`deals`, source “service request” or “manual”).
- **Recruiter partners**: `partner_applications.partner_type` allows `recruiter`; there is no recruiter workflow beyond the application list.
- **Licence**: admin → Settings has a “Recruitment and placement” licence field (`app/roodber8/settings/page.tsx`, `lib/validation/settings.ts`); it is empty, so nothing is shown. Once filled, the Terms page shows it (`app/(site)/terms/page.tsx`, line 86); the Jobs pages do not show it yet. The Terms already say candidates are never charged and recruitment fees are agreed with the employer in writing.
- **Candidate introductions**: manual (employer quotes a C-reference in a staffing request; HagerLand asks the candidate).

### 2.5 Links to other areas (D5)

| Area | Link today |
|---|---|
| Organisations | Jobs belong to an organisation; an organisation with a published job counts as a Jobs provider for the pillar (0027). The public company page does **not** list its jobs. |
| Supplies (Phase 5) | On an organisation’s admin page, “Jobs, projects and supply activity” lists its job posts next to building projects and supply orders (`lib/supply/activity-data.ts`). Demand → Supplies counts published job categories as a demand signal (`lib/supply/insights-data.ts`). |
| Building projects | No link to hiring. |
| Professionals | Separate directory; no link to jobs or candidates. |
| Knowledge & Advice | No guide about jobs, CVs, wages or hiring (live guides: building permits, buying checklist, glossary). |

---

## 3. Gaps and risks (D6, D7), ranked

| # | Gap or risk | Why it matters | Severity | Fix in |
|---|---|---|---|---|
| R1 | **Workers without email cannot apply** (account + email required; registers also need email) | Excludes most trades and labourers, the biggest group in construction | High | Phase 2 |
| R2 | **Staffing request form uses building words and ETB budget bands** (live) | Confusing for employers; weak first impression for the recruitment service | High (cheap) | Phase 1 |
| R3 | **Broken test line (D6)** | The whole Jobs journey has no automatic check since 16 Oct | High (trivial) | Phase 1 |
| R4 | **“Approved employers” wording vs reality**: any member of any published business (supplier, agency, professional) can browse visible candidates | Candidates may be misled about who sees them; data-protection fairness (lawyer to confirm) | Medium | Phase 1 wording, Phase 2 rule |
| R5 | **Application details kept with no end date**; the privacy page states only the CV period | Data minimisation and transparency under Ethiopia’s personal data protection law (lawyer to confirm the duties) | Medium | Phase 1 wording, Phase 2 purge |
| R6 | **“International placements” category and the “placing people abroad” question** with no overseas-employment controls | Sending workers abroad is separately regulated in Ethiopia (lawyer to confirm which rules apply and whether HagerLand’s approval covers it) | High (legal) | Decision now; Phase 1 if hidden |
| R7 | **No recruitment desk**: roles, candidates, consent to introduce, placements and fees are untracked | Lost fees, no proof of consent, no learning | Medium | Phase 3 |
| R8 | **Private clients cannot post a job** without creating a business profile | Diaspora house-builders are a key audience | Medium | Phase 4 |
| R9 | **Categories mix fields and services** (“Permanent recruitment”, “Executive recruitment”, “Temporary labour” are services, not job areas); no trade list; no “daily labour” type | Hard to find work by trade; poor filters | Medium | Phase 2 |
| R10 | **Scams and unfair adverts rely on manual review only**: no “Report this job”, no checks for fees asked of candidates or discriminatory wording | Fake jobs and illegal requirements hurt trust (lawyer to confirm the discrimination rules) | Medium | Phases 2 and 4 |
| R11 | **English only** on jobs pages and emails | Many workers prefer Amharic | Medium | Phase 5 |
| R12 | **Jobs admin is owner-only**; no jobs export | You cannot hand day-to-day work to Operations | Low | Phase 1 (role), Phase 6 (export) |
| R13 | **Sign-in loses the return address** for every `/account/...` link (the account layout sends `next=/account`), so “Post a job” lands on the dashboard after sign-in | Small friction on every Jobs call to action | Low | Phase 1 |
| R14 | **Recruitment licence number not entered**, and the Jobs pages would not show it even when entered (only the Terms page does) | Trust; possibly a display duty (lawyer to confirm) | Low (AB to enter) | AB enters it; Phase 1 shows it on `/jobs` |

Nothing on live is broken: the board, job pages and forms load; the empty state is honest; the jobs sitemap is empty because no job is open.

---

## 4. Target picture (journeys)

### (a) A mason looking for work: proposed
1. Hears about HagerLand on Telegram or from a foreman; opens `/jobs` on a cheap Android phone, in Amharic if chosen.
2. Taps a trade icon (Mason), sees jobs near Bole with the day rate.
3. Taps **Apply by phone**: name, phone, trade, area, “call me / WhatsApp me / Telegram me”, optional voice-note link or “call me back”. No account, no email. Turnstile and a rate limit stop spam.
4. Gets an SMS-free confirmation on screen with a reference (and on WhatsApp/Telegram only when we add messaging later); the employer sees the application with a tap-to-call link.
5. Can join the **worker register** the same way (trade, area, availability, consent to be contacted).

### (b) A site engineer: existing, refined
Signs in, keeps a profile with a CV, applies by email as today; chooses who can see the profile (verified employers that have posted a job).

### (c) A contractor needing 20 labourers next week: existing + proposed
1. Posts a job (business profile) **or** taps **Ask HagerLand to recruit**: roles, headcount, day rate or salary, start date, site area, contact by phone.
2. HagerLand’s recruitment desk confirms terms (fee agreed in writing), searches the worker register and applications, asks candidates for consent, introduces them, records who started and invoices the fee.

### (d) A diaspora client building in Addis: proposed
Uses **Ask HagerLand to recruit** without a business profile; HagerLand posts the job “on behalf of a private client” (labelled, the client’s name not shown) and handles applications.

### (e) HagerLand staff: proposed
Approve jobs (Operations allowed), work the recruitment desk, see scam reports, keep the registers fresh, record placements and fees; owner sees money.

**Principles for every phase:** phone first (+251, tap-to-call, WhatsApp/Telegram links); Amharic-ready strings; short forms with icons; trust (verified employer badge, “never pay to get a job”, report button); consent before any introduction; private data never public.

---

## 5. Reuse map

| Need | Reuse | New |
|---|---|---|
| Jobs, applications, profiles | `job_posts`, `job_applications`, `candidate_profiles`, views | Columns for trades and phone applications (Phase 2) |
| Phone formats | `normalisePhone`, `formatPhone`, `SupplyContactLinks` pattern (tap-to-call, WhatsApp, Telegram) | — |
| Requests | Request engine (`service_requests`), Operations area | Recruitment desk tables (Phase 3) |
| Fees | `deals` (source types) | `source_type` for recruitment, or desk ledger (Phase 3, decision) |
| Moderation | Review queue, `jobDecisionAction`, audit | Report-a-job queue (Phase 4) |
| Spam | Turnstile, `rateLimit` | — |
| Private files | `private-docs`, signed links | — |
| Insights | Demand page, digest | Jobs counts (Phase 6) |

---

## 6. Proposed data model (from migration 0040)

All additive; RLS on every new table; no change to the legacy `jobs` table.

- **0040 (Phase 2)**: `job_posts.trade` (controlled list) and employment type `daily_labour`; `job_applications.applicant_user_id` made optional for **phone applications** with new columns `channel` (account, phone), `preferred_contact` (call, whatsapp, telegram, sms), `language` (am, en), `consent_at`, `personal_data_purged_at`; a check that a phone application has a phone; `worker_register` (name, phone, trades, area, availability, preferred contact, language, consent, source) or an extension of `interest_registrations` (decision); `candidates_for_employers` limited to verified employers or organisations with an approved job.
- **0041 (Phase 3)**: `recruitment_assignments` (employer org or private client, roles, headcount, pay, start, fee terms, status), `recruitment_candidates` (assignment, candidate source: application, register, profile, manual; consent to introduce with time and method; introduced, interviewed, started, left), `recruitment_events` (append-only timeline); fees as `deals` rows (new source type) or a small append-only ledger like supply (decision).
- **0042 (Phase 4)**: `job_posts.posted_for` (organisation or private client through HagerLand), `job_reports` (reason, reporter contact optional, status), optional `job_post_fees` if paid posts are chosen.
- **Phase 5/6**: no migration expected (strings, alerts, insights).

---

## 7. Security, privacy and fairness (Ethiopia)

- **Personal data.** CVs, phones and emails are personal data. Ethiopia has a personal data protection law (Personal Data Protection Proclamation; **lawyer to confirm** its number, the duties that apply to HagerLand, consent wording, retention limits and how to answer access or deletion requests). Until then: collect the minimum; say exactly who sees what; keep consent records; purge on a schedule; never export CVs or phones in CSVs.
- **Who sees candidates.** Only verified employers or organisations with an approved job (Phase 2); never contact details or CVs; introductions only with the candidate’s recorded consent (Phase 3).
- **Scams.** Keep “never pay to get a job” on every job page; add “Report this job”; block adverts that ask candidates for money, passport handovers or deposits (review checklist and word warnings); verified employer badge; recruitment fees only from employers (Terms already say so).
- **Fair adverts.** Review for requirements about ethnicity, religion, sex, age or marital status that are not lawful job requirements (**lawyer to confirm** the Ethiopian rules, including the Labour Proclamation). Admin warnings, not automatic rejection.
- **Overseas work.** Placing Ethiopian workers abroad, and recruiting from abroad, may need separate approvals and protections (**lawyer to confirm** the overseas employment rules and whether HagerLand’s recruitment approval covers it). Recommendation: hide “International placements” and the “placing people abroad” question until confirmed.
- **Children.** No jobs or applications for under-18s (**lawyer to confirm** minimum ages and hazardous-work rules in construction); an age confirmation on phone applications.
- **Roles.** Owner: everything. Operations: approve jobs, recruitment desk, registers (no fees). Agent and Content: no Jobs admin.

---

## 8. Revenue options (options, not decisions)

| Option | How it works | Needs | Trade-offs |
|---|---|---|---|
| Free posting (today) | Employers post free; HagerLand reviews | Nothing new | Builds supply of jobs; no income |
| Featured or paid posts | Employers pay to post or to be shown first (labelled “Featured”) | Price list, invoices, VAT (**accountant/lawyer to confirm**), payment records; integrity rule: always labelled | Easy; may put off small employers early |
| Recruitment fee | HagerLand finds and introduces; employer pays on start (fixed fee or % of first month/year) | Recruitment licence numbers shown; written terms with replacement guarantee; VAT; Phase 3 desk | Best fit for the approval; needs a person to run it |
| Day-labour supply | HagerLand supplies a crew and charges a daily margin | Employer-of-record duties, wages, insurance, pension, tax (**lawyer to confirm**) | Highest risk; only after advice |
| Employer subscription | Monthly access to candidate search and featured posts | Enough candidates first | Later |
| Training/certification partners | Referral fees from training centres | Partner agreements | Later |

Candidates are never charged (Terms, `app/(site)/terms/page.tsx`).

---

## 9. Phased roadmap

Each phase is small, keeps the public look (navy hero with blueprint grid, white sections, brand green buttons, gold accents, Manrope and Inter, icon cards) and changes pages only incrementally.

### Phase 1: fixes and tidy-up (no migration) — released 24 Oct 2026 (Phase 1b staffing follow-ups also released)
- **Released as**: the test fix; staffing form wording for the staffing service only (no budget bands, "Pay offered" saved as the last line of the details, abroad question not asked); return to the same page after sign-in or sign-up (strict same-site check, never `/roodber8`); Operations may use Jobs admin (progress updates moved to their own owner-only area); "International placements" hidden everywhere and refused by the server (old records keep their label); the approved `/jobs`, job form and privacy wording; the licence line was already wired. Details: `docs/RELAUNCH_PROGRESS.md` row "Jobs 1".
- **Scope**: fix the D6 test line; give the staffing request hiring words (category-specific labels for title and description, hide the budget bands for staffing or replace them with “Pay offered”); keep the return address on sign-in for `/account/...` links; add `/roodber8/jobs` to the Operations role; privacy wording corrected (application details retention, who sees visible profiles) — public wording, needs AB’s go-ahead; if AB decides, hide “International placements” and the abroad question; show the recruitment licence note on `/jobs` (it already appears on the Terms page once AB enters the number in admin → Settings).
- **Public vs admin**: small public wording changes; admin role change.
- **Risks**: wording changes on public pages (AB approves the text first).
- **Tests**: the fixed Jobs journey; a staffing-form test (labels, no budget bands); sign-in return test; role test; plain-language test.
- **AB tests**: open `/request-service/staffing` (hiring words); sign out, click “Post a job”, sign in, land on the job form.

### Phase 2: phone-first applying and trades (migration 0040)
- **AB's notes for Phase 2 (24 Oct 2026)**: add an "I am 18 or older" tick to phone applications; add the trades plasterer, aluminium & glass fitter, gypsum ceiling installer, scaffolder and "Other" to the trade list (assumption 8); when the stricter visibility rule (decision 2) is built, update the two privacy lines again (`/privacy` "Employers you apply to" and the candidate profile option "Businesses with a published profile on HagerLand").
- **Must-do**: Delete all application details (not just CVs) after 12 months — must be live before 15 October 2027.
- **Deadline from Phase 1**: since 24 Oct 2026 the privacy page says application details (name, contact details, cover note) are deleted 12 months after the application, but only CVs are purged today. Applications exist on live only since the cutover (15 Oct 2026), so the purge of application details must be released **before 15 Oct 2027**.
- **Scope**: trade list and “daily labour”; trade icons on `/jobs`; **Apply by phone** without an account (Turnstile, rate limit, consent, preferred contact, language); worker register by phone; employer sees phone applications with tap-to-call; candidate visibility limited to verified employers or organisations with an approved job; purge of old application details; scam/fairness warnings in admin review.
- **Risks**: spam (Turnstile + limits); privacy (consent text — lawyer to confirm); changing the public apply flow (keep the email route for professionals).
- **Tests**: RLS for phone applications; purge job; e2e phone apply at 375 px; employer view; visibility rule.
- **AB tests**: apply by phone on a phone; see it in an employer account and in admin.

### Phase 3: HagerLand recruitment desk (migration 0041)
- **Scope**: admin desk for staffing requests: assignments, candidate shortlists from applications, registers and profiles, recorded consent before introductions, placements, fee terms and fee records (Deals or a small ledger), digest counts, audit.
- **Risks**: consent and data sharing (lawyer to confirm); fee terms; workload.
- **Tests**: consent required before introduce; roles (fees owner only); timeline append-only.
- **AB tests**: run one staffing request from request to placement and fee.

### Phase 4: private clients, trust and reports (migration 0042)
- **Scope**: jobs posted by HagerLand “for a private client”; verified-employer badge on jobs; **Report this job** with an admin queue; optional paid/featured posts (if chosen).
- **Risks**: labelling (integrity rule); payments (if chosen) need VAT advice.
- **Tests**: labels; report flow; paid post labelling.

### Phase 5: Amharic, Telegram and WhatsApp (no migration expected)
- **Scope**: jobs pages, forms and job emails through `t()`; WhatsApp and Telegram share buttons on jobs; a HagerLand Telegram channel feed of new jobs (manual first; a bot only if AB approves a new integration); call-back requests.
- **Risks**: translation quality (reviewed Amharic); any new integration needs AB.

### Phase 6: insights and links (no migration expected)
- **Scope**: jobs demand (trades asked for, areas, time to fill), recruitment report and CSV (owner, no personal data), company pages show open jobs, building projects suggest hiring help, links with Supplies (Section 10).

### Later, only if justified
Employer subscriptions, day-labour supply (after legal advice), skills checks with training partners, worker reviews (with care).

---

## 10. Links to Supplies (without mixing private data)

- **Shared organisation records**: a contractor that buys materials and hires workers is one organisation; its admin page already shows jobs, projects and supply activity together (read-only).
- **Signals only**: Jobs may tell Supplies “this contractor is hiring for a G+3 project” (a reason to call about materials); Supplies may tell Jobs “this contractor is active”. No supplier prices, margins, agreements or orders ever appear in Jobs pages, employer accounts or candidate views; no candidate data appears in Supplies.
- **Demand**: Demand → Supplies already counts job categories; Phase 6 can show trades in demand next to materials in demand (counts only).

---

## 11. What must not change

- The name **HagerLand**, green #1C7C4C, gold #B8862E, the three-node logo, fonts and the public look.
- URLs (`/jobs`, `/jobs/[slug]`, `/account/jobs`, `/account/candidate`, `/request-service/staffing`), the canonical host www.hagerland.com.
- `/roodber8` and its login model (username, password, TOTP; staff sign-in).
- The ten fixed services, including “Jobs, Recruitment & Staffing”.
- Legacy tables (the old `jobs` table and all others listed in CLAUDE.md).
- The supply quote flow and supply confidentiality.
- Candidates are never charged; CVs and contact details are never public.

---

## 12. Recommended next task (not executed)

**Phase 1** as one small job with no migration: the D6 one-line fix; staffing-form hiring words; sign-in return address; Operations access to Jobs admin; privacy wording (after AB approves the text); and, if AB decides, hiding “International placements”. Then Phase 2 (migration 0040) once AB answers decisions 1, 2 and 6.

---

## 13. Evidence and open questions

### 13.1 Inspected
- Migrations `0011_vertical_registry.sql`, `0014_service_requests.sql` (deals), `0019_jobs.sql`, `0026_indexes.sql`, `0027_pillars.sql`.
- Code: `app/(site)/jobs/*`, `app/(account)/account/jobs/*`, `app/(account)/account/cv/[id]/route.ts`, `app/actions/job-actions.ts`, `app/roodber8/jobs/*`, `app/roodber8/actions/jobs.ts`, `app/roodber8/review/page.tsx`, `components/jobs/*`, `components/verticals/InterestForm.tsx`, `components/service-requests/ServiceRequestForm.tsx`, `lib/jobs.ts`, `lib/data/jobs.ts`, `lib/data/search.ts`, `lib/content/verticals.ts`, `lib/media-access.ts`, `lib/cron/daily.ts`, `lib/admin/roles.ts`, `lib/auth.ts`, `app/(account)/account/layout.tsx`, `app/(site)/privacy/page.tsx`, `app/(site)/terms/page.tsx`, `lib/supply/activity-data.ts`, `lib/supply/insights-data.ts`.
- Tests: `e2e/jobs.spec.ts` (5 tests), `tests/unit/jobs.test.ts`.
- Local copy, 24 Oct 2026: the “switched live” journey passed in full with the one-line locator change (temporary copy, deleted).
- Live, 24 Oct 2026, read-only as a visitor: `/jobs` (live board, 0 jobs, `index, follow`), `/sitemap/jobs.xml` (empty), `/request-service/staffing` (building wording), `/account/jobs/new` and `/account/candidate` (sign-in with `next=/account`), anonymous database checks (all private tables refused; CV folder empty to visitors).

### 13.2 Not verified
- Live counts of applications, profiles and registers (no database access by rule).
- Phone layout at 375 px of every jobs page (not re-measured in this job).
- Ethiopian law: personal data protection, labour law, overseas employment, anti-discrimination, minimum ages, VAT and withholding on fees, the exact scope of HagerLand’s recruitment approval. All **lawyer to confirm**.
- Telegram or WhatsApp business integrations (not explored; any new integration needs AB).

### 13.3 Assumptions for AB to accept (recommended defaults)
1. Candidates are never charged; all fees come from employers.
2. Workers may apply by phone without an account or email; professionals keep the email route.
3. A phone application needs name, phone, trade or job, area and consent; email is optional.
4. Visible candidate profiles are shown only to verified employers or organisations with at least one approved job.
5. Application details (not just CVs) are deleted 12 months after the application, unless the candidate was hired through HagerLand (then kept as long as the fee records need, lawyer to confirm).
6. Every job is still reviewed by HagerLand before it goes live.
7. Jobs close on the closing date or after 60 days (as today).
8. The trade list starts with: mason, carpenter, steel fixer, electrician, plumber, painter, tiler, welder, labourer, foreman, site engineer, quantity surveyor, architect, surveyor, driver, machine operator, security guard, cleaner, store keeper, office/admin, sales.
9. “International placements” is hidden until a lawyer confirms the rules.
10. Operations staff may approve jobs and run the recruitment desk; fees and money are owner only.
11. Jobs pages stay English until Phase 5; new strings are written so they can be translated.
12. No new paid services (SMS, WhatsApp API, Telegram bot) without AB’s approval.
13. Phase 1 needs no migration; Phase 2 starts at migration 0040.

### 13.4 Decisions for AB (with recommendations)
1. **Apply by phone without an account?** Recommended: yes, for trades and labour (Phase 2).
2. **Who sees visible candidate profiles?** Recommended: verified employers or organisations with an approved job.
3. **Hide “International placements” and the abroad question now?** Recommended: yes, until a lawyer confirms.
4. **Recruitment fee model**: fixed fee per placement, or a percentage of the first month’s pay (or first year’s salary for professionals), with a replacement guarantee. Recommended: start with a fixed fee per role type for trades and a percentage for professionals; decide before Phase 3.
5. **Who runs the recruitment desk** day to day (you, a staff member with the Operations role, or a partner recruiter). Recommended: one Operations staff member in Addis Ababa.
6. **Private clients posting through HagerLand?** Recommended: yes, labelled “for a private client” (Phase 4).
7. **Paid or featured posts?** Recommended: not yet; revisit after 50 live jobs.
8. **Lawyer review** of data protection, consent wording, overseas employment, fair adverts and fee terms. Recommended: before Phase 2 goes live (consent) and before Phase 3 (fees).
9. **Enter the recruitment licence numbers** in admin → Settings so they can be shown. Recommended: as soon as available.
10. **Approve the Phase 1 public wording** (staffing form, privacy page) when Phase 1 is commissioned.
