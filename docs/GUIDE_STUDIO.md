# Guide studio: how to make a guide

Admin → **Guides** → **Guide studio** (`/roodber8/guides/studio`). The site never calls an AI service: you use your own Claude chat, so there are no keys and no costs. Nothing is ever published automatically.

## The five steps

1. **Build the prompt.** In Guide studio choose Topic, Idea or Reference URL and type it (or click one of the 40 ideas at the bottom; ideas marked “Already exists” are close to a guide you already have). Pick the guide topic, main reader, guide type and length, then **Build prompt** → **Copy prompt**.
2. **Paste it into Claude.** Open a new Claude chat, paste, send. Claude replies with JSON only.
3. **Import the JSON.** Click **→ Import guide JSON** (`/roodber8/guides/import`), paste Claude's reply (code fences and any text around it are removed for you) and click **Validate**. Fix anything listed in red; read “Changes made automatically” and the preview. If a guide with the same title exists, tick **Import anyway** only if you really want both. Click **Import as draft**.
4. **Resolve the CHECK notes.** Open the guide. The gold box lists every `[CHECK: …]` note: a fact (fee, office name, law, price, timeframe) Claude was not sure of. Verify each one, correct the text, and delete the note. Until none remain, “Content checked” and publishing are blocked, and a guide with a note is never shown on the site.
5. **Tick “Content checked” and publish.** Read the whole guide once more, tick **Content checked**, set Status to **Published** and save.

## The JSON Claude returns

```json
{
  "title": "at most 100 characters",
  "slug": "lower-case-words-with-hyphens",
  "topic": "property | building | supplies | diaspora | services | buying | renting | selling | checklists | glossary",
  "summary": "at most 200 characters",
  "content": "the guide in HagerLand's plain-text format (\\n for new lines)",
  "faq": [{ "question": "…", "answer": "…" }],
  "seo_title": "at most 60 characters",
  "seo_description": "at most 155 characters",
  "reader": "diaspora | local | landlord | tenant | self-builder | contractor | supplier",
  "guide_type": "how-to | checklist | explainer | cost | questions | glossary",
  "read_time_minutes": 7,
  "check_markers_count": 3
}
```

## How the fields are stored (no database change)

| JSON field | Stored in | Notes |
|---|---|---|
| title | `title` | Same or near-identical title → warning and “Import anyway” tick |
| slug | `slug` | If taken, `-2`, `-3`, … is added. Missing → made from the title |
| topic | `topic` | Must be one of the ten existing values (the label, e.g. “Renting”, is accepted too) |
| summary | `summary` | |
| content | `body` | Guides are stored as plain text: `## ` heading, `- ` bullet, blank line between paragraphs (not HTML or full Markdown). HTML is refused. `###`, numbered lists, `*` bullets and bold are tidied into that format |
| content links | `body` | Kept as `[anchor text](/path)` when the path is on the approved list (see below); every other link becomes its plain words and is listed under “Changes made automatically” |
| faq | `faq` | Shown at the end of the guide and as FAQ data for search engines |
| seo_title, seo_description | `seo_title`, `seo_description` | |
| reader, guide_type, read_time_minutes | not stored | Used only to shape the prompt; there are no columns for them |
| check_markers_count | ignored | The site counts the `[CHECK: …]` notes itself |

Every import is a **draft** with **Needs AB review** set, and is recorded in the audit log as `guide.import` (source “Guide studio import”).

## Links inside guides

Write a link in the guide text as `[anchor text](/path)`, inside a paragraph or a bullet (not a heading), for example `Send [your materials list](/supplies/materials-list) to suppliers.` You can type them yourself in the editor too. A `#section` on the end is allowed (`/jobs#latest`).

The guide page turns it into a green link **only** for these HagerLand pages (the list lives in `lib/guides/studio-options.ts`, and the prompt, the importer and the guide page all use it):

`/buy`, `/rent`, `/property/for-sale`, `/property/to-rent`, `/build`, `/maintain`, `/manage`, `/agency`, `/supplies`, `/supplies/materials-list`, `/professionals`, `/request-service`, `/jobs`, `/diaspora`, `/diaspora/property-care`, `/advice`, `/help`.

Anything else (other websites, government sites, other HagerLand addresses, broken brackets) shows as plain words: never as a link and never with the brackets. Links never appear in the title, summary or questions and answers. To add a page to the list, ask your developer (it must be a real public page).

## Deferred (would need your agreement)

- **A database-level block on CHECK notes** in published guides (a migration). Today the block is in the app: saving, publishing and the public page all refuse them.
