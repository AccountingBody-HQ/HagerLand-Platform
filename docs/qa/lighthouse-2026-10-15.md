# Lighthouse results — 15 Oct 2026 (E9)

Measured on the test build (local Supabase copy), mobile settings, Lighthouse 12.8, same method as the 13 Oct baseline (`lighthouse-2026-10-13.md`).
"Simulated" is Lighthouse's default estimate for a slow phone. "Applied" actually slows the network (slow 4G) and the CPU (4×) and measures what happens.
SEO shows 66–69 on test builds only because test and preview builds are deliberately marked "do not index" (`is-crawlable`). Best practices shows 96 only because of a content-security-policy note that appears when the site is served over plain `http://localhost`.

## Applied throttling (slow 4G, 4× CPU)

| Page | Performance | Accessibility | LCP | TBT | CLS |
|---|---|---|---|---|---|
| / | 97 | 100 | 1.8 s | 141 ms | 0.015 |
| /property/[slug] | 92 | 100 | 1.9 s | 232 ms | 0.091 |
| /supplies/product/[slug] | 98 | 100 | 1.6 s | 141 ms | 0.002 |
| /company/[slug] | 97 | 100 | 1.7 s | 152 ms | 0.001 |
| /finance (live request page) | 97 | 100 | 1.7 s | 179 ms | 0 |
| /jobs (coming-soon page) | 97 | 100 | 1.7 s | 150 ms | 0 |

## Simulated (default)

| Page | Performance | LCP | TBT | CLS |
|---|---|---|---|---|
| / | 81–87 | 3.6 s | 324–358 ms | 0 |
| /property/[slug] | 79–89 | 3.3–3.6 s | 218–457 ms | 0 |
| /supplies/product/[slug] | 89–95 | 2.8–3.1 s | 132–240 ms | 0 |
| /company/[slug] | 81–86 | 3.6 s | 235–378 ms | 0 |
| /finance | 90–92 | 2.9–3.0 s | 186–238 ms | 0 |
| /jobs | 93 | 3.0 s | 146 ms | 0 |

Simulated scores move by up to 10 points between identical runs here, because the Codespace shares its CPU with other work: the "blocking time" figure changes from run to run on the same build.

## Changes made in E9

- The mobile menu and the search overlay are only built when first opened. The homepage went from 1,237 to 773 page elements; applied-throttling score 81 → 97.
- Breadcrumbs stay on one line (long names are shortened with "…"), so they no longer jump to two lines when the web font arrives.
- The property page's Save / Compare / Valuation / Financing buttons stack full-width on phones, so their height no longer depends on the font.
- The heading font (Manrope) now uses `display: optional`: it is preloaded and used when it arrives in time, and the page never re-flows to swap it in later. Body text (Inter) keeps `swap`.
- Property page layout shift: 0.337 → 0.091 (applied), under Google's 0.1 "good" line.

## Still to check on real hosting

The target (performance ≥ 90 on mobile) is for the Vercel preview. Vercel previews of this project are behind Vercel login (Deployment Protection), and changing that setting is off-limits for me, so AB runs PageSpeed Insights or Chrome Lighthouse on the preview while signed in (checklist item in LAUNCH_REPORT). Real hosting (CDN, HTTP/2, image service, no shared CPU) is normally faster than this Codespace.
