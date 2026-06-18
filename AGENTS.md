# Prescription Management - Agent Guide

## Project Overview

Offline desktop app for single-doctor prescription management. Tauri v2 + React + TypeScript with a Rust backend.

## Architecture

- **Backend (Rust)**: `src-tauri/src/` - Tauri commands, SQLite database (rusqlite), migrations, print windows
- **API adapter**: `src/renderer/src/lib/api.ts` - typed `api` module backed by Tauri `invoke`
- **Renderer**: `src/renderer/` - React UI with Tailwind CSS + shadcn/ui components
- **Shared**: `src/shared/` - TypeScript types/Zod schemas used by the renderer

## Key Tech Stack

- **Build**: Vite (renderer) + Tauri CLI (`src-tauri/tauri.conf.json`)
- **Database**: SQLite via rusqlite (raw SQL + PRAGMA user_version migrations)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui (new-york style)
- **Forms**: react-hook-form + zod validation (frontend); commands re-validate in Rust
- **Icons**: lucide-react

## Development Commands

```bash
bun run dev          # tauri dev (Vite renderer + Rust backend, hot reload)
bun run dev:renderer # Vite dev server only
bun run build        # Typecheck + tauri build (production bundle)
bun run typecheck    # TypeScript typecheck (renderer + shared)
bun run lint         # Biome linting
bun run format       # Biome formatting
bun run check        # Biome lint + format + import sorting
```

## Build & Package

```bash
bun run build        # Bundles installers for the current OS via tauri build
```

## Database

- **Location**: Tauri app data dir (`{appData}/com.prescriptx.app/prescription.db`)
- **Schema + migrations**: `src-tauri/src/migrations.rs` (PRAGMA user_version), auto-run on app start
- **Singleton rows**: `doctor_profile` and `paper_settings` rows ensured by `ensure_singleton_rows()`

## Path Aliases (Renderer)

- `@renderer/*` or `@/*` -> `src/renderer/src/*`
- Use `@/components/ui/` for shadcn components
- Use `@/lib/utils` for utility functions

## Code Style

- **Biome**: single quotes, no semicolons, 100 char width, no trailing commas
- **Biome**: React/TypeScript linting, import sorting, Tailwind CSS support
- **Rust**: rustfmt defaults; commands return `Result<T, String>`
- **EditorConfig**: 2 spaces, LF line endings, UTF-8

## IPC Pattern

All renderer<->backend communication uses Tauri commands:
1. Add a `#[tauri::command]` fn in `src-tauri/src/commands/`
2. Register it in `tauri::generate_handler![...]` in `src-tauri/src/lib.rs`
3. Add a method to the `api` object in `src/renderer/src/lib/api.ts`
4. Call via `api.method()` in the renderer

## shadcn/ui Components

- Config: `components.json` (new-york style, neutral base color)
- Add components: `bunx shadcn@latest add [component]`
- Components placed in `src/renderer/src/components/ui/`
- Biome rule relaxed for ui component exports (variant helpers)

## File Structure Conventions

- Commands: `src-tauri/src/commands/` - Business logic with prepared SQL per domain
- Database: `src-tauri/src/db.rs` and `src-tauri/src/migrations.rs`
- Pages: `src/renderer/src/pages/` - Top-level view components
- Shared types: `src/shared/` - Zod schemas + TypeScript interfaces

## Printing

- Print route is the regular renderer loaded with `?printPrescriptionId=<id>`
- `printing_preview` opens a `print-*` webview window on that route
- `printing_print` / `printing_pdf` add `&autoprint=1`; the renderer triggers `window.print()` once content is ready (PDF export = "Save as PDF" in the system dialog; one-click PDF is a future milestone)
- New window labels must be allowed in `src-tauri/capabilities/default.json`

## Testing & Quality

No test framework configured. Verify changes via:
1. `bun run typecheck` - TypeScript compilation
2. `bun run lint` - Biome checks
3. `bun run dev` - Manual testing in development

## Common Pitfalls

- The managed DB connection is created in Tauri `setup()`; commands fail before that
- Zod validation is frontend-only; Rust commands must validate their own inputs
- The renderer cannot import backend code; shared TypeScript types live in `src/shared/`
- Building requires the Rust toolchain and platform Tauri prerequisites

## Adding New Features

1. Add migration SQL in `src-tauri/src/migrations.rs`
2. Add command logic in `src-tauri/src/commands/`
3. Register the command in `src-tauri/src/lib.rs`
4. Expose it via `src/renderer/src/lib/api.ts`
5. Build UI in renderer using `api.*`

## Verification Commands

Do not run these commands without explicit user permission:

| Task | Command |
|------|---------|
| Typecheck | `bun run typecheck` |
| Lint | `bun run lint` |
| Format check | `bun run check` |
| Rust check | `cargo check` (in `src-tauri/`) |
| Build verification | `bun run build` |

After completing a build task, list which commands you would run and wait for authorization. Read-only tasks (file exploration, dependency research) do not require permission.

## Skills Usage

Agents MUST load and use the following specialized skills before performing relevant tasks:

### UI/Component Work
- **shadcn**: Load when working with shadcn/ui components, adding new components, styling, or composing UI. Use `skill` tool with `name: "shadcn"` before tasks involving `src/renderer/src/components/ui/`, `components.json`, or shadcn-related work.

### Database Work
- **SQLite Database Expert**: Load when working with SQLite schema, migrations, queries, or database optimization. Use `skill` tool with `name: "SQLite Database Expert"` before tasks involving `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs`, or database-related changes.

### React Performance
- **vercel-react-best-practices**: Load when writing, reviewing, or refactoring React components. Use `skill` tool with `name: "vercel-react-best-practices"` before tasks involving React component optimization, rendering patterns, or performance improvements.

### UI/UX Design
- **web-design-guidelines**: Load when reviewing or implementing UI/UX features. Use `skill` tool with `name: "web-design-guidelines"` before tasks involving design reviews, accessibility checks, or UI compliance.

### Tauri Development
- **tauri-v2**: Load when working with Tauri v2+ cross-platform app development, Rust backend commands, IPC patterns (invoke, emit, channels), permissions/capabilities configuration, or troubleshooting Tauri build issues. Use `skill` tool with `name: "tauri-v2"` before tasks involving `src-tauri/`, `tauri.conf.json`, Rust commands, or Tauri-related changes.

### Rust Development
- **rust-best-practices**: Load when writing, reviewing, or refactoring Rust code, making ownership/borrowing decisions, implementing error handling, optimizing for performance, or writing Rust tests. Use `skill` tool with `name: "rust-best-practices"` before tasks involving `.rs` files, `Cargo.toml`, Rust backend code, or Tauri-related Rust code.
