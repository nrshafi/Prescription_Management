# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary languages | TypeScript (React TSX renderer) and Rust (Tauri backend) | `package.json`, `tsconfig.json`, `src-tauri/Cargo.toml` |
| Runtime + version | Tauri `2`; Rust edition 2021; Node type definitions `^22.19.1` | `src-tauri/Cargo.toml`, `package.json` |
| Package manager | Bun, based on `bun.lock` and `bun run` scripts; Cargo for the Rust backend | `bun.lock`, `package.json`, `src-tauri/Cargo.toml` |
| Module/build system | Vite for the renderer, Tauri CLI for dev/build orchestration | `vite.config.ts`, `src-tauri/tauri.conf.json`, `package.json` |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| `@tauri-apps/api` | `^2.9.0` | Renderer-to-backend `invoke` bridge | `package.json`, `src/renderer/src/lib/api.ts` |
| `tauri` (Rust) | `2` | Desktop shell, windowing, IPC commands | `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs` |
| `tauri-plugin-dialog` (Rust) | `2` | Native save/open dialogs for backup export/import | `src-tauri/src/commands/settings.rs` |
| `tauri-plugin-opener` (Rust) | `2` | Safe external link opening | `src-tauri/Cargo.toml` |
| `rusqlite` (Rust) | `0.32` (bundled, backup) | Local SQLite database access | `src-tauri/src/db.rs` |
| `serde` / `serde_json` (Rust) | `1` | Command input/output (de)serialization | `src-tauri/src/commands/` |
| `@hookform/resolvers` | `^5.4.0` | Connects Zod validation to React Hook Form | `package.json` |
| `react-hook-form` | `^7.77.0` | Renderer form state management | `package.json` |
| `zod` | `^4.4.3` | Renderer runtime validation schemas | `src/shared/patient.ts`, `src/shared/prescription.ts`, `src/shared/settings.ts` |
| `@radix-ui/react-*` and `radix-ui` | versions in manifest | UI primitives behind shadcn-style components | `src/renderer/src/components/ui/` |
| `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css` | versions in manifest | Styling utilities | `src/renderer/src/lib/utils.ts`, `src/renderer/src/assets/main.css` |
| `lucide-react` | `^1.17.0` | Renderer icon components | `src/renderer/src/pages/Dashboard.tsx` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| `@tauri-apps/cli` | Tauri dev/build orchestration | `package.json` |
| `vite` + `@vitejs/plugin-react` | Renderer development and build | `vite.config.ts` |
| `typescript` | Static type checking | `tsconfig.json` |
| `@biomejs/biome` | Linting, formatting, import organization | `biome.json` |
| `@tailwindcss/vite` and `tailwindcss` | Tailwind CSS v4 integration | `vite.config.ts`, `src/renderer/src/assets/main.css` |
| `cargo` / `rustc` | Rust backend compilation | `src-tauri/Cargo.toml` |

### 4) Key Commands

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run check
bun run build
```

There is no `test` script in `package.json`; test commands are `[TODO]`.

### 5) Environment and Config

- Config sources: `package.json`, `vite.config.ts`, `tsconfig.json`, `biome.json`, `.editorconfig`, `components.json`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/Cargo.toml`.
- Dev server: Vite on `http://localhost:5173` (`devUrl` in `tauri.conf.json`); production renderer is served from `dist/` (`frontendDist`).
- Security: CSP configured in `tauri.conf.json` and `src/renderer/index.html`; capabilities restricted to `core:default`, `dialog:default`, `opener:default` for the `main` and `print-*` windows.
- Container runtime: none detected.
- CI/CD runtime: none detected.

### 6) Evidence

- `package.json`
- `bun.lock`
- `vite.config.ts`
- `tsconfig.json`
- `biome.json`
- `.editorconfig`
- `components.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/lib.rs`
