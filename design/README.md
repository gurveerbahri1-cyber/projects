# Design Prototypes

These are standalone React component wireframes that define the intended UX for
two key user flows. They use TailwindCSS classes and `lucide-react` icons.

**These are design references, not production code.** They show the interaction
design that the vanilla JS frontend in `app/public/` should eventually match.

## Files

### `guest-checkout-report.jsx`
The **host-side review flow** — what a host sees when rating a guest after checkout.
- 7-step wizard: Intro → 5 category ratings → Review summary → "Report filed" confirmation
- Stamp-style rating buttons (1-5) with rotation animations
- Optional notes and photo evidence per category
- Mutual blind reveal messaging

### `guest-stay-record.jsx`
The **guest-side profile view** — what a guest sees on their own reputation page.
- Overall trust score with per-category progress bars
- Stay history list (sealed vs. revealed)
- Detailed score breakdown per stay
- Dispute flow: explanation → evidence → confirmation

## Design Language

Both prototypes use an "ink & paper" aesthetic:
- Dark ink backgrounds (`#14181F`) with warm paper cards (`#F3EDE0`)
- Rubber-stamp rating circles with color coding (red → green)
- Typography: IBM Plex Sans (body), Roboto Slab (headings), IBM Plex Mono (labels)
- Subtle slide-in animations with `prefers-reduced-motion` respect
