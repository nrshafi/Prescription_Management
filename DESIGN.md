---
name: PrescriptX
description: A calm, offline desktop instrument for single-doctor prescription management.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.145 0 0)"
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.97 0 0)"
  secondary-foreground: "oklch(0.205 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  accent-foreground: "oklch(0.205 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  dark-background: "oklch(0.145 0 0)"
  dark-foreground: "oklch(0.985 0 0)"
  dark-card: "oklch(0.205 0 0)"
  dark-muted-foreground: "oklch(0.708 0 0)"
typography:
  display:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
rounded:
  sm: "0.225rem"
  md: "0.425rem"
  lg: "0.625rem"
  xl: "0.825rem"
spacing:
  xs: "0.5rem"
  sm: "1rem"
  md: "1.5rem"
  lg: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0.25rem 0.75rem"
---

# Design System: PrescriptX

## 1. Overview

**Creative North Star: "The Clinical Instrument"**

PrescriptX looks and behaves like a precise, well-calibrated medical instrument
sitting on the doctor's desk: neutral, quiet, and utterly legible. It is achromatic
by deliberate choice — a pure grayscale system where the only color that ever
appears is red, and only to signal danger. Nothing competes for attention with the
patient in the room. The interface is the steady backdrop against which the doctor's
work happens, never the subject.

The system is calm and dense in the right places: an app shell with a fixed sidebar,
flat surfaces separated by hairline borders, and barely-there shadows that suggest
structure without decoration. It reads as a **native desktop application**, not a
web page — no marketing chrome, no hero treatments, no gradient cards begging to be
screenshotted. Restraint is the entire point. Where the SaaS-dashboard instinct
would add a tinted accent, a glassy card, or an animated stat, this system says
nothing instead.

It explicitly rejects four things, carried forward from the product's anti-references:
the cluttered gray walls of a **bloated hospital EHR/EMR**; the hero-metric-and-
gradient template of a **generic SaaS dashboard**; the gamified, emoji-laden styling
of a **consumer health app**; and any **web-app convention that forgets this is a
desktop tool**. When in doubt, the system removes rather than adds.

**Key Characteristics:**
- Achromatic neutral palette; red reserved strictly for destructive/danger.
- Borders-first depth: 1px hairlines and tonal layering, whisper-soft shadows.
- Calm app-shell density — fixed sidebar, flat working surfaces, glance-and-go.
- Light and dark modes both first-class, for varied clinic lighting.
- Legibility and keyboard operability over decoration, every time.

## 2. Colors

A fully achromatic (chroma 0) neutral ramp from pure white to near-black, with a
single saturated red as the only chromatic value in the system.

### Primary
- **Ink** (`oklch(0.205 0 0)` light / `oklch(0.922 0 0)` dark): The near-black
  primary. Carries the brand mark tile, primary buttons, and the strongest text
  emphasis. In dark mode it inverts to a near-white so primary actions stay the
  highest-contrast element on the surface.

### Neutral
- **Paper** (`oklch(1 0 0)`): Pure white background and card surface in light mode.
  The default working canvas.
- **Slate Foreground** (`oklch(0.145 0 0)`): Near-black body and heading text. The
  default ink for all reading.
- **Surface** (`oklch(0.97 0 0)`): The muted/secondary/accent fill — sidebar active
  state, stat-icon chips, subtle zebra surfaces. One step off the background.
- **Muted Ink** (`oklch(0.556 0 0)` light / `oklch(0.708 0 0)` dark): Secondary text
  — labels, hints, timestamps, placeholder. Used for the supporting layer only;
  never for primary reading content.
- **Hairline** (`oklch(0.922 0 0)` light / `oklch(1 0 0 / 10%)` dark): The 1px
  border and divider color that does the structural work shadows would do elsewhere.
- **Dark Canvas** (`oklch(0.145 0 0)` bg / `oklch(0.205 0 0)` card): The dark-mode
  background and elevated card surfaces.

### Functional
- **Danger Red** (`oklch(0.577 0.245 27.325)` light / `oklch(0.704 0.191 22.216)`
  dark): Destructive actions (delete patient/prescription), validation errors, and
  invalid-field states only. This is the system's only chromatic color.

### Named Rules
**The Achromatic Rule.** Every surface, text, border, and fill is chroma 0. The only
permitted chromatic value in the entire system is Danger Red, and it appears only on
destructive actions and error states. A brand accent is not in the system today; if
one is ever introduced, it enters through one deliberate token, never by tinting
neutrals "to add warmth."

**The Red-Means-Danger Rule.** Red is never decorative, never an accent, never a
brand flourish. If something is red, it is dangerous or invalid. Full stop.

## 3. Typography

**Display / Body / Label Font:** System UI stack (`system-ui, -apple-system, 'Segoe
UI', Roboto, sans-serif`) — a single family in multiple weights.

**Character:** One native system sans across the whole interface. No custom webfont
is loaded; the app borrows the operating system's own UI font so it feels native to
the machine it runs on and renders instantly offline. Hierarchy is built from weight
and size alone, never from a second typeface.

### Hierarchy
- **Display** (700, 1.5rem / 24px, line-height 1.1): The largest type — dashboard
  welcome name, page-level identity. Used sparingly; this is as loud as the system
  gets.
- **Headline** (600, 1.125rem / 18px): Section and panel headings within a page.
- **Title** (600, 1rem / 16px): Card titles, dialog titles, list-row primary text.
- **Body** (400, 0.875rem / 14px, line-height 1.5): The default reading size for all
  content, form fields, and table cells. Inputs render at 16px on small/touch
  contexts to prevent zoom, settling to 14px otherwise.
- **Label** (500, 0.75rem / 12px): Field labels, hints, timestamps, stat captions,
  muted metadata.

### Named Rules
**The One-Family Rule.** The system uses exactly one typeface — the OS UI stack.
Hierarchy comes from weight (400/500/600/700) and size, never from pairing a second
font. Do not introduce a display serif, a mono, or a second sans.

**The Quiet-Ceiling Rule.** The largest type in the app is 24px/700. This is a
working tool, not a landing page; nothing shouts. No clamp() display scales, no hero
type.

## 4. Elevation

Depth is **borders-first**. Structure and separation come almost entirely from 1px
hairline borders (`Hairline` token) and one-step tonal layering (`Surface` on
`Paper`), not from shadows. Shadows exist but are deliberately near-invisible: a
whisper `shadow-xs` on buttons and inputs, a barely-there `shadow-sm` on cards. They
hint that an element is a discrete surface; they never lift it dramatically off the
page or read as decoration. The result is flat, calm, and native-desktop in feel.

### Shadow Vocabulary
- **Whisper** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)` — Tailwind `shadow-xs`):
  Buttons, inputs, and small interactive controls. Just enough to seat the control.
- **Soft** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`
  — Tailwind `shadow-sm`): Cards and primary content panels. The ceiling of the
  system's elevation.

