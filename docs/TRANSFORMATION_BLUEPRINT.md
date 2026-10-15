# HagerLand Property Ecosystem Transformation Blueprint
Current-state assessment, target operating model, platform evolution and implementation programme
**Evidence note.** The supplied repository contains no SQL migrations/schema dump; database constraints and RLS cannot be fully verified from source.
# Part I — Executive Perspective
## 1. Executive Summary
HagerLand should evolve, not restart. Property becomes the orchestration nucleus; shared identity, data, provider, workflow, trust and analytics capabilities are built once and reused across all ten pillars.
## 2. What HagerLand Has Already Built
## 3. Strategic Implications of the Existing Platform
## 4. Target Property Ecosystem
## 5. Key Recommendations
# Part II — Current-State Assessment
## 6. Existing HagerLand Architecture
## 7. Current Property Capability
## 8. Existing Marketplace Capabilities
## 9. Existing Technology and Data Capabilities
## 10. Existing Operating and Admin Capabilities
## 11. Existing Diaspora Capabilities
## 12. Existing Finance, Insurance, Jobs and Adjacent Capabilities
# Part III — Current-to-Target Gap Analysis
## 13. Ecosystem Capability Map
## 14. Ten-Pillar Maturity Assessment
## 15. Reuse / Enhance / Integrate / Build Matrix
## 16. Technology Gap Assessment
## 17. Data Gap Assessment
## 18. Operating Model Gap Assessment
## 19. Commercial Gap Assessment
## 20. Organisation and Governance Gap Assessment
# Part IV — Target Property Operating Model
## 21. Property Core Platform
## 22. Buy & Sell
## 23. Rent & Let
## 24. Build & Develop
## 25. Repair & Maintain
## 26. Manage Property
## 27. Property Finance
## 28. Property Insurance
## 29. Knowledge & Advice
## 30. Building Supplies
## 31. Jobs & Staffing
## 32. Diaspora Services
## 33. Professional & Service Provider Ecosystem
# Part V — Platform Evolution
## 34. Target Technology Architecture
## 35. Property Domain Model
## 36. Data Architecture
## 37. Identity and Account Architecture
## 38. Marketplace Architecture
## 39. Workflow and Transaction Architecture
## 40. Trust and Verification Architecture
## 41. Integration Architecture
## 42. Analytics and Demand Intelligence
# Part VI — Business and Commercial Model
## 43. Customer Segmentation
## 44. Customer Journeys
## 45. Partner Model
## 46. Revenue Model
## 47. Unit Economics
## 48. Cross-Pillar Economics
## 49. Ecosystem Flywheel
# Part VII — Implementation
## 50. Transformation Principles
## 51. Product Roadmap
## 52. Technology Roadmap
## 53. Operating Model Roadmap
## 54. Commercial Roadmap
## 55. Pillar Activation Roadmap
## 56. Implementation Backlog
## 57. Dependencies
## 58. Critical Path
## 59. First 90 Days from the Current Position
## 60. 6-Month Plan
## 61. 12-Month Plan
## 62. 24–36 Month Evolution
# Part VIII — Programme Management and Control
## 63. Transformation Governance
## 64. PMO
## 65. RACI
## 66. Risk Register
## 67. Stage Gates
## 68. Performance Framework
## 69. Benefits Realisation
## 70. Executive Decision Agenda
# Appendix A — Repository Evidence and Immediate Technical Findings
# Appendix B — Immediate Engineering Handoff Sequence
## Executive decision
Do not restart HagerLand. Stabilise the existing Property route, introduce Property Domain v2 additively, reuse marketplace/admin/verification/search assets, integrate BirrBank and Jobs, and activate all ten pillars progressively under Direct / Aggregate / Interest Capture modes.
## Ten-pillar maturity assessment
| Pillar | Current | Target | Gap | Complexity | Timing |
| --- | --- | --- | --- | --- | --- |
| 1 Buy & Sell | 3 — Basic marketplace | 5 — Managed/transaction-assisted | Property marketplace exists but is generic and route migration incomplete. | High | Now |
| 2 Rent & Let | 3 — Basic marketplace | 5 — Managed/transaction-assisted | Same base as Buy/Sell; rental lifecycle absent. | High | Now |
| 3 Build & Develop | 1 — Visible/content adjacency | 4 — Transaction-enabled marketplace | Providers exist only indirectly; project/RFQ workflow new. | Med-High | Next |
| 4 Repair & Maintain | 1 — Visible/provider adjacency | 5 — Managed service | Trade matching/job orchestration largely new. | Med | Next |
| 5 Manage Property | 1 — Provider category only | 5 — Managed service | Direct operating model and owner/tenant workflows new. | High | Next |
| 6 Property Finance | 2 — Information/demand adjacency | 4 — Partner transaction lead | BirrBank foundation; regulated partner workflow missing. | Med | Next |
| 7 Property Insurance | 2 — Information/demand adjacency | 4 — Partner transaction lead | Provider/product data exists; quoting/referral missing. | Med | Next |
| 8 Knowledge & Advice | 2 — Content/discovery | 5 — Integrated intelligence | Content exists but not a scalable property knowledge engine. | Low-Med | Now |
| 9 Building Supplies | 2 — Listing/supplier adjacency | 4 — Transaction-enabled marketplace | Supplier/product/RFQ/order model missing. | Med-High | Now/Next |
| 10 Jobs & Staffing | 3 — Basic marketplace | 5 — Managed recruitment | Jobs exists; candidate/application/placement depth missing. | Med | Now/Next |

