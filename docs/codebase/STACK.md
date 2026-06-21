# Technology Stack

PrescriptX is an offline, single-doctor prescription management desktop application built as a Tauri v2 app: a Rust backend with local SQLite storage and a Vite + React 19 renderer.

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language (frontend) | TypeScript 5.9 | `package.json` (devDependencies), `tsconfig.json` |
| Primary language (backend) | Rust (edition 2021) | `src-tauri/Cargo.toml` |
| Runtime + version | Tauri v2 desktop (webview renderer + native Rust); React 19 | `src-tauri/Cargo.toml`, `package.json`, `README.md` |
| Package manager (JS) | Bun (lockfile `bun.lock`) | `bun.lock`, `README.md`, `AGENTS.md` |
| Package manager (Rust) | Cargo | `src-tauri/Cargo.lock` |
| Module/build system | Vite 7 (renderer) + Tauri CLI (bundle) | `vite.config.ts`, `src-tauri/tauri.conf.json`, `package.json` scripts |

### 2) Production Frameworks and Dependencies

JS production dependencies (`package.json` → `dependencies`):

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| @tauri-apps/api | ^2.9.0 | Renderer→backend bridge (`invoke`) | `src/renderer/src/lib/api.ts` |
| @tauri-apps/plugin-shell | ^2.3.5 | Open external support links | `src/renderer/src/pages/Settings.tsx` |
| react-hook-form | ^7.77.0 | Form state management | `package.json` |
| @hookform/resolvers | ^5.4.0 | Bridges react-hook-form + Zod | `package.json` |
| zod | ^4.4.3 | Shared validation schemas | `src/shared/prescription.ts` |
| radix-ui / @radix-ui/react-* | ^1.5.0 / various | Headless UI primitives (dialog, select, label, slot) | `package.json`, `src/renderer/src/components/ui/` |
| lucide-react | ^1.17.0 | Icon set | `AGENTS.md`, `components.json` |
| class-variance-authority | ^0.7.1 | Variant styling for UI components | `src/renderer/src/components/ui/button.tsx` |
| clsx + tailwind-merge | ^2.1.1 / ^3.6.0 | Class composition utility (`cn`) | `src/renderer/src/lib/utils.ts` |
| tw-animate-css | ^1.4.0 | Tailwind animation utilities | `package.json` |

Rust production dependencies (`src-tauri/Cargo.toml` → `[dependencies]`):

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| tauri | 2 | Desktop app framework, command/IPC, windows | `src-tauri/src/lib.rs` |
| tauri-plugin-dialog | 2 | Native file dialogs (backup import/export) | `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json` |
| tauri-plugin-shell | 2.3.5 | Open external URLs | `src-tauri/capabilities/default.json` |
| rusqlite | 0.32 (`bundled`, `backup`) | SQLite access + backup API | `src-tauri/src/db.rs` |
| serde / serde_json | 1 | (De)serialization of command payloads, JSON import/export | `src-tauri/src/commands/patients.rs` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| @biomejs/biome ^2.4.16 | Lint + format + import sorting | `biome.json`, `package.json` |
| typescript ^5.9.3 | Type checking (`tsc --noEmit`) | `tsconfig.json`, `package.json` |
| vite ^7.2.6 + @vitejs/plugin-react ^5.1.1 | Renderer dev server + build | `vite.config.ts` |
| @tailwindcss/vite + tailwindcss ^4.3.0 | Tailwind CSS 4 styling | `vite.config.ts`, `components.json` |
| @tauri-apps/cli ^2.11.2 | Dev/build/bundle the desktop app | `package.json` scripts |
| react / react-dom ^19.2.1 | UI runtime (listed as devDependencies) | `package.json` |
| cargo test | Rust unit tests | `src-tauri/src/commands/mod.rs`, `README.md` |
| .editorconfig | 2-space, LF, UTF-8 editor settings | `.editorconfig`, `AGENTS.md` |

Note: `react`/`react-dom` are declared under `devDependencies` in `package.json` though they are runtime UI libraries; Tauri bundles the built renderer assets so this does not affect production behavior.

### 4) Key Commands

```bash
bun install                 # Install JS deps
bun run dev                 # tauri dev (Vite renderer + Rust backend)
bun run build               # bun run typecheck && tauri build (OS bundle)
cargo test                  # (in src-tauri/) run Rust unit tests
bun run lint                # Biome lint
bun run check               # Biome lint + format + import sorting
bun run typecheck           # tsc --noEmit
```

### 5) Environment and Config

- Config sources: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `components.json`, `src-tauri/capabilities/default.json`, `.editorconfig`.
- Required env vars: None found. No `.env.example`/`.env.template` exists (scan). Only `import.meta.env.PROD` is read (`src/renderer/src/main.tsx`), which is a Vite built-in.
- Deployment/runtime constraints: Requires the Rust toolchain and platform-specific Tauri prerequisites to build (`README.md`). Data is stored locally in SQLite at `{appDataDir}/prescription.db` (`src-tauri/src/db.rs`); app is fully offline.

### 6) Evidence

- `package.json`, `bun.lock`
- `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`
- `vite.config.ts`, `tsconfig.json`, `biome.json`, `components.json`
- `src-tauri/tauri.conf.json`, `src-tauri/src/lib.rs`, `src-tauri/src/db.rs`
- `README.md`, `AGENTS.md`