### Named Rules
**The Borders-First Rule.** When you need to separate two surfaces, reach for a 1px
border or a one-step tonal shift before you reach for a shadow. Shadows are a whisper,
not a lift; nothing in this system floats.

## 5. Components

### Buttons
- **Shape:** Gently rounded (0.425rem / ~7px, `rounded-md`). Small buttons keep the
  same radius.
- **Sizes:** Default 36px tall (`h-9`, padding 0.5rem 1rem); small 32px; large 40px;
  icon 36px square.
- **Primary (Ink):** Solid `Ink` background with `Paper` text and a Whisper shadow.
  Hover darkens to 90% opacity. The default call to action.
- **Outline:** Transparent on `Paper` background with a 1px `Hairline` border; hover
  fills with `Surface`. The quiet secondary action.
- **Ghost:** No background or border at rest; hover fills with `Surface`. For
  low-emphasis and in-toolbar actions.
- **Destructive:** Solid `Danger Red` with white text; hover darkens to 90%. Delete
  and other irreversible actions only.
- **Link:** `Ink`-colored text, underline on hover. For inline "View all"-style
  navigation.
- **Focus:** A 3px `ring` halo (`focus-visible:ring-ring/50`) plus border shift.
  Always visible; this is a keyboard-first tool.

### Cards / Containers
- **Corner Style:** Generously rounded for containers (0.825rem / ~13px,
  `rounded-xl`); panels assembled in markup often use `rounded-xl` to match.
