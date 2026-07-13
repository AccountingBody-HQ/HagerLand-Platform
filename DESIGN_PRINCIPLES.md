# HagerLand Design Principles

## Non-negotiable rules for every page

1. **Paired buttons match width.** Whenever two buttons sit opposite or adjacent to each other (e.g. "Explore the directory" / "List your business"), they must be equal width regardless of text length. Use `flex-1` on both within a shared flex container.

2. **Mobile-first, centered by default.** Design every screen for mobile first, then enhance for desktop — not the reverse. On mobile: content is centered (`text-center`, `mx-auto`). On desktop (`sm:`/`md:` breakpoints): can shift to left-aligned where appropriate. Most users will be on mobile devices, not desktop.

## Brand identity

- **Primary color:** Green (`#1C7C4C`) — trust, action, buttons, links
- **Secondary accent:** Gold (`#B8862E`) — used sparingly, specifically for "Verified" badges and similar meaningful highlights. Never used as a primary color.
- **Logo:** Location pin mark in a green circle
- **Typography:** Inter (body and display), IBM Plex Mono (small labels/data)

## Naming

- Platform is branded "Ethiopian" — not merged with "Eritrean" or generic "Habesha" framing at the platform-name level (decided deliberately, see conversation history).

## Visual direction — resolved (July 2026)

Two directions were compared: the current light, Nextdoor-inspired style (green/gold, approachable, community-first) versus a darker AccountingBody-style alternative (navy, gold-gradient headlines, stats bar, numbered trust cards).

Decision: staying with the current light direction. Reasoning — HagerLand is a community hub first (Jobs, Housing, Events, Community), not a premium B2B services platform like AccountingBody, and the lighter, warmer style fits that identity better. Future polish should refine this direction, not pivot away from it.
