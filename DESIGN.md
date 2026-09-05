# Munim — Design Rules

Binding rules for every Munim screen. Tokens live in `app/munim-theme.css`, imported
verbatim from the Claude Design project (`6b9dc3ec`, `munim-theme.css`) which is the
upstream source of the values; this file says how to use them. If a value is not listed here, it does not go in the design.

See §9 for how these rules are enforced in code.

---

## 1. Colour palette

### Navy scale (the only brand hues)

| Token | Light | Use |
|---|---|---|
| `--navy-900` | `#0A1931` | Primary text, dark panels, bar-1 |
| `--navy-700` | `#1A3D63` | Accent, tile backgrounds, buttons |
| `--navy-500` | `#4A7FA7` | Muted text, secondary bars |
| `--navy-200` | `#B3CFE5` | Tertiary bars, on-dark accents |
| `--navy-050` | `#F6FAFD` | Inverted ink, tinted surfaces |

### Warm sand (the only non-navy hue)

It has no primitive of its own — it exists only as the step-up verdict, written in
oklch so light and dark share a chroma:

| Token | Light | Dark |
|---|---|---|
| `--step` | `oklch(0.56 0.09 68)` | `oklch(0.78 0.09 68)` |
| `--step-tint` | `oklch(0.95 0.03 68)` | `oklch(0.34 0.045 68)` |

It exists only so step-up reads as warm without becoming amber. It is never a
surface, never a bar, never text outside a verdict.

### Role tokens — always use these, never raw hex in markup

- Surfaces: `--color-bg` (page), `--panel` (card), `--panel-2` (nested block inside a card), `--faint`
- Text: `--color-text` (primary), `--muted` (secondary/labels), `--ink-invert` (on dark)
- Lines: `--rule` (dividers inside cards), `--color-divider`
- Data: `--bar-1`, `--bar-2`, `--bar-3`, `--track`
- Verdicts: `--allow` / `--allow-tint`, `--step` / `--step-tint`, `--deny` / `--deny-tint`
- Tiles and primary actions: `--tile-bg`, `--tile-fg`

### Strict rules

1. **No new colours.** Every colour in a screen resolves to a token above. No hand-picked hex, no gradients as backgrounds.
2. **Verdicts are never traffic-light.** Allow / step-up / deny read as cool navy, warm sand, deep navy — never green, amber, red. Colour alone never carries meaning; always pair with a word.
3. **Maximum three surface layers** in one composition: page → panel → panel-2. No fourth nesting level.
4. **Dark mode is token-swap only.** Never branch on theme in markup; `.dark` redefines the same role tokens. (`.dark`, not `.theme-dark` — it is what the Tailwind `dark:` variant keys on.)
5. **One dark hero panel per screen at most** (`--navy-900` background). Everything else is `--panel`.
6. Transparency is allowed only over dark panels, as `rgba(246,250,253,…)` or `rgba(179,207,229,…)`.

---

## 2. Typography

**Font:** Outfit, weights 200–600 only. Fallback `system-ui, sans-serif`. No second typeface. No serif, no mono — tabular figures come from `font-variant-numeric: tabular-nums`, not a mono font.

### Scale — pick from this list, nothing between

| Role | Size | Weight | Notes |
|---|---|---|---|
| Display metric | 44px | 300 | `line-height:1`, tabular-nums |
| Page title | 40px | 300 | `letter-spacing:-.01em`, `line-height:1.1` |
| Screen headline | 30px | 300 | `letter-spacing:-.01em` |
| Panel headline | 24px | 300 | dark hero panels |
| Section title | 20px | 300 | wordmark, large labels |
| Card title | 17px | 500 | every card header |
| Body | 14px | 300–400 | `line-height:1.6` for paragraphs |
| Body strong / row value | 14px | 500 | |
| Dense body | 13.5px | 400 | list rows, steps |
| Meta / caption | 12.5–13px | 400 | `--muted` |
| Eyebrow | 11–12px | 500 | uppercase, `letter-spacing:.12em`, `--muted` |
| Table header | 11px | 500 | uppercase, `letter-spacing:.08em`, `--muted` |

