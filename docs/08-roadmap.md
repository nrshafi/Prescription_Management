# 08 — Roadmap

Phased delivery. Each phase ends with a concrete deliverable.

## Phase 0 — Scaffolding & Foundation (Build Done)

```text
electron-vite (react-ts) scaffold
Tailwind + shadcn/ui init (button, input, dialog, table, card, form, select, textarea, toast)
Add deps: better-sqlite3, drizzle-orm, drizzle-kit, react-hook-form, zod, @hookform/resolvers
electron-builder config (native rebuild + asarUnpack for better-sqlite3)
Typed preload bridge + IPC invoke wrappers
DB bootstrap in userData + run migrations on startup
```

**Deliverable:** running desktop app with empty DB and a working IPC round-trip.

## Phase 1 — Database & Services (Build Done)

```text
Drizzle schema for all 8 tables
Services + IPC handlers (CRUD per domain)
patient_code / visit_no generation (in transactions)
Search by Patient_ID / Pres_ID / Name / Phone
Seed singleton rows (doctor_profile, paper_settings defaults)
```

**Deliverable:** all data operations callable from the renderer, Zod-validated.

## Phase 2 — Patients (Build Done)

```text
Patients list: table + search + filter + sort (ID, Name, Age, Gender, C/C, Dia)
Create / Edit / Delete (RHF + Zod dialogs)
Patient detail with visit history
```

**Deliverable:** full patient management.

## Phase 3 — Prescriptions (Build Done)

```text
Prescription form: sections (C/C, O/E, Inv, Dia), Rx table, Advice, Follow Up
Insert from presets
Save draft, edit, duplicate (clone → new visit_no)
"New P." quick-create
```

**Deliverable:** complete create → edit → duplicate workflow.

## Phase 4 — Printing (most critical) (Build Done)

```text
PrintRenderer at hidden /print route (full layout from doctor_profile)
@page sizing from paper_settings (A4 default)
Electron print() + printToPDF() — one source of truth
Print preview
```

**Deliverable:** clinic-ready printing + PDF export.

## Phase 5 — Productivity & Settings

```text
Presets manager (4 categories)
Recent medicines suggestions
Settings overlay: Doctor Profile, Paper Settings, Theme, Backup
Backup export / import (restore)
Dashboard: Total Patients, Today's Prescriptions, Recent Patients
```

**Deliverable:** doctor-friendly, fully offline app.

## Key Risks & Mitigations

| Risk                                    | Mitigation                                                 |
| --------------------------------------- | ---------------------------------------------------------- |
| better-sqlite3 native build in Electron | Configure electron-builder rebuild + asarUnpack in Phase 0 |
| Print fidelity                          | Isolate print layout in its own route from day one         |
| Migrations on packaged app              | Bundle migrations; run on startup against userData DB      |
| Data loss                               | DB in userData + backup/restore as safety net              |
