# 02 — Project Structure

## Layout (electron-vite)

```text
Prescription_Management/
├── docs/                          # Planning documents (this folder)
├── drizzle/                       # Generated SQL migrations
│   └── meta/
├── electron.vite.config.ts        # electron-vite config (main/preload/renderer)
├── electron-builder.yml           # Packaging config (NSIS, native rebuild)
├── drizzle.config.ts              # drizzle-kit config
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── components.json                # shadcn/ui config
└── src/
    ├── main/                      # Electron main process (Node)
    │   ├── index.ts               # App bootstrap, window, lifecycle
    │   ├── db/
    │   │   ├── client.ts          # better-sqlite3 + Drizzle init (userData path)
    │   │   ├── schema.ts          # Drizzle table definitions
    │   │   └── migrate.ts         # Run migrations on startup
    │   ├── services/              # Business logic (no IPC concerns)
    │   │   ├── patients.ts
    │   │   ├── prescriptions.ts
    │   │   ├── presets.ts
    │   │   ├── profile.ts
    │   │   ├── settings.ts
    │   │   └── backup.ts
    │   ├── ipc/                   # IPC handlers wiring services to channels
    │   │   └── index.ts
    │   └── print/
    │       └── print.ts           # print() / printToPDF() orchestration
    │
    ├── preload/                   # Context bridge (typed, secure)
    │   ├── index.ts               # contextBridge.exposeInMainWorld
    │   └── api.ts                 # Typed invoke wrappers per domain
    │
    └── renderer/                  # React UI
        ├── index.html
        ├── main.tsx               # React root
        └── src/
            ├── App.tsx
            ├── routes/            # Route definitions (incl. hidden /print)
            ├── pages/
            │   ├── Dashboard.tsx
            │   ├── Patients.tsx
            │   ├── Prescription.tsx
            │   ├── Presets.tsx
            │   └── Settings.tsx
            ├── components/        # Feature components
            │   └── print/
            │       └── PrintRenderer.tsx
            ├── components/ui/     # shadcn/ui generated components
            ├── lib/               # ipc client, utils, zod schemas (shared)
            └── styles/
                └── globals.css    # Tailwind entry
```

## Conventions

- **Process boundaries:** Node-only code (better-sqlite3, fs) lives in `main`.
  The renderer never imports `better-sqlite3` directly.
- **Typed IPC:** all renderer ↔ main calls go through `preload/api.ts` wrappers.
- **Shared types:** Drizzle-inferred types + Zod schemas shared via a `lib`/`shared`
  module imported by both sides where safe (types only).
- **shadcn/ui:** generated into `renderer/src/components/ui`, configured by
  `components.json`.
- **Migrations:** authored via drizzle-kit into `drizzle/`, bundled and run on
  app startup against the `userData` database.

## Packaging Notes

- `better-sqlite3` is a native module — configure electron-builder to rebuild it
  and `asarUnpack` the binary.
- Bundle the `drizzle/` migration files so they ship with the installer.
