# Coding Conventions

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | Renderer components/pages use PascalCase; main/shared service modules use lower-case or kebab/camel case | `NewPrescription.tsx`, `PatientFormDialog.tsx`, `patients.ts`, `print-spooler.ts` | `src/renderer/src/pages/`, `src/renderer/src/components/patients/`, `src/main/services/` |
| Functions/methods | camelCase functions; exported service functions use verb/object naming | `createPatient`, `listPrescriptions`, `getSettings`, `printPageSize` | `src/main/services/patients.ts`, `src/main/services/prescriptions.ts`, `src/main/services/settings.ts`, `src/main/print-window.ts` |
| Types/interfaces | PascalCase interfaces/types | `PatientRecord`, `PrescriptionDetail`, `DoctorProfileFormValues`, `PrintActionResult` | `src/shared/patient.ts`, `src/shared/prescription.ts`, `src/shared/settings.ts`, `src/shared/print.ts` |
| Constants/env vars | Upper snake case for arrays/sets and environment variables; camel/Pascal for object defaults | `GENDERS`, `PRESCRIPTION_SECTION_TYPES`, `ELECTRON_RENDERER_URL`, `DEFAULT_PAPER_SETTINGS` | `src/shared/patient.ts`, `src/shared/prescription.ts`, `src/main/index.ts`, `src/main/services/printing.ts` |

### 2) Formatting and Linting

- Formatter: Biome, configured in `biome.json` with spaces, 2-space indent, 100-character line width, single quotes, semicolons as needed, and no trailing commas.
- Linter: Biome, configured in `biome.json` with recommended rules, warnings for unused imports/variables, `noExplicitAny` as warning, and `noNonNullAssertion` disabled.
- EditorConfig: UTF-8, 2-space indentation, LF endings, final newline, trim trailing whitespace.
- Most relevant enforced rules: `recommended`, `correctness.noUnusedImports`, `correctness.noUnusedVariables`, `suspicious.noExplicitAny`, organize imports.
- Run commands: `bun run format`, `bun run lint`, `bun run check`.

### 3) Import and Module Conventions

- Import grouping/order: Biome assist has `source.organizeImports` enabled; exact grouping output is governed by Biome.
- Alias vs relative import policy: renderer aliases `@/*` and `@renderer/*` map to `src/renderer/src/*`; shadcn aliases define `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.
- Shared imports: representative renderer files import shared types/schemas through relative paths such as `../../../shared/patient`.
- Public exports/barrel policy: no broad barrel export convention was found; `[TODO]` if the team wants one documented.

### 4) Error and Logging Conventions

- Error strategy by layer: main services throw `Error` for not-found/invalid state; renderer components catch `err instanceof Error ? err.message : fallback` and render status/error text.
- Validation strategy: shared Zod schemas are parsed in main services and with `zodResolver` in React Hook Form for patient forms.
- Logging style and required context fields: only preload logs context bridge exposure errors via `console.error(error)`; no logging library or structured log format was found.
- Sensitive-data redaction rules: `[ASK USER]` no explicit redaction policy was found.

### 5) Testing Conventions

- Test file naming/location rule: `[TODO]` no `*.test.*` or `*.spec.*` files were found.
- Mocking strategy norm: `[TODO]` no test framework or mocks were found.
- Coverage expectation: `[TODO]` no coverage config or threshold was found.

### 6) Evidence

- `biome.json`
- `.editorconfig`
- `.vscode/settings.json`
- `tsconfig.web.json`
- `electron.vite.config.ts`
- `components.json`
- `src/main/services/patients.ts`
- `src/main/services/prescriptions.ts`
- `src/shared/patient.ts`
- `src/shared/prescription.ts`
- `src/renderer/src/components/patients/PatientFormDialog.tsx`
- `src/renderer/src/pages/Settings.tsx`
- `src/preload/index.ts`
