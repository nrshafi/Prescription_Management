# Plan 01 — Validation Parity (Zod vs Rust `normalize_*`)

**Severity:** Medium · **Source:** `docs/codebase/CONCERNS.md` §1, §2

## Concern

The renderer validates input with Zod schemas in `src/shared/*.ts`, and the Rust
command layer re-validates the same rules server-side via `normalize_*`
functions plus the shared `ensure_max_len` helper. These two sets of limits are
maintained by hand and can drift apart silently, producing inconsistent
client/server behavior (input accepted by one layer, rejected by the other).

Per `README.md`, the limits in `src/shared/*.ts` are the **canonical source**;
the Rust side must mirror them.

## Evidence

- `src/shared/prescription.ts` — Zod `max(...)` limits, e.g.:
  - medicine name `max(160)`, dosage/frequency/duration `max(120)`, notes `max(300)`
  - section content `max(4000)`, preset title `max(160)`, preset content `max(4000)`
  - preset link label `max(160)`
- `src/shared/patient.ts` — patient field limits (name, phone, address, etc.)
- Rust mirror:
  - `src-tauri/src/commands/mod.rs:15` — `ensure_max_len(value, max, label)`
  - `src-tauri/src/commands/patients.rs:118` — `normalize_patient`
  - `src-tauri/src/commands/prescriptions.rs:159` — `normalize_prescription`
  - `src-tauri/src/commands/presets.rs:102` — `normalize_preset`

## Decision context

- Owner: renderer test framework and CI are **not needed now**.
- This plan therefore adds **Rust-side tests only** (the layer that already has a
  test suite) to lock the limits against the canonical Zod values. No runtime
  behavior change.

## Tasks

1. **Catalogue canonical limits.** Read every `.max(N)` in `src/shared/*.ts` and
   build a reference table of `field → limit`. Capture them in this plan file (or
   a short comment) so the source of truth is explicit.
2. **Add a Rust parity test module.** In each command module (`patients.rs`,
   `prescriptions.rs`, `presets.rs`), add `#[cfg(test)]` tests that:
   - Construct an input with a field exactly at the limit → expect `Ok`.
   - Construct the same field at `limit + 1` characters → expect the
     `"... is too long"` error.
   - Use multi-byte characters in at least one case to confirm `chars().count()`
     (not byte length) is the unit, matching Zod's `.max()` semantics.
3. **Add named constants (optional but recommended).** Introduce `const` limits
   in the Rust modules (e.g. `MEDICINE_NAME_MAX: usize = 160`) and reference them
   in both `normalize_*` and the new tests, so the magic numbers appear once.
4. **Document the contract.** Add a short note near the limit constants and in
   `README.md` (Shared contracts section) stating: "If you change a `.max()` in
   `src/shared/*.ts`, update the matching Rust constant and the parity test."

## Affected files

- `src-tauri/src/commands/mod.rs` (helper, possibly shared constants)
- `src-tauri/src/commands/patients.rs`
- `src-tauri/src/commands/prescriptions.rs`
- `src-tauri/src/commands/presets.rs`
- `README.md` (documentation note)

## Verification

```bash
cd src-tauri
cargo test
```

All new parity tests pass; existing tests stay green.

## Risks / notes

- This is a **drift-detection** mechanism, not auto-generation. A future
  improvement could codegen limits from the Zod schemas, but that is out of
  scope here and not requested.
- Keep boundaries inclusive/exclusive consistent with Zod: `.max(N)` accepts
  exactly `N` characters, so the Rust check must reject only `> N` (which
  `ensure_max_len` already does at `mod.rs:16`).
