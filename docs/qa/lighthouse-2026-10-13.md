# Lighthouse results — 13 Oct 2026

Measured on the test build (local Supabase copy with realistic content and photos), mobile settings, Lighthouse 12.8.
"Simulated" is Lighthouse's default estimate for a slow phone; "applied" actually slows the network (slow 4G) and CPU (4×) and measures.
SEO shows 66–69 on test builds only because test and preview builds are deliberately marked "do not index"; that is the only failing SEO check (`is-crawlable`). Production pages are indexable.

## Simulated (default)

| Page | Performance | Accessibility | Best practices | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| / | 84 | 100 | 100 | 3.2 s | 370 ms | 0 |
| /property/for-sale | 93 | 98 | 100 | 2.9 s | 150 ms | 0 |
| /property/[slug] | 82 | 100 | 100 | 3.5 s | 360 ms | 0 |
| /supplies | 94 | 100 | 100 | 2.4 s | 230 ms | 0 |
| /supplies/product/[slug] | 86 | 100 | 100 | 2.6 s | 420 ms | 0 |
| /professionals | 97 | 100 | 100 | 2.3 s | 120 ms | 0 |
| /company/[slug] | 90 | 100 | 100 | 3.1 s | 220 ms | 0 |
| /developments/[slug] | 88 | 100 | 100 | 3.1 s | 260 ms | 0 |
| /our-developments | 95 | 100 | 100 | 2.8 s | 90 ms | 0 |
| /list-with-us | 95 | 100 | 100 | 2.8 s | 100 ms | 0 |

## Applied throttling (slow 4G, 4× CPU)

| Page | Performance | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| / | 89 | 2.0 s | 2.0 s | 350 ms | 0.002 |
| /property/[slug] | 95 | 1.7 s | 1.7 s | 170 ms | 0.089 |
| /supplies/product/[slug] | 98 | 1.7 s | 1.7 s | 120 ms | 0.005 |

Observed (unthrottled) first and largest paint on the homepage: 0.7 s.

## JavaScript per page (first load, gzip)

Shared by all pages: 87.5 kB. Largest public pages: /signup and /onboarding 141 kB; detail pages 126–128 kB; homepage 126 kB. All under the 170 kB budget (spec Section 16).

## Changes made in WP-18

- The header no longer loads the Supabase library in the browser to show "Sign in / My account" (about 60 kB less on every page); performance on the homepage rose from 68 to 84 (simulated).
- Admin menu links no longer pre-load every admin screen in the background.
- Photo lightbox loads only when opened.
- Colour contrast fixes (gold text and buttons, info alerts), labelled file inputs, keyboard-scrollable admin tables.

Re-run on the Vercel preview after deployment: real hosting (CDN, HTTP/2, image service) is usually faster than this Codespace.