### Strict rules

1. **Weight discipline:** 300 for anything ≥20px, 400–500 for anything ≤17px. Never bold (600+) in body copy; emphasis is `font-weight:500`.
2. **Negative tracking only above 20px** (`-.01em`). Positive tracking only on uppercase eyebrows.
3. Paragraphs: `line-height:1.6`, `max-width` 470–660px, `text-wrap:pretty`. Never full-bleed text.
4. Headlines are sentence case. Eyebrows and table headers are lowercase text rendered uppercase via `text-transform`.
5. Numbers that can be compared vertically get `font-variant-numeric: tabular-nums`.
6. No italics. No underlines except on real links.

---

## 3. Border radius

Use tokens only:

| Token | Value | Applies to |
|---|---|---|
| `--r-xl` | 32px | Top-level cards and panels |
| `--r-lg` | 24px | Blocks nested inside a card |
| `--r-md` | 18px | List rows, chips, small tiles, icon squares |
| `--r-sm` | 12px | Inline badges, tiny swatches |
| `--r-pill` | 999px | All buttons, toggles, status pills, progress steps |

Rules: **every button is a pill.** Radius never increases as you nest — a child's radius is always smaller than its parent's. Bar-chart segments use a literal `4px`; circles use `50%`. No other radius values.

---

## 4. Spacing and gaps

### Between divs

| Context | Gap |
|---|---|
| Between top-level panels and cards (all directions) | **6px** |
| Between columns of a screen's main grid | **6px** |
| Between rows within a card (lists, stacked blocks) | 8–12px |
| Between inline items in a row (icon + label, chips) | 6–14px |
| Between a card's section divider and content | 22px padding-top, `1px solid var(--rule)` |
| Between screens in a canvas | 14px inside a screen block, larger only between screens |

### Padding

- Large card: `28px`
- Standard card: `22–24px`
- Header bar: `16px 24px`
- Nested `--panel-2` block: `13–18px`
- List row: `13px 16px`
- Pill button: `9px 18px`; full-width button height `44px`

### Strict rules

1. **6px is the panel gap. It is not negotiable** — do not use 8, 12, 16 or 20 between cards.
2. All sibling groups use `display:flex`/`grid` + `gap`. Never margins between siblings, never whitespace-as-spacing.
3. Vertical rhythm inside a card uses `margin-top` in steps of 8 / 10 / 14 / 16 / 18 / 22 / 24 only.
4. Grid columns in a screen must align across rows. If the tile row is `repeat(4,1fr)`, the row below uses the same 4-column grid with `grid-column:span n` — never a differently-defined column set.
5. Minimum interactive target: 44px in mobile mockups, 36px on desktop.

---

## 5. Elevation and lines

- One shadow only: `--shadow-card`, applied via the `shadow-card` utility. Top-level panels only — never nested blocks, rows, or buttons.
  Light: `0 1px 2px rgba(10,25,49,.04), 0 8px 24px -6px rgba(10,25,49,.08)`. Dark trades the navy tint for black at higher opacity.
- Dividers are `1px solid var(--rule)`. Borders on containers are not used — separation comes from surface colour, not outlines.
- The only stroked element is an inactive step circle: `1.5px solid var(--rule)`.

---

## 6. Component rules

**Cards** — `--panel`, `--r-xl`, `--shadow-card`, header at 17px/500, optional right-aligned 12.5px `--muted` meta on the same baseline.

**Buttons** — pill, no border, `font-family:inherit`. Primary: `--tile-bg` fill, `--tile-fg` text. Secondary: `--panel-2` fill, `--color-text`. On dark panels: `--navy-200` fill, `--navy-900` text. One primary action per card.

