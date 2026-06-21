# Product

## Register

product

## Users

A single practicing physician, working in-clinic and entering prescriptions live
while seeing patients. The app runs offline on the doctor's own machine, so it is
always available regardless of network or hospital IT. During a consultation the
doctor's attention is on the patient, not the screen — the interface is a quick,
glance-and-go instrument used in short bursts between examination and conversation.
The core job to be done: capture a visit (complaint, examination, diagnosis,
medicines, advice, follow-up) and produce a clean printed/PDF prescription on the
doctor's letterhead, with as little friction as possible. Secondary jobs: look up a
patient's prior visits, reuse saved presets and medicines, and manage profile,
paper, and backup settings.

## Product Purpose

PrescriptX is an offline desktop application for single-doctor prescription
management. It exists to replace handwritten prescriptions and bloated clinical
software with one focused, fast, self-contained tool: write a prescription, print
it on letterhead, keep a searchable local history. Success means the doctor can
complete a prescription in seconds without thinking about the software, trusts that
the data is safe and portable (local SQLite, snapshot-safe backup/restore, JSON
export), and never feels the tool slowing them down during a patient visit.

## Brand Personality

Calm, clinical, trustworthy. The voice is precise and unfussy — a professional
instrument, not a product demo. Three words: **composed, exact, dependable.** The
interface should evoke quiet confidence and low cognitive load: it gets out of the
way during a consult and never competes for attention with the patient in the room.
Copy is plain and direct (medical clarity over marketing flourish). Nothing playful,
nothing loud; restraint is the brand.

## Anti-references

- **Bloated hospital EHR/EMR (Epic/Cerner-style).** No cluttered gray walls of
  fields, no overwhelming density, no "every feature on every screen." This is a
  single-doctor tool, not enterprise medical software.
- **Generic SaaS dashboard.** No hero-metric template (big number + gradient card +
  supporting stats), no startup-landing-page styling. It's a working instrument, not
  a pitch.
- **Consumer health/wellness app.** No gamification, emoji, mascots, or playful
  illustration. This is a professional clinical tool.
- **Web app that forgets it's desktop.** It should feel like a native desktop
  application, not a browser tab — no web-chrome conventions, no link-to-a-page
  mental model where a native interaction is expected.

## Design Principles

1. **Out of the way during the consult.** The primary task (writing a prescription)
   must be fast and low-friction. Optimize for the live, in-room moment; minimize
   steps, clicks, and reading required to get a visit captured.
2. **Quiet by default, signal where it counts.** Restraint is the baseline. Reserve
   emphasis (color, weight, motion) for the few things that actually need it —
   destructive actions, validation, the active task — so they read instantly.
3. **Precision and trust over decoration.** This is a medical record. Data must be
   legible, unambiguous, and accurate; every label, state, and number should be
   clear at a glance. Never trade correctness or clarity for flourish.
4. **Native desktop feel.** Behave like a desktop app, not a website — keyboard-
   first operation, predictable density, instant local responsiveness (no spinners
   for local data that's already there).
5. **The data is the doctor's.** Make safety and portability legible: backups,
   restore, and export are first-class, and the user should always feel their
   records are local, safe, and theirs to move.

## Accessibility & Inclusion

- **Readability for long days.** Comfortable type sizes and line lengths for
  extended reading and tired eyes; legible body text is non-negotiable. Maintain
  strong text contrast against backgrounds as a baseline (target WCAG AA: body
  ≥4.5:1, large text ≥3:1) — never light-gray "for elegance" on a clinical record.
- **Keyboard-first navigation.** Full keyboard operability for fast, mouse-light
  data entry during consults: logical tab order, visible focus, and shortcuts for
  the core write-and-print flow.
- **Reduced motion.** Honor `prefers-reduced-motion`; every animation needs a
  crossfade or instant alternative. Motion is never required to understand state.
- **Light and dark modes** are both first-class (already supported) so the tool
  stays comfortable across clinic lighting conditions.
