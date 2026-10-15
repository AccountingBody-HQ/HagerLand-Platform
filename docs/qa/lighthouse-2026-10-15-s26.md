# Lighthouse results — 15 Oct 2026 (Section 26, S12)

Same method as `lighthouse-2026-10-15.md`: test build on the local Supabase copy, Lighthouse 12.8.2, mobile settings, realistic published content with photos (`seedShowcase`, removed afterwards). "Applied" really slows the network (slow 4G) and the CPU (4×); "simulated" is Lighthouse's default estimate.
SEO reads 66–69 and best practices 96 on test builds only (deliberate "do not index" and plain `http://localhost`), as before.

## Applied throttling (slow 4G, 4× CPU)

| Page | Performance | Accessibility | LCP | TBT | CLS |
|---|---|---|---|---|---|
| / | 84, then 91 and 91 on a quieter machine | 100 | 1.8–1.9 s | 320–580 ms | 0.015–0.025 |
| /property/[slug] | 89 | 100 | 1.7 s | 400 ms | 0.004 |
| /supplies/product/[slug] | 92 | 100 | 1.7 s | 300 ms | 0.010 |
| /company/[slug] | 93 | 100 | 1.6 s | 280 ms | 0.027 |
| /jobs (now the live job board) | 86 | 100 | 1.7 s | 530 ms | 0.015 |
| /buy (new pillar hub) | 92 | 100 | 1.7 s | 310 ms | 0.009 |

## Simulated (default), two runs

| Page | Performance | LCP | CLS |
|---|---|---|---|
| / | 73–81 | 3.7–3.8 s | 0 |
| /property/[slug] | 70–77 | 3.7–3.9 s | 0 |
| /supplies/product/[slug] | 76–79 | 3.3–3.8 s | 0 |
| /company/[slug] | 80–85 | 3.0–3.6 s | 0 |
| /jobs | 74–86 | 3.2–3.7 s | 0 |
| /buy | 75–82 | 3.3–3.8 s | 0 |

## What this means

- Accessibility 100 on every page. Largest paint under 2 seconds and layout shift under 0.1 with real throttling everywhere.
- Shared JavaScript is unchanged at 103 kB. The homepage's first load is 145 kB (budget 170 kB): Section 26 added the ecosystem diagram and the All services panel, and its real-throttling score went from 94 to 91 on a quiet machine.
- This Codespace has 2 CPU cores and was under load (load average about 2.5) during the first pass; the first homepage run (84) and the simulated scores move by up to 10 points between identical runs, because "blocking time" depends on spare CPU.
- `/jobs` is not comparable with the earlier figure: it was the coming-soon page then and is the live job board now.
- As before, the ≥ 90 mobile target is checked on the Vercel preview (LAUNCH_REPORT, section 3, step 13). If the homepage or property page stays below 90 there, trimming the homepage's JavaScript is the first post-launch performance task.