- **Background:** `Card` / `Paper` (white light, `oklch(0.205)` dark).
- **Shadow Strategy:** Soft (`shadow-sm`) — see Elevation. Never heavier.
- **Border:** 1px `Hairline`. The border, not the shadow, defines the card edge.
- **Internal Padding:** 1.5rem (24px) default; tighter (1rem–1.25rem) on dense list
  rows and table cells.

### Inputs / Fields
- **Style:** Transparent background, 1px `input` border (`oklch(0.922)`), `rounded-md`,
  36px tall, Whisper shadow.
- **Focus:** Border shifts to `ring` and a 3px `ring/50` halo appears. No glow, no
  color flood.
- **Error:** `aria-invalid` paints the border `Danger Red` and the focus ring
  `destructive/20`. Placeholder uses `Muted Ink` — and must still clear contrast for
  long reading.
- **Disabled:** 50% opacity, no pointer events.

### Navigation
- **Style:** Fixed left sidebar, `Card` background, 1px right border. Collapses
  between 56px (icon-only) and 224px (icon + label) with a 200ms width transition.
- **Items:** `rounded-lg` rows, 14px label. Default state is `Muted Ink`; hover fills
  `accent/50` and lifts text to `foreground`; active fills solid `accent` with
  `foreground` text and medium weight. The brand tile (stethoscope on `Ink`) sits at
  the top; collapse control at the bottom.
- **Active signal:** Filled `Surface` background + full-strength ink + medium weight.
  No colored bar, no left stripe.

### List Rows (signature)
- Dashboard "Recent Prescriptions" and visit lists use `divide-y` hairline-separated
  rows: a circular `Surface` monogram avatar, a two-line title/subtitle stack
  (`Title` over `Muted Ink`), and a right-aligned `Label` timestamp. The pattern of
  choice over cards for repeating records.

## 6. Do's and Don'ts

### Do:
- **Do** keep the palette achromatic (chroma 0). Build hierarchy with the neutral
  ramp — `Paper`, `Surface`, `Muted Ink`, `Ink` — not with color.
- **Do** reserve red strictly for destructive actions and error/invalid states.
- **Do** define surfaces with 1px `Hairline` borders and one-step tonal shifts first;
  treat shadows as a whisper (`shadow-xs` / `shadow-sm`), never a lift.
- **Do** keep one typeface (the OS UI stack) and build hierarchy from weight and size.
- **Do** keep a visible 3px focus ring on every interactive control; this tool is
  operated by keyboard during consults.
- **Do** honor `prefers-reduced-motion` — every transition (e.g. the 200ms sidebar
  collapse) needs an instant/crossfade alternative.
- **Do** keep `Muted Ink` for the supporting layer only, and verify its contrast
  against `Paper` for any text the doctor actually reads.

### Don't:
- **Don't** introduce a brand accent, gradient, or tinted neutral. No "warm" or
  "cool" tinting of the grays. If a brand color is ever added, it comes through one
  deliberate token — not by hand-tinting surfaces.
- **Don't** build the cluttered, dense **hospital EHR/EMR** wall of gray fields.
  Density serves the task; it is not the look.
- **Don't** reach for the **generic SaaS dashboard** template: big-number hero
  metrics with gradient accent cards, glassmorphism, or animated stats.
- **Don't** add **consumer-health-app** styling — emoji, mascots, gamification,
  playful or hand-drawn illustration.
- **Don't** use **web-app conventions that forget this is a desktop tool** (browser-
  tab chrome, link-to-page mental models where a native interaction belongs).
- **Don't** use a colored left/right border stripe as an accent on cards, rows, or
  alerts; use full hairline borders or a `Surface` tint.
- **Don't** exceed 24px/700 for any display type; this is an instrument, not a hero
  page.
- **Don't** pile shadow on top of border as decoration. Pick the border; keep the
  shadow a whisper.
