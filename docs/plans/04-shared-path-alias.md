# Plan 04 — Add `@shared/*` Path Alias

**Severity:** Low · **Source:** `docs/codebase/CONCERNS.md` §2

## Concern

The renderer imports shared Zod schemas/types using deep relative paths like
`../../../shared/...`, which are fragile to file moves and refactors. There are
~19 such imports across the renderer.

The project already defines `@renderer/*` and `@/*` aliases but **no
`@shared/*`**, so shared imports remain relative.

## Evidence

- `src/renderer/src/lib/api.ts:10,19,25,30` — `from '../../../shared/...'`
- ~19 total `../shared/` imports across `src/renderer/src/**`
- Existing aliases:
  - `tsconfig.json:17-20` → `@renderer/*`, `@/*`
  - `vite.config.ts:9-13` → `@renderer`, `@`

## Tasks

1. **Add the TypeScript alias.** In `tsconfig.json` `compilerOptions.paths`:
   ```jsonc
   "@shared/*": ["./src/shared/*"]
   ```
   (Resolution works under `"moduleResolution": "bundler"` without `baseUrl`,
   consistent with the existing `@renderer/*` entry.)
2. **Add the Vite alias.** In `vite.config.ts` `resolve.alias`:
   ```ts
   '@shared': resolve('src/shared')
   ```
3. **Rewrite imports.** Replace every `../../shared/...` / `../../../shared/...`
   with `@shared/...`. Find them with:
   ```bash
   rg "\.\./.*shared/" src/renderer/src
   ```
   Update each (e.g. `'../../../shared/patient'` → `'@shared/patient'`).
4. **Confirm consistency** with the existing alias style (no trailing slashes in
   the Vite key; `/*` suffix in tsconfig).

## Affected files

- `tsconfig.json`
- `vite.config.ts`
- All renderer files importing from `../shared/...` (~19), notably
  `src/renderer/src/lib/api.ts`

## Verification

```bash
bun run typecheck      # resolves @shared/* types
bun run check          # Biome (incl. import sorting)
bun run build:renderer # Vite resolves @shared at build time
```

## Risks / notes

- Pure import-path change; no runtime behavior change.
- Ensure both tsconfig **and** Vite are updated — TS alone makes types resolve
  but Vite would fail to bundle, and vice versa.
- Biome import sorting (`bun run check`) may reorder the rewritten imports; run
  `bun run format` if needed.
