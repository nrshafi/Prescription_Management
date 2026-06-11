# Prescription Management - Agent Guide

## Project Overview

Offline desktop app for single-doctor prescription management. Electron + React + TypeScript.

## Architecture

- **Main process**: `src/main/` - Electron main, IPC handlers, SQLite database
- **Preload**: `src/preload/` - Context bridge exposing typed `window.api` to renderer
- **Renderer**: `src/renderer/` - React UI with Tailwind CSS + shadcn/ui components
- **Shared**: `src/shared/` - TypeScript types/schemas shared between main and renderer

## Key Tech Stack

- **Build**: electron-vite (Vite-based Electron bundler)
- **Database**: SQLite via better-sqlite3 (raw SQL + PRAGMA user_version migrations)
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui (new-york style)
- **Forms**: react-hook-form + zod validation
- **Icons**: lucide-react

## Development Commands

```bash
bun run dev          # Start development (main + renderer hot reload)
bun run build        # Typecheck + production build
bun run typecheck    # Run both node + web typechecks
bun run lint         # Biome linting
bun run format       # Biome formatting
bun run check        # Biome lint + format + import sorting

```

## Build & Package

```bash
bun run build:win    # Windows installer
bun run build:mac    # macOS build
bun run build:linux  # Linux AppImage/snap/deb
```

## Database

- **Location**: `{userData}/prescription.db` (Electron userData directory)
- **Schema**: `src/main/db/schema.ts` - patients, prescriptions, sections, medicines, presets, templates, doctor profile
- **Migrations**: `src/main/db/migrate.ts` (user_version), auto-run on app start
- **Singleton rows**: paperSettings row ensured via `ensureSingletonRows()`

## Path Aliases (Renderer)

- `@renderer/*` or `@/*` → `src/renderer/src/*`
- Use `@/components/ui/` for shadcn components
- Use `@/lib/utils` for utility functions

## Code Style

- **Biome**: single quotes, no semicolons, 100 char width, no trailing commas
- **Biome**: React/TypeScript linting, import sorting, Tailwind CSS support
- **EditorConfig**: 2 spaces, LF line endings, UTF-8

## IPC Pattern

All renderer↔main communication uses typed IPC channels:
1. Define handler in `src/main/ipc/index.ts`
2. Add method to `src/preload/index.ts` api object
3. Call via `window.api.method()` in renderer

## shadcn/ui Components

- Config: `components.json` (new-york style, neutral base color)
- Add components: `bunx shadcn@latest add [component]`
- Components placed in `src/renderer/src/components/ui/`
- Biome rule relaxed for ui component exports (variant helpers)

## File Structure Conventions

- Services: `src/main/services/` - Business logic with prepared SQL
- IPC: `src/main/ipc/` - Electron IPC handler registration
- Pages: `src/renderer/src/pages/` - Top-level view components
- Shared types: `src/shared/` - Zod schemas + TypeScript interfaces

## Testing & Quality

No test framework configured. Verify changes via:
1. `bun run typecheck` - TypeScript compilation
2. `bun run lint` - Biome checks
3. `bun run dev` - Manual testing in development

## Common Pitfalls

- Database init required before IPC handlers can work (see `src/main/index.ts`)
- Migrations folder path differs between dev and packaged app
- better-sqlite3 requires native rebuild for Electron (handled by postinstall)
- Renderer cannot import main process code (use shared types instead)

## Adding New Features

1. Define row types in `src/main/db/schema.ts` and add migration SQL in `src/main/db/migrate.ts`
3. Add service logic in `src/main/services/`
4. Register IPC handler in `src/main/ipc/index.ts`
5. Expose via preload API in `src/preload/index.ts`
6. Build UI in renderer using `window.api.*`

## Verification Commands

Do not run these commands without explicit user permission:

| Task | Command |
|------|---------|
| Typecheck | `bun run typecheck` |
| Lint | `bun run lint` |
| Format check | `bun run check` |
| Build verification | `bun run build` |

After completing a build task, list which commands you would run and wait for authorization. Read-only tasks (file exploration, dependency research) do not require permission.

## Skills Usage

Agents MUST load and use the following specialized skills before performing relevant tasks:

### UI/Component Work
- **shadcn**: Load when working with shadcn/ui components, adding new components, styling, or composing UI. Use `skill` tool with `name: "shadcn"` before tasks involving `src/renderer/src/components/ui/`, `components.json`, or shadcn-related work.

### Database Work
- **SQLite Database Expert**: Load when working with SQLite schema, migrations, queries, or database optimization. Use `skill` tool with `name: "SQLite Database Expert"` before tasks involving `src/main/db/` or database-related changes.

### React Performance
- **vercel-react-best-practices**: Load when writing, reviewing, or refactoring React components. Use `skill` tool with `name: "vercel-react-best-practices"` before tasks involving React component optimization, rendering patterns, or performance improvements.

### UI/UX Design
- **web-design-guidelines**: Load when reviewing or implementing UI/UX features. Use `skill` tool with `name: "web-design-guidelines"` before tasks involving design reviews, accessibility checks, or UI compliance.

### Tauri Development
- **tauri-v2**: Load when working with Tauri v2+ cross-platform app development, Rust backend commands, IPC patterns (invoke, emit, channels), permissions/capabilities configuration, or troubleshooting Tauri build issues. Use `skill` tool with `name: "tauri-v2"` before tasks involving `src-tauri/`, `tauri.conf.json`, Rust commands, or Tauri-related changes.

### Rust Development
- **rust-best-practices**: Load when writing, reviewing, or refactoring Rust code, making ownership/borrowing decisions, implementing error handling, optimizing for performance, or writing Rust tests. Use `skill` tool with `name: "rust-best-practices"` before tasks involving `.rs` files, `Cargo.toml`, Rust backend code, or Tauri-related Rust code.
