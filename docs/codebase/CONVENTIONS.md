# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Renderer component files | PascalCase `.tsx` | `NewPrescription.tsx`, `PatientFormDialog.tsx` | `Glob src/renderer/src/**` |
| Renderer lib/util files | camelCase or kebab-case `.ts` | `api.ts`, `prescription-mapping.ts` | `src/renderer/src/lib/` |
| shadcn UI components | lowercase `.tsx` | `button.tsx`, `dialog.tsx` | `src/renderer/src/components/ui/` |
| TS types/interfaces | PascalCase | `PrescriptionDetail`, `MedicineSuggestion` | `src/shared/prescription.ts` |
| TS constants | SCREAMING_SNAKE_CASE arrays | `PRESCRIPTION_SECTION_TYPES`, `PRESET_CATEGORIES` | `src/shared/prescription.ts` |
| Zod schemas | camelCase + `Schema` suffix | `prescriptionFormSchema` | `src/shared/prescription.ts` |
| Rust modules/files | snake_case | `commands/prescriptions.rs` | scan tree |
| Rust commands | `<domain>_<action>` snake_case | `patients_create`, `printing_preview` | `src-tauri/src/lib.rs` |
| Rust structs | PascalCase, serialized camelCase | `PatientRecord` w/ `#[serde(rename_all = "camelCase")]` | `src-tauri/src/commands/patients.rs` |
| SQL tables/columns | snake_case | `prescription_sections`, `patient_code` | `src-tauri/src/migrations.rs` |

### 2) Formatting and Linting

- Formatter: Biome (`biome.json`) — 2-space indent, 100 char line width, single quotes, semicolons as-needed, no trailing commas.
- Linter: Biome (`biome.json`) — recommended rules on; `noUnusedImports`/`noUnusedVariables` = warn; `noExplicitAny` = warn; `noNonNullAssertion` off.
- Import sorting: Biome assist `organizeImports: on` (`biome.json`).
- Biome scope: `includes: ["src/**", "vite.config.ts"]` — `Reference/` and Rust are not Biome-managed.
- Rust: rustfmt defaults; commands return `Result<T, String>` (`AGENTS.md`).
- EditorConfig: 2 spaces, LF, UTF-8 (`.editorconfig`).
- Run commands: `bun run lint`, `bun run format`, `bun run check`, `bun run typecheck`; `cargo fmt`/`cargo check` in `src-tauri/`.

### 3) Import and Module Conventions

- Path aliases `@/*` and `@renderer/*` → `src/renderer/src/*` (`tsconfig.json`, `vite.config.ts`); used in renderer (`import { Header } from '@/components/layout/Header'` in `App.tsx`).
- Shared types imported via relative paths in `api.ts` (`../../../shared/prescription`) — no alias for `src/shared`.
- `cn` helper composes `clsx` + `tailwind-merge` (`src/renderer/src/lib/utils.ts`).
- No barrel/index re-exports observed; modules import concrete files directly.

### 4) Error and Logging Conventions

- Backend: commands return `Result<T, String>`; errors are human-readable strings built with `format!`/`map_err` (`db.rs`, `patients.rs`). Tauri surfaces a rejected `Result` as a rejected `Promise` in the renderer.
- Frontend: forms validate via Zod + `@hookform/resolvers`; `invoke` rejections are handled at call sites (page components).
- Validation duplicated: Zod limits are canonical; Rust `normalize_*` re-validates server-side (`README.md`).
- Logging: No dedicated logging library found in either layer; no structured log format. Sensitive-data redaction: N/A (offline, local-only data; no telemetry).

### 5) Testing Conventions

- Test file location: Rust unit tests are inline `#[cfg(test)] mod tests` within the source file (`src-tauri/src/commands/mod.rs`, `migrations.rs`, `commands/settings.rs`).
- Naming: `#[test] fn <descriptive_name>()`.
- Mocking: Rust tests use real in-memory/temp SQLite connections (no mock framework observed).
- Renderer tests: none configured (`AGENTS.md`).
- Coverage expectation: No coverage tool or threshold configured. [TODO]

### 6) Evidence

- `biome.json`, `.editorconfig`, `tsconfig.json`, `vite.config.ts`
- `src/shared/prescription.ts`, `src/renderer/src/lib/api.ts`, `src/renderer/src/lib/utils.ts`
- `src-tauri/src/commands/patients.rs`, `src-tauri/src/migrations.rs`
- `README.md`, `AGENTS.md`