**Rows** — `--panel-2`, `--r-md`, `13px 16px`, grid columns shared with the header row above, `--muted` metadata pushed right with `margin-left:auto`.

**Status** — six-bar meter using `--bar-1/2/3` at `10×18px`, `4px` radius, `3px` gap. Always accompanied by a text tier label at 13px/500. Built as `BarMeter` in `components/dashboard/parts.tsx`, alongside `Panel`, `Row`, `StatTile`, `VerdictPill` and `ProductThumb`. Pass `detail` to stack the tier over its reason.

**Steppers** — active step is a filled pill (`--tile-bg`), inactive is `--panel-2` with `--muted` text, joined by a `40×2px` `--rule` bar.

---

## 7. Layout

- Merchant screens are desktop-first at 1440. Buyer screens are mobile frames.
- Main content grid: content column + fixed rail (typically `1fr 380px`), 6px gap.
- Every screen block carries `data-screen-label`.
- Content is left-aligned. Centred text only in empty states.
- No decorative illustration, no emoji. Meaning comes from type, tone and the bar meter.
- **Product images are content, not illustration.** A recovered `image_url` may render as a
  thumbnail beside its row: it is one of the six fields the meter counts, so the picture (or
  its absence) *is* the data. This does not license decorative imagery anywhere else.
- **Icons: navigation only.** Lucide icons are allowed in the sidebar rail and as inline
  affordances (a search glyph, an arrow on a link). They are never the only carrier of
  meaning — every icon sits beside its own label — and they never appear as decoration
  inside a card. Everywhere else this rule was "no icon sets", and still is.

---

## 8. Prohibited

Gradient backgrounds · emoji · decorative icons (see §7 for the navigation carve-out) · green/amber/red status colours · fonts other than Outfit · shadows on nested elements · radius values outside the token set · gaps other than 6px between panels · outlined cards · centred body copy · placeholder filler content · new colour values of any kind.

---

## 9. How this is enforced

| Concern | Where |
|---|---|
| Tokens (scale, roles, light/dark swap) | `app/munim-theme.css` |
| Type scale, radius scale, panel gap, `shadow-card` | `@theme` / `@utility` in `app/munim-theme.css` |
| Mapping onto shadcn's semantic names | `app/globals.css` |
| Typeface | `app/layout.tsx` — Outfit only, one variable font |
| Light/dark switch | `.dark` on `<html>`: the no-flash script in `app/layout.tsx` sets it before paint, `components/theme-toggle.tsx` flips it. No `next-themes`. |
| §6 cards, rows, tiles, verdict pills, bar meter | `components/dashboard/parts.tsx` |
| §10 curves, durations, the three keyframes | `app/munim-theme.css` |
| §10 reduced motion | `app/globals.css`, unlayered so its `!important` wins |

Every rule above that a tool can enforce is a token or a utility, so the way to
follow this document is to use the generated classes rather than to re-read it:
`text-card-title`, `bg-panel-2`, `text-muted-ink`, `rounded-md`, `gap-panel`,
`shadow-card`. There are no arbitrary values to write.

Radii are clamped: `rounded-2xl`, `rounded-3xl` and `rounded-4xl` all resolve to
the 32px ceiling, so an off-scale radius cannot re-enter through an existing
shadcn class.

### Three reconciliations worth knowing

1. **`--muted` means text here, but a surface in shadcn.** This file wins.
   `--muted` is secondary text; the shadcn surface is wired to `--panel-2` in
   `globals.css`. Use `text-muted-ink` for the text role and `bg-muted` for the
   surface.
2. **`--destructive` maps to `--deny`.** §8 prohibits red, so destructive intent
   is deep navy and, per §1 rule 2, must always carry a word alongside it.
3. **`--color-accent` is not imported under that name.** The design project uses it
   for link ink; Tailwind's `accent` is a hover *surface* that shadcn menus rely on.
   The link colour is `--accent-ink` here (`text-accent-ink`).
