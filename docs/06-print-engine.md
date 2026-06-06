# 06 — Print Engine

The most important component. One layout engine, one source of truth for both
print and PDF export.

## Principle: Never Print React Pages Directly

Use a dedicated print layout, separate from interactive UI:

```text
PrescriptionForm.tsx
      ↓ (data only)
PrintRenderer.tsx   (hidden /print route)
      ↓
Electron print() / printToPDF()
```

Benefits:

```text
Clean layout (no app chrome / buttons)
Identical design for PDF and physical print
Single place to maintain layout
```

## App Renders Full Layout

The app draws the entire prescription on blank paper:

- **Header:** doctor logo, name, degrees, speciality, contact, chamber — from
  `doctor_profile`.
- **Patient strip:** ID, name, age, gender, date, visit no.
- **Body:** sections (C/C, O/E, Inv, Dia), Rx medicine table, Advice, Follow Up.
- **Footer:** signature image from `doctor_profile.signature_path`.

(No pre-printed-pad mode in v1.)

## Paper System

Driven by the `paper_settings` table (single row):

| Field         | Type   |
| ------------- | ------ |
| width_mm      | number |
| height_mm     | number |
| margin_top    | number |
| margin_bottom | number |
| margin_left   | number |
| margin_right  | number |

- Default: **A4** (210 × 297 mm).
- Later: A5, Letter, Custom — without rewriting the renderer.
- CSS `@page { size: <width>mm <height>mm; margin: ... }` generated from settings.

## Electron Integration

- **Print:** `webContents.print(options)` from the print route's contents.
- **PDF export:** `webContents.printToPDF(options)` from the same contents, then
  write the buffer to a user-chosen path.
- Both consume the identical `PrintRenderer` output → guaranteed parity.
- A print preview is shown before sending to the printer.

## IPC

| Channel           | Purpose                          |
| ----------------- | -------------------------------- |
| `print:print`     | Render + send to system printer  |
| `print:exportPdf` | Render + save as PDF             |

Renderer passes the prescription id; main loads data, renders the print route,
and runs print / printToPDF.