## 90-day plan
| Period | Theme | Deliverables |
| --- | --- | --- |
| Days 0–15 | Stabilise | Fix absent /api/property routes or create canonical adapters; correct search /housing URLs; remove/fix missing cron; baseline build/lint; add smoke E2E; freeze schema changes until migrations are captured. |
| Days 15–30 | Architecture alignment | Create domain/module structure, migration baseline, Property v2 ERD, taxonomy/location model, lead model, media/storage design, feature flags and migration plan. |
| Days 30–60 | Property core release | Property v2 listing create/read/search/detail, images, Ethiopia location hierarchy, sale/rent attributes, compatibility adapter for legacy housing, admin moderation updates. |
| Days 60–90 | Ecosystem shell | 10-pillar navigation/landing pages; Knowledge hub; Jobs industry taxonomy; Supplies catalogue/RFQ MVP; finance/insurance structured interest forms using BirrBank data; provider onboarding pilot. |

## Implementation backlog
| Pri | Initiative | Rationale | Pillar | Release | Effort | KPI |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Repair Property API namespace | Current /property flows reference absent API routes | Property | Now | S | Zero broken verification/manage/resend flows |
| P0 | Remove/replace missing property-discovery cron | Vercel schedules absent endpoint | Platform | Now | XS | No failing scheduled invocation |
| P0 | Automated critical-path tests | No test suite found | Platform | Now | M | Build blocks on flow regressions |
| P0 | Versioned DB migrations | Schema absent from repo | Platform | Now | M | Reproducible DB and reviewed migrations |
| P0 | Property v2 domain schema | Generic housing table cannot support target | 1,2,5 | Now | L | New listings created on canonical schema |
| P0 | Media/storage pipeline | No image/document upload found | 1,2,3,4,5,9 | Now | M | Listings support moderated galleries |
| P0 | Location/taxonomy model | Free-text city/category insufficient | All | Now | M | Structured filters and SEO pages |
| P0 | Shared Lead/Enquiry service | Current enquiry table is counter-only | All | Now | M | Every demand CTA creates trackable lead |
| P1 | Property information architecture | 10 pillars visible coherently | All | Now | M | Users can reach all pillars in <=2 interactions |
| P1 | Knowledge/SEO hub | Direct low-risk pillar and demand source | 8 | Now | M | Indexed location/lifecycle content |
| P1 | Supplier catalogue/RFQ MVP | Reuse Made in Ethiopia/business patterns | 9 | Now/Next | L | Supplier products + quote leads |
| P1 | Jobs industry taxonomy | Existing jobs capability | 10 | Now/Next | S | Property/construction job discovery |
| P1 | Public accounts + roles | Required for repeat journeys | All | Next | L | Customer/provider dashboards live |
| P1 | Organisation/provider model | Cross-cutting supply layer | 3,4,5,6,7,9,10 | Next | L | Verified reusable provider profiles |
| P1 | Repair service request pilot | High-frequency use case | 4 | Next | L | Request-to-match workflow live |
| P1 | Finance lead integration | BirrBank reuse | 6 | Next | M | Partner lead acceptance/outcome tracked |
| P1 | Insurance lead integration | BirrBank reuse | 7 | Next | M | Partner lead acceptance/outcome tracked |
| P1 | Saved searches/alerts | Retention feature | 1,2 | Next | M | Returning user/alert conversion measured |
| P2 | Diaspora management pilot | High strategic differentiation | 5 | Next | XL | Managed portfolio with inspection/reporting |
| P2 | Candidate/application model | Jobs → staffing maturity | 10 | Next | L | Applications and placement pipeline |
| P2 | Quote/job workflow | Marketplace depth | 3,4,9 | Scale | L | Quotes accepted and jobs tracked |
| P2 | Reviews/reputation | Trust at scale | Providers | Scale | M | Verified completed-job reviews |
| P3 | Payments/payouts | Only after transaction volume | 4,9,10 | Conditional | XL | Positive unit economics + low dispute rate |
| P3 | Valuation/property history | Data maturity play | 1,2,8 | Later | XL | Sufficient trusted transaction/property data |