4. **Buttons.** §6 makes every button a pill, so `components/ui/button.tsx`
   defaults to `rounded-full`. That, the `TooltipProvider` in `sidebar.tsx`, that
   file's `floating` panel taking `shadow-card` with no ring (§5), and its four
   `ease-linear`s becoming `ease-out-quart` (§10) are the only edits inside
   `components/ui/` — everything else inherits the design through the token bridge,
   which is why re-running `shadcn add` costs almost nothing.

### Not built yet

The §6 stepper is described but has no component. Build it when a screen needs one, not
before. (The bar meter was in this list until the merchant dashboard needed it; it now
lives in `components/dashboard/parts.tsx`.)

---

## 10. Motion

Appended after §9 rather than slotted in beside §5, because the numbers above are cited by
name all over the codebase and renumbering them would silently rewrite thirty comments.

Motion here reports state. It never decorates, never announces a page, and never asks to be
watched — the brand is "trustworthy, precise, in-control", and a dashboard that performs for
its reader is none of those. If an animation would still look right with its meaning removed,
it is decoration and does not go in.

### Curves — two, and nothing between

| Token | Value | Use |
|---|---|---|
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)` | Everything. It is the default. |
| `--ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)` | A control that physically moves. |

No bounce, no elastic, no `ease-in-out`. Nothing eases *in*: every motion in the app is a
result arriving, and a result that starts slowly reads as hesitation.

### Durations

| Length | Use |
|---|---|
| 180ms | The default. Colour, tint, hover, selection, focus — anything that repaints. |
| 260ms | A control whose position changes. Currently only the agent-traffic knob. |
| 500ms | A determinate progress bar catching up to a figure the server just sent. |

180ms is set as Tailwind's `--default-transition-duration`, and `--ease-out-quart` as its
`--default-transition-timing-function`. That is the enforcement: a bare `transition-colors`
anywhere in the app is already on-system, and `duration-*` / `ease-*` appear in markup only
where a control has a reason to differ. Two of those exist. Adding a third needs one.

### The three keyframes

| Utility | What it reports |
|---|---|
| `animate-row-in` | A row that was not on screen a moment ago now is — 260ms, 6px, `both`. |
| `animate-heartbeat` | The gate is armed and traffic is passing. 2.4s, shallow, one state only. |
| `animate-sweep` | Work of unknown length is in progress. Indeterminate bars only. |

`animate-row-in` is applied by row *identity*, never by a `scanning`-style flag: adding an
animation class to elements that are already mounted replays it on every one of them, so a
flag would flash the whole list. Compare against the set of rows present at first paint.
There is no stagger anywhere and none is wanted — rows arrive at the pace the API sends
them, which is a real rhythm, and a synthetic delay on top only makes a fast response feel
slow.

### Strict rules

1. **No page-load choreography.** Screens arrive into a task. Nothing fades in because the
   route changed, and no section reveals on scroll.
2. **Animate `transform`, `opacity` and colour.** `width` is allowed on a progress bar,
   which is what a progress bar is. Never `left`, `top`, `height` or a margin.
3. **One state, not both.** A pulse that runs whether the gate is armed or stopped reports
   nothing. If motion cannot distinguish two states, it is not carrying meaning.
4. **Motion never carries meaning alone**, the same way colour does not (§1 rule 2). Every
   animated state also says its state in a word.
5. **`prefers-reduced-motion` collapses everything to ~0ms**, and every screen must still be
   complete and readable at that setting. Nothing may be hidden behind a transition or an
   unfilled keyframe: `row-in` fills `both` for exactly this reason, and the indeterminate
   sweep hides itself rather than freezing at a width it never measured.
6. **No motion library.** CSS and the tokens above. `tw-animate-css` (already imported) and
   vaul's own drawer transitions cover the overlays; nothing else earns a dependency.
