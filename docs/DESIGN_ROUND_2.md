# Design round 2: "Drawn, not photographed"

> **REJECTED by AB on 15 Oct 2026** ("overcooked and too heavy overall"). Not continued, no Stage B, and this branch (`polish/round-2`) is never merged. It is kept only as a record. The work continues as Round 2b (`polish/round-2b`, `docs/DESIGN_ROUND_2B.md`): the live Round 1 look, refined by subtraction only.

**Branch:** `polish/round-2` (from `main` at `1f97a41`). **Stage A:** design system, header, homepage, footer. **Stage B** (after AB types APPROVE DESIGN): every other public page.

## 1. The idea in one paragraph

HagerLand's signature is the architect's drawing: fine gold lines on deep green, like a drawing on a builder's blueprint table. The drawings show elevations, floor plans and sections: the things people commission, buy, build and look after. They are original, drawn for HagerLand, and never a copy of a real building. That is the one bold element. Everything around it is quiet: generous space, confident type, few boxes. Later, photographs can replace any drawing without a redesign, because every drawing sits in a slot that also accepts a photo.

## 2. Palette (6 core tokens)

| Token | Hex | Role |
|---|---|---|
| `forest` | `#0D3A24` | The brand surface: hero, feature bands, footer. Brand green #1C7C4C (hue 150°), darkened to 14% lightness, so it reads as the same family, not a new colour. |
| `green` | `#1C7C4C` | Brand green, unchanged: buttons, links, small accents on light surfaces. |
| `gold` | `#B8862E` | Brand gold, unchanged: line drawings, rules, large display moments only. |
| `gold-pale` | `#E3C78F` | Gold for small text and fine lines on forest (passes AA, see contrast). |
| `mist` | `#F2F6F4` | The one alternate light surface: cool, very light green-grey. Replaces warm cream (stone) as a section background. |
| `ink` | `#16201B` | Near-neutral dark (a whisper of green) for body text. Replaces navy #152238 everywhere, so navy is retired as a colour. |

Supporting values: `muted` text moves from blue-grey to green-grey `#5A655F`; shadows lose their navy tint.

**Contrast (WCAG AA: 4.5:1 small text, 3:1 large text and graphics)**

| Pair | Ratio | Use |
|---|---|---|
| White on forest | 12.8 : 1 | All text on forest |
| White 80% on forest | ≈ 9 : 1 | Body text on forest |
| Gold-pale on forest | 7.8 : 1 | Small labels and fine lines on forest |
| Gold on forest | 3.9 : 1 | Drawings and large display only (never small text) |
| Gold on white | 3.2 : 1 | Rules and drawings only; small gold text on white uses `gold-dark` |
| Ink on white / on mist | 16.7 / 15.3 : 1 | Body text |
| Muted on white / on mist | 6.1 / 5.6 : 1 | Secondary text |
| Green on white | 5.2 : 1 | Links and buttons |
| Gold-dark on white | 6.1 : 1 | "Coming soon", the HagerLand Supply label, step numbers |

## 3. Type

| Role | Family | Why |
|---|---|---|
| Display (page and section headings, large numbers) | **Newsreader** (variable serif with optical sizes, 400–600) | A calm, authoritative serif gives the "serious, established" feel that the current rounded grotesk (Manrope) cannot. At large sizes its optical size tightens like a book title; it is not a fashion serif. |
| Text and interface | **Inter** (unchanged) | Already loaded and excellent for forms, numbers and small text. |
| Amharic | **Noto Sans Ethiopic** (unchanged) | In every font stack as the fallback, so Amharic renders well when switched on. |

All self-hosted through `next/font` with `display: optional` (no layout shift: if the font is late, the fallback stays for that page view).

**Scale (rem, mobile → desktop):** display 2.5 → 4.5 (serif, 400, tight leading 1.05) · h2 1.875 → 3 (serif 400) · h3 1.375 → 1.75 (serif 500) · lead 1.125 → 1.25 (sans 400) · body 1 (sans 400, 1.65) · small 0.875. Headings in serif regular, not bold: confidence comes from size and space, not weight. Line length stays under about 70 characters (`max-w-[34rem]`–`[42rem]` for text).

