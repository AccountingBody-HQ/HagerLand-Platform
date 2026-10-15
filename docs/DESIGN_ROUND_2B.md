# Design round 2b: refine Round 1 (subtraction and refinement only)

**Branch:** `polish/round-2b` (from `main` at `1f97a41`). Round 2 ("drawn, not photographed") was rejected by AB and is kept only as a record on `polish/round-2`.

**The rule for this round:** the live Round 1 look stays: colours, fonts, the navy hero with its grid, the layout order and the Round 1 wording. Quality comes from tidier spacing, alignment and hierarchy, and from taking things away. Nothing is added: no new colours, tokens, fonts, illustrations, patterns, gradients or animations.

## Plan

### Spacing scale (existing Tailwind steps only)
| Use | Phone | 640 px and up |
|---|---|---|
| Between page sections (every homepage section, via the shared `Section`) | 56 px (`py-14`) | 80 px (`py-20`) |
| Hero top / bottom | 48 px | 80 px |
| Section heading → content | 32 px (`mb-8`) | 40 px (`mb-10`) |
| Between groups inside a section | 40 px | 56 px |
| Card padding | 20 px | 24 px |
| Gap between cards | 12 px | 16 px |
| Text → buttons inside a block | 24 px | 24 px |

### Type scale (current fonts: Manrope headings, Inter text)
| Role | Size |
|---|---|
| Page title (hero) | `hl-display` (unchanged) |
| Section heading | `hl-h2` |
| Group / card heading | `hl-h3`; card titles 19 px semibold |
| Body and secondary text | 16 px (`text-body`), muted colour; nothing smaller than 14 px, and 14 px only for captions and labels |
| Eyebrow (hero only) | unchanged |

### Buttons and links (one style per role)
| Role | Style |
|---|---|
| Primary action | `ButtonLink` primary (green), size `lg` in bands, `md` elsewhere |
| Secondary action | `ButtonLink` secondary (outline) |
| Primary on a dark surface | `ButtonLink` gold, with `outline-inverse` beside it |
| Text link (card actions) | green semibold with the small arrow, as in Round 1, everywhere |

### Cards
- Border only (no shadow under resting cards): calmer, fewer layers. The search card keeps its shadow because it floats on the hero.
- One radius per role: cards `rounded-xl`, buttons `rounded-md`, chips full.
- Equal heights within a row; icon, title, text and action on the same lines across a row; the action always sits at the bottom.

### Planned removals (each with its reason)
1. **Hero quick link** ("Request a materials quote"): it repeats the Supplies tab of the search right above it, and it leaves a stray line under the search.
2. **"Our Developments" coming-soon band**: a third dark block on the page and a "Coming soon" beyond Finance and Insurance. Our Developments stays in the menus and footer (marked Soon), and its page is unchanged.
3. **"Grow with HagerLand" (four audience cards)**: the third time the page invites people to list (after "List your property" in the property section and "List your business" in the Professionals band, plus "List with us" in the header).
4. **Decorative icons** on the Living abroad and Professionals bands, on the two property cards and on the trust points: they repeat the heading and add a box inside a box.

## Stage A: what was done

**Plain-English summary for AB.** The homepage looks like the live site: same navy hero, same fonts, colours, sections and wording. It is simply tidier and about a sixth shorter (desktop 5,968 → 4,912 px; phone 10,941 → 8,444 px). Five things that repeated something else or added a box for nothing are gone. Spacing follows one rhythm, the cards are lighter, the buttons follow one rule, and the phone view is as neat as the desktop.

### Refinements
| Where | Change | Why |
|---|---|---|
| Services section | Section spacing moved onto the shared scale (56 / 80 px, previously 64 / 96 px); heading-to-cards and group spacing evened out | One rhythm down the page |
| Service cards | Resting shadow removed (border only; the border turns green on hover); "Coming soon" chip aligned with the icon row; on phones the icon sits level with the title instead of floating mid-card; padding 20 / 24 px | Calmer, aligned, no box-shadow under every card |
| Living abroad and Professionals bands | Decorative icons removed; buttons now the standard ones (green primary + outline on the light band; gold + outline on the dark band); radius matches the cards | One button style per role; no box inside a box |
| Property section (no listings) | Icons removed; "Get alerts for new listings" moved above the buttons so both cards' buttons line up on the same line | Alignment and calm |
| Latest properties (once listings exist) | A tab appears only for a kind that has listings (no empty "For sale" tab when everything listed is for rent) | No empty state behind a tab |
| HagerLand Supply | Category tiles shorter on phones (80 px instead of 112 px) | Four rows of tall boxes made the phone page long |
| Search card | Tabs have tighter padding on phones so "Professionals" is no longer cut off (text stays 16 px) | Mobile polish |
| Trust points | Icons removed, text raised from 14 to 16 px, and moved from a light-green band to white with a hairline above | More readable; two different pale bands no longer sit back to back |
| Footer | "Soon" as quiet text after the name ("· Soon") instead of a pill that wrapped onto its own line; link groups two-up on phones (the footer is about a third shorter on phones) | Tidier, shorter on phones |
| Header | Reviewed at 390, 768 and 1440 px: no change needed | Already consistent |

### Removals
| Removed | Why |
|---|---|
| Hero quick link "Request a materials quote" | Repeated the Supplies tab in the search above it, and left a stray line under the search |
| "Our Developments — coming soon" band | A third dark block and a "Coming soon" beyond Finance and Insurance. Our Developments stays in the menus and the footer (marked Soon), and its own page is unchanged |
| "Grow with HagerLand" (four audience cards) | The third invitation to list on one page, after "List your property" (property section) and "List your business" (Professionals band), plus "List with us" in the header |
| Decorative icons on the two bands, the two property cards and the trust points | Repeated their headings |
| "All professionals" button on "Hire trusted professionals" (the final removal, Chanel's rule) | Repeated "Browse professionals" in the Professionals band just above |

### Wording changes
None. Removed sections take their Round 1 wording with them; nothing was reworded.

### Self-critique (390, 768 and 1440 px)
- After removing the Our Developments band and "Grow with HagerLand", the lower page went from five differently coloured blocks to a simple alternation (white, light, white, light, white, then the footer): calmer. Kept.
- Making the trust points white risked them blending into the footer; a hairline above them keeps the separation. Kept.
- With no shadow, the service cards on white could look faint; the existing border is enough at all three widths, and turning green on hover keeps them clearly clickable. Kept.
- A first pass centred the service icons vertically on phones (they floated mid-card): undone, so they now align with the titles.
- Nothing was found that made the page busier, so nothing else was undone.

Screenshots: `docs/polish-audit/round-2b/stage-a/` has before (live today) and after at 390 and 1440 px, plus side-by-side images (before on the left, after on the right).

### Verification (Stage A)
| Check | Result |
|---|---|
| Lint, typecheck | No warnings or errors |
| Clean production build | Succeeds with no warnings. Homepage first load 139 kB (was 143 kB); shared JavaScript 103 kB (unchanged) |
| Unit tests | 230 passed (36 files) |
| Browser tests, full run (local copy) | 482 passed, 0 failed, 133 skipped by design (one screen width only), including the Round 1 plain-language test on every public page and a new check that the homepage shows "Coming soon" only for Finance and Insurance |
| 390 / 768 / 1440 px | No sideways scroll and nothing cut off at the edge (checked element by element) |
