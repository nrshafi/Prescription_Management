# 05 — Screens

Sourced from the project spec and the Excalidraw wireframe. v1 list views use a
plain shadcn table with client-side search/filter/sort.

## Dashboard

```text
Total Patients
Today's Prescriptions
Recent Patients
```

Entry screen; quick access to "New P." (new patient/prescription) and search.

## Patients

Actions:

```text
Create
Edit
Delete
Search
History
```

- **Search:** by Patient_ID, Pres_ID, Name, or Phone.
- **Table columns (wireframe):** ID, Name, Age, Gender, C/C, Dia.
- **Filter / Sort:** client-side controls on the table.
- **History:** selecting a patient shows their prior prescriptions (visits).
- **Patient_ID:** auto-generated (`PAT-000001`).

## Prescription

Actions:

```text
Create
Edit
Duplicate
Print
Save Draft
```

Layout (wireframe):

- Patient header strip (ID, Name, Age, Gender).
- Sections: `C/C` (Chief Complaint), `O/E` (Examination), `Inv` (Investigation),
  `Dia` (Diagnosis).
- `Rx,` medicine table: medicine name, dosage, frequency, duration, notes.
- `Advice:` free text / preset insert.
- `Follow Up:` interval (e.g. `[int] D, W, M`).
- Insert content from presets (Medicine / Advice / Diagnosis / Investigation).
- **Duplicate:** clones sections + medicines into a new visit (new visit_no).

## Presets

Manage reusable content by category:

```text
Medicines
Advice
Diagnosis
Investigation
```

Create / edit / delete preset entries (title + content).

## Settings (Overlay)

```text
Doctor Profile      # name, degrees, speciality, contact, chamber, logo, signature
Paper Settings      # size + margins (A4 default; A5 / Letter / Custom later)
Backup              # export / import (see backup doc)
Theme               # light / dark
```

## Navigation Notes

- Settings opens as an overlay (per wireframe), not a full route swap.
- A hidden `/print` route renders the print layout (see print engine doc); it is
  never shown as a normal screen.