**Template tells removed:** no tracked-out ALL-CAPS eyebrows (labels become sentence case in the serif, or disappear), no highlighted word inside a headline, no arrow after every link (arrows only on the one primary action per block).

## 4. Homepage layout

```
┌──────────────────────────── header (white, hairline) ────────────────────────────┐
│ ◉ HagerLand        All services · Living abroad?   ⌕   Sign in   [List with us]   │
│ Buy  Rent  Build  Maintain  Manage  Supplies  More                                 │
├───────────────────────────────── HERO (forest) ──────────────────────────────────┤
│ Ethiopia's property and construction platform      ╱╲   ▯▯▯  ▯▯                     │
│                                                   ╱  ╲  ▯▯▯  ▯▯ ┃crane              │
│ One platform for property,                       ▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯ (gold elevation,   │
│ construction and everything                       ───────────── draws itself once)  │
│ around it.                (serif, 4.5rem)                                            │
│ Buy, rent, build and manage property …   (lead)                                      │
│ [ Buy | Rent | Supplies | Professionals ]  search card                               │
├─◆◇◆◇◆◇◆◇ tibeb band (gold on forest, once) ◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆◇◆─┤
│ Everything your property needs   (serif h2 + one line)                     (white)  │
│                                                                                     │
│ [floor-plan drawing]   Buy, sell and rent                                  (white)  │
│                        Buy & Sell Property — benefit — Buy or sell                  │
│                        Rent & Let Property — benefit — Rent or let                  │
│                                                                                     │
│ Build and improve       [section drawing: building under construction]     (mist)   │
│ Build & Develop — …     Repair & Maintain — …                                       │
│                                                                                     │
│ [elevation drawing]    Property Care (Manage Property) — benefit — action  (white)  │
│─────────────────────────────────────────────────────────────────────────────────────│
│ Also from HagerLand        (typographic index, hairlines, no cards)                 │
│ Building & Construction Supplies   benefit …                   Get a quote          │
│ Jobs, Recruitment & Staffing       benefit …                   Browse jobs          │
│ Knowledge & Advice                 benefit …                   Get advice           │
│ Property Finance  · Coming soon    benefit …                   Register interest    │
│ Property Insurance · Coming soon   benefit …                   Register interest    │
├──────────────────────── LIVING ABROAD (forest, full width) ───────────────────────┤
│ [globe + route drawing]   Living abroad? We act as your hands on the ground …       │
├──────────────────────────────── property (mist) ───────────────────────────────────┤
│ Property in Ethiopia: Looking to buy or rent? │ Selling or letting?  (rule, no box) │
├──────────────────────────────── HagerLand Supply (white) ─────────────────────────┤
├──────────────────────── PROFESSIONALS (white, gold rules) ─────────────────────────┤
│ Are you a professional or supplier? …   Find: Architects · Contractors · …          │
├──────────────────────────────── standards (mist) ──────────────────────────────────┤
├──────────── footer (forest, tibeb band at the top edge) ───────────────────────────┤
```

Phones: one column; the hero drawing sits as a wide strip under the search; feature drawings sit above their text at a fixed aspect ratio; the index becomes stacked rows.

## 5. Principles

1. **One bold element.** Gold line drawings on forest. Nothing else competes: no gradients, no glassmorphism, no illustrations of people.
2. **Hierarchy over boxes.** The three main service groups get space and a drawing; the rest is an index. Cards only where something is a self-contained object (a listing, a company).
3. **Serif for voice, sans for work.** Headings speak; forms and numbers stay in Inter.
4. **Radius by role.** Large feature visuals 4px (drawing-board crisp), interactive cards 12px, buttons 8px, pills full. Shadows only on things that float (search card, menus).
5. **Earned motion.** The hero drawing draws itself once (about 2.5 s). With reduced motion it simply appears.
6. **Photo-ready.** Every drawing slot accepts a photograph later (section 8).
7. **One Ethiopian touch.** A geometric band inspired by tibeb borders, used twice: under the hero and at the top of the footer.

