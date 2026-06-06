# 00 — Overview

## Product Vision

A fast, fully offline desktop application that lets a single doctor manage
patients and produce printed prescriptions in seconds.

### Core Workflow

```text
Open App
↓
Search Patient
↓
Create / Edit Prescription
↓
Print
↓
Done
```

**Target:** `< 60 seconds per prescription`. Everything else is secondary.

## Goals

- Lightweight, single-machine desktop app (Windows first).
- Fully offline — no cloud, no accounts, no network dependency.
- Handle hundreds of thousands of patient and prescription records locally.
- Correct database design and print engine from day one (hardest to change later).
- Minimal dependency surface for long-term maintainability.

## Non-Goals (v1)

- No backend / REST API / Express / Hono / tRPC / GraphQL.
- No cloud sync or multi-user accounts.
- No multi-clinic / multi-doctor support (architecture allows it later).
- No advanced reporting / analytics beyond the dashboard counters.

## Primary User

A single practicing doctor using one Windows machine in a clinic/chamber.

## Success Criteria

- A returning patient's prescription can be created and printed in under a minute.
- The printed output is clean, consistent, and identical to the PDF export.
- Data is safe via local backup/restore, stored in the OS app-data folder.