## Immediate technical findings
| Finding | Evidence path | Assessment |
| --- | --- | --- |
| Technology stack | package.json | Next.js 14.2.35, React 18, TypeScript, Supabase JS, Resend, Tailwind; no test dependency/script. |
| Property submission | app/property/post/actions.ts | Writes to housing table but builds verification URL under /api/property/verify-email. |
| Property management | app/property/manage/page.tsx | Calls /api/property/manage. |
| Property resend | app/property/edit-link/page.tsx | Posts to /api/property/resend-link. |
| Existing equivalent APIs | app/api/housing/* | manage, verify-email and resend-link routes exist under housing namespace. |
| Search | app/api/search/route.ts | Queries housing listing_type/location and returns /housing/{id}; needs canonical Property update. |
| Redirects | next.config.mjs | Public /housing routes redirect to /property; global no-store/no-cache headers are applied to all routes. |
| Cron | vercel.json | Schedules /api/cron/property-discovery but route absent from supplied repo. |
| Admin security | lib/admin-auth.ts | Username/password + TOTP + HMAC-signed expiring admin session. |
| Admin moderation | app/roodber8/review/actions.ts | Cross-table approve/reject/pending-change/audit patterns. |
| Enquiry | app/api/enquiry/route.ts | Stores only section and listing_id; insufficient as full lead model. |
| No public auth | repository search | No public sign-up/sign-in/auth client flow found. |
| No media upload | repository search | No storage/upload/next-image pipeline found. |
| No payments | repository search | No checkout/payment/payout implementation found. |
| No migrations | repository file scan | No .sql/migrations found, so database constraints/RLS cannot be audited from repo. |
| Sanity packages | package.json + repository search | Sanity dependencies installed, but no implementation usage found. |

## Engineering handoff sequence
- Create a branch and baseline: npm ci; run build/lint; capture current failures and route inventory. Do not alter production schema until a database backup and schema export exist.
- Create canonical /api/property/manage, /verify-email and /resend-link adapters by either moving the housing handlers into shared functions or routing Property APIs to the same services. Update all success redirects to /property. Keep /api/housing aliases temporarily for old links.
- Update global search to use canonical field names and /property URLs. If legacy rows still use listing_type/location, add a compatibility mapper rather than assuming columns exist.
- Remove or implement the Vercel property-discovery cron. A scheduled 404 should not remain in production.
- Add Playwright (or equivalent) smoke tests for property submit → email-token handler logic (mock email) → pending review → approve → public view → manage edit → reapprove; add claim flow tests.
- Export current Supabase schema and commit migrations. Add generated DB types and typed repository functions.
- Design and migrate Property v2 tables/entities additively. Build a legacy_housing_adapter/view or migration map; preserve IDs/SEO redirects.
- Add Supabase Storage buckets/policies for listing images and private documents; implement image upload constraints, moderation and responsive delivery.
- Implement structured Ethiopia location and property taxonomy; add facets and canonical slugs.
- Build shared Lead service and replace counter-only enquiry capture for new Property CTAs; maintain aggregate counters for reporting.
- Rebuild Property index/detail/post against Property v2 behind feature flag; preserve brand/design but introduce rich property cards, galleries, pricing, sale/rent filters and cross-pillar CTAs.
- Add 10-pillar Property ecosystem landing architecture and progressively connect Jobs, BirrBank, provider directory and supplier functions rather than duplicating them.
- Add accounts/organisations/provider profiles after the Property v2 core is stable; migrate legacy manage-token owners by claim/link flow.
- Activate repair, management, finance/insurance leads, supplies and staffing in priority order using the stage gates in this report.