## 6. Critical review of this plan (and what I changed)

| First idea | Why it was generic | Change |
|---|---|---|
| Keep Manrope bold headings, just bigger | The bold rounded grotesk is the default look of every startup template; it is half of why the site reads "vanilla". | Serif display (Newsreader) in regular weight. |
| Hero: text left, drawing right, everywhere | Text-left/image-right is the stock hero. | Kept the split on desktop (it suits a search-first page), but the drawing bleeds off the right edge and sits on the blueprint grid, so it reads as a drawing on a table, not a picture in a box. On phones it becomes a wide strip, not a squeezed square. |
| Ten service cards, made prettier | Still ten identical boxes. | Three feature groups with drawings, then a typographic index for the other five. |
| A gold "eyebrow" label above every heading | A template tell (tracked capitals). | Removed. Sections open directly with the serif heading. |
| Tibeb pattern as a coloured strip in the hero and footer and as section dividers | Repeated use turns heritage into costume. | Gold-on-forest only, thin, twice. |
| Cream backgrounds for warmth | Warm cream plus green and gold is the default "luxury estate agent" palette. | One cool mist green-grey alternate; warmth comes from the gold drawings. |
| Keep "Our Developments — coming soon" band, "Hire trusted professionals" chips, "Grow with HagerLand" four cards, trust points | Five separate sections asking for attention: the page had no end. | Chanel's rule: the Our Developments band leaves the homepage (it stays in the menus and footer, marked "Soon"); professionals chips, audience cards and the invitation merge into one Professionals moment. |

## 7. Stage A: what was built

**Plain-English summary for AB.** The homepage, header and footer now have their own look. A deep HagerLand green replaces the navy. Headings are in an elegant serif. Fine gold architectural drawings, made for HagerLand, take the place photographs will take later. A thin band inspired by tibeb borders marks where the hero ends and where the footer begins. The rest of the page is calmer, with fewer boxes. Three main services get large sections with a drawing each; the other five sit in a simple, elegant list.

**Built**
- **Design tokens** (`app/globals.css`, `tailwind.config.ts`): `forest`, `forest-2`, `mist`, `gold-pale` added; `ink` moved from navy to near-neutral dark; `muted` and shadows lose their blue tint; serif type scale (`serif-display`, `serif-h2`, `serif-h3`, `lead`). `ink` is a shared token, so body text across the whole site is already the new near-neutral dark. Other pages' layouts change in Stage B.
- **Fonts** (`app/layout.tsx`): Newsreader 400/500 added as `--font-serif`, with Noto Sans Ethiopic in the stack. Inter is unchanged. Manrope stays loaded until Stage B moves the other pages' headings to the serif; it is then removed.
- **Drawings** (`components/visuals/Drawings.tsx`): skyline (hero, draws itself once), floor plan, building section, villa with compound wall, globe with a route home, tibeb band. Pure inline SVG with no images and no JavaScript.
- **Photo-ready slot** (`components/visuals/Visual.tsx`, `lib/content/visuals.ts`): see section 8.
- **Homepage** (`components/home/HomeSections.tsx`, `app/(site)/page.tsx`):
  - hero (forest, serif headline, skyline drawing, full-width search, tibeb band);
  - "Everything your property needs": three feature sections (Buy, sell and rent · Build and improve · Property Care) with drawings, alternating white and mist, plus the "Also from HagerLand" index for Supplies, Jobs, Knowledge & Advice, Finance and Insurance;
  - Living abroad (full-width forest band);
  - property (two paths separated by a rule);
  - HagerLand Supply (numbered steps, typographic category list);
  - the Professionals moment;
  - our standards (gold rules);
  - the footer.
- **Header:** calmer menu weight, a fine gold underline on the current section, sentence-case serif group labels in "All services" and the menus, the search tabs in forest. The mobile menu keeps its Round 1 structure.
- **Footer:** forest with the tibeb band, serif headings in pale gold, and "Soon" as quiet text instead of pills.

