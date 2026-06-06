# 03 — Architecture

## System Diagram

```text
┌─────────────────────────────┐
│ React UI (renderer)         │
└──────────────┬──────────────┘
               │ window.api.* (typed)
               ▼
┌─────────────────────────────┐
│ Preload (contextBridge IPC) │
└──────────────┬──────────────┘
               │ ipcRenderer.invoke
               ▼
┌─────────────────────────────┐
│ Main: IPC handlers          │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Service Layer (business)    │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ Drizzle ORM                 │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│ SQLite (better-sqlite3)     │
└─────────────────────────────┘
```

No backend. No REST API. No Express / Hono / tRPC / GraphQL.

## Rules

- **DB in main only.** `better-sqlite3` and Drizzle run exclusively in the main
  process. The renderer has no direct DB access.
- **Security.** `contextIsolation: true`, `nodeIntegration: false`. The renderer
  only sees the curated `window.api` surface from preload.
- **Validation at the boundary.** Every IPC handler validates its input payload
  with Zod before calling a service.
- **Services are transport-agnostic.** Services contain logic and Drizzle calls;
  they know nothing about IPC.

## IPC Channels (by domain)

| Domain        | Channels                                                                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| patients      | `patients:list`, `patients:search`, `patients:get`, `patients:create`, `patients:update`, `patients:delete`, `patients:history`                                         |
| prescriptions | `prescriptions:list`, `prescriptions:get`, `prescriptions:create`, `prescriptions:update`, `prescriptions:delete`, `prescriptions:duplicate`, `prescriptions:saveDraft` |
| presets       | `presets:list`, `presets:create`, `presets:update`, `presets:delete`                                                                                                    |
| profile       | `profile:get`, `profile:update`                                                                                                                                         |
| settings      | `settings:getPaper`, `settings:updatePaper`, `settings:getTheme`, `settings:setTheme`                                                                                   |
| backup        | `backup:export`, `backup:import`                                                                                                                                        |
| print         | `print:print`, `print:exportPdf`                                                                                                                                        |
| dashboard     | `dashboard:stats`                                                                                                                                                       |

## Data Flow Example (create prescription)

```text
Prescription.tsx (RHF + Zod)
  → window.api.prescriptions.create(payload)
    → ipcRenderer.invoke('prescriptions:create', payload)
      → handler: Zod.parse(payload)
        → prescriptionsService.create(...)   // Drizzle insert (tx)
          → SQLite
      ← returns created prescription id + visit_no
```

## Startup Sequence

1. App ready → resolve DB path in `userData`.
2. Open SQLite (better-sqlite3), set pragmas (WAL, foreign_keys ON).
3. Run pending Drizzle migrations.
4. Ensure singleton rows exist (`doctor_profile`, `paper_settings` defaults).
5. Register IPC handlers.
6. Create main window, load renderer.
