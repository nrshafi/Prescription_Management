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
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **UI**: React 19 + Tailwind CSS 4 + shadcn/ui (new-york style)
- **Forms**: react-hook-form + zod validation
- **Icons**: lucide-react

## Development Commands

```bash
npm run dev          # Start development (main + renderer hot reload)
npm run build        # Typecheck + production build
npm run typecheck    # Run both node + web typechecks
npm run lint         # Biome linting
npm run format       # Biome formatting
npm run check        # Biome lint + format + import sorting
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run pending migrations
```

## Build & Package

```bash
npm run build:win    # Windows installer
npm run build:mac    # macOS build
npm run build:linux  # Linux AppImage/snap/deb
```

## Database

- **Location**: `{userData}/prescription.db` (Electron userData directory)
- **Schema**: `src/main/db/schema.ts` - patients, prescriptions, sections, medicines, presets, templates, doctor profile
- **Migrations**: `drizzle/` folder, auto-run on app start
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
- Add components: `npx shadcn@latest add [component]`
- Components placed in `src/renderer/src/components/ui/`
- Biome rule relaxed for ui component exports (variant helpers)

## File Structure Conventions

- Services: `src/main/services/` - Business logic with Drizzle queries
- IPC: `src/main/ipc/` - Electron IPC handler registration
- Pages: `src/renderer/src/pages/` - Top-level view components
- Shared types: `src/shared/` - Zod schemas + TypeScript interfaces

## Testing & Quality

No test framework configured. Verify changes via:
1. `npm run typecheck` - TypeScript compilation
2. `npm run lint` - Biome checks
3. `npm run dev` - Manual testing in development

## Common Pitfalls

- Database init required before IPC handlers can work (see `src/main/index.ts`)
- Migrations folder path differs between dev and packaged app
- better-sqlite3 requires native rebuild for Electron (handled by postinstall)
- Renderer cannot import main process code (use shared types instead)

## Adding New Features

1. Define database schema in `src/main/db/schema.ts`
2. Generate migration: `npm run db:generate`
3. Add service logic in `src/main/services/`
4. Register IPC handler in `src/main/ipc/index.ts`
5. Expose via preload API in `src/preload/index.ts`
6. Build UI in renderer using `window.api.*`