**Removed (Chanel's rule and "fewer boxes")**
- The hero quick links under the search. The search tabs already cover Buy, Rent, Supplies and Professionals.
- The "Our Developments — coming soon" band. Our Developments stays in the menus and footer, marked Soon.
- The separate "Hire trusted professionals" chip row and the four "Grow with HagerLand" cards, merged into one Professionals moment.
- The icons on the trust points (they were stock icons; gold rules carry them now).
- The second "All professionals" button on the verified professionals list.

**Self-critique, and what changed after the first screenshots**
1. The search card was squeezed beside the drawing (fields cut off) → the search now spans the full width under the headline and drawing.
2. The headline broke into five short lines → wider measure (18 characters per line).
3. On phones the hero content ran off the right edge (the grid widened to fit the search tabs) → an explicit single column; the check now also looks for clipped content, not just page scroll.
4. The last search tab was cut off on phones → tighter tab padding on small screens (text stays at 16 px).
5. Feature drawings were very tall on tablets → 16:9 on tablets, 5:4 on desktops.
6. The "All services" panel still had tracked capitals → serif sentence case.
7. Conditional sections (latest properties, developments, popular locations, verified professionals) still had the old bold headings → serif headings.

**Wording changes (where the new layout needed them)**

| Where | Round 1 | Round 2 | Why |
|---|---|---|---|
| Third feature | "Own and manage" + "Look after what you own, protect it and decide with confidence." (covered Manage, Insurance and Advice) | **Property Care** + "Inspections with photo reports, tenants, rent collection and repairs, handled by one accountable team, whether you live in Addis Ababa or abroad." | The feature now holds Manage Property alone. The text is drawn from the existing Property Care wording. |
| Index heading | (none: four groups of cards) | **Also from HagerLand** | Heads the index of the other five services. |
| Professionals moment, second button | "List your portfolio" (on the "Agents & developers" card) | **Agents & developers** (button) | The card is gone; its title becomes the button so agents still have a door in. |
| Verified professionals list | "Hire trusted professionals" (section title) | **Verified professionals** | "Hire trusted professionals" now heads the trades list in the Professionals moment, so the companies list needed its own name. |
| Hero quick links, Our Developments band, "Grow with HagerLand" cards, trust-point icons | (as Round 1) | Removed | See "Removed" above. |

The menus ("All services" group names) keep their Round 1 wording ("Own and manage" there still groups Manage, Insurance and Advice).

## 8. Adding photographs in Phase 3

Each drawing sits in a **visual slot**. A slot shows its drawing until a photograph is registered for it; then the photograph takes its place, cropped to the same shape, with a fine pale-gold frame line and a soft green shade at the foot so it belongs with the rest of the page. Nothing else changes.

| Slot | Where | Shape | Suggested subject |
|---|---|---|---|
| `hero` | Homepage hero, right side (strip on phones) | 720 × 440 (about 1.6 : 1) | Addis Ababa skyline or a finished HagerLand home at dusk |
| `buy-rent` | "Buy, sell and rent" | 4:3 phones, 16:9 tablets, 5:4 desktops | A bright living room or an apartment exterior |
| `build` | "Build and improve" | same | A building site with a frame and scaffold |
| `care` | "Property Care" | same | A well-kept villa behind its compound gate |
| `abroad` | "Living abroad?" | same | A family video call, or keys handed over at a door |

**How to add one (about 5 minutes per photo, a developer or AB in the Codespace):**
1. Prepare the photo: landscape, at least **1,600 px wide**, JPEG or WebP, under about 600 kB. You must own it or have the right to use it.
2. Save it in **`public/images/visuals/`** with the slot's name, for example `public/images/visuals/hero.jpg`.
3. In **`lib/content/visuals.ts`**, set the slot, for example:
   `hero: { src: '/images/visuals/hero.jpg', alt: 'Apartment buildings in Bole at dusk', focal: '60% 40%' },`
   - `alt` describes the photo for people who cannot see it.
   - `focal` (optional) is the point that must stay in view when the photo is cropped: "x% y%" from the top left.
4. Commit, push, check the preview, release as usual.

To go back to the drawing, set the slot to `null` again.
