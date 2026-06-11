# Technology Stack

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | TypeScript, including React TSX | `package.json`, `tsconfig.node.json`, `tsconfig.web.json`, Phase 1 scan terminal output |
| Runtime + version | Electron `^39.2.6`; Node type definitions `^22.19.1`; exact installed runtime version is `[TODO]` | `package.json` |
| Package manager | Bun, based on `bun.lock` and `bun run` scripts | `bun.lock`, `package.json` |
| Module/build system | electron-vite with Vite, React plugin, Tailwind Vite plugin, and externalized main/preload deps | `electron.vite.config.ts`, `package.json` |

### 2) Production Frameworks and Dependencies

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| `@electron-toolkit/preload` | `^3.0.2` | Preload helper for exposing Electron APIs | `package.json`, `src/preload/index.ts` |
| `@electron-toolkit/utils` | `^4.0.0` | Electron main-process utilities and dev/prod checks | `package.json`, `src/main/index.ts` |
| `better-sqlite3` | `^12.10.0` | Local SQLite database access | `package.json`, `src/main/db/client.ts` |
| `@hookform/resolvers` | `^5.4.0` | Connects Zod validation to React Hook Form | `package.json`, `src/renderer/src/components/patients/PatientFormDialog.tsx` |
| `react-hook-form` | `^7.77.0` | Renderer form state management | `package.json`, `src/renderer/src/components/patients/PatientFormDialog.tsx` |
| `zod` | `^4.4.3` | Shared runtime validation schemas | `package.json`, `src/shared/patient.ts`, `src/shared/prescription.ts`, `src/shared/settings.ts` |
| `@radix-ui/react-*` and `radix-ui` | versions in manifest | UI primitives behind shadcn-style components | `package.json`, `src/renderer/src/components/ui/dialog.tsx`, `src/renderer/src/components/ui/select.tsx` |
| `class-variance-authority` | `^0.7.1` | Component variant definitions | `package.json`, `src/renderer/src/components/ui/button.tsx` |
| `clsx` | `^2.1.1` | Conditional class composition | `package.json`, `src/renderer/src/lib/utils.ts` |
| `tailwind-merge` | `^3.6.0` | Tailwind class merge utility | `package.json`, `src/renderer/src/lib/utils.ts` |
| `tw-animate-css` | `^1.4.0` | Tailwind animation CSS import | `package.json`, `src/renderer/src/assets/main.css` |
| `lucide-react` | `^1.17.0` | Renderer icon components | `package.json`, `src/renderer/src/pages/Dashboard.tsx` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| `electron-vite` | Electron main/preload/renderer development and build | `package.json`, `electron.vite.config.ts` |
| `electron-builder` | Desktop packaging for Windows, macOS, Linux | `package.json`, `electron-builder.yml` |
| `typescript` | Static type checking | `package.json`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json` |
| `@biomejs/biome` | Linting, formatting, import organization | `package.json`, `biome.json` |
| `@vitejs/plugin-react` | React support in Vite renderer build | `package.json`, `electron.vite.config.ts` |
| `@tailwindcss/vite` and `tailwindcss` | Tailwind CSS v4 integration | `package.json`, `electron.vite.config.ts`, `src/renderer/src/assets/main.css` |
| `@electron-toolkit/tsconfig` | Base TypeScript config for Electron | `package.json`, `tsconfig.node.json`, `tsconfig.web.json` |

### 4) Key Commands

```bash
bun install
bun run dev
bun run typecheck
bun run lint
bun run check
bun run build
bun run build:win
bun run build:mac
bun run build:linux
```

There is no `test` script in `package.json`; test commands are `[TODO]`.

### 5) Environment and Config

- Config sources: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tsconfig.web.json`, `biome.json`, `.editorconfig`, `components.json`, `electron-builder.yml`.
- Required env vars: `ELECTRON_RENDERER_URL` is read during development by Electron/electron-vite; no `.env.example` or `.env.template` was found in the scan.
- Deployment/runtime constraints: packaged app unpacks `resources/**` and `**/node_modules/better-sqlite3/**`; auto-update publishing is intentionally not configured in `electron-builder.yml`.
- Container runtime: none detected in the scan.
- CI/CD runtime: none detected in the scan.

### 6) Evidence

- `package.json`
- `bun.lock`
- `electron.vite.config.ts`
- `tsconfig.json`
- `tsconfig.node.json`
- `tsconfig.web.json`
- `biome.json`
- `.editorconfig`
- `components.json`
- `electron-builder.yml`
- `src/main/index.ts`
- Phase 1 scan terminal output
