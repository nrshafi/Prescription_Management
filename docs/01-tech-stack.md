# 01 — Tech Stack

## Confirmed Stack

| Layer            | Choice                          | Notes                                         |
| ---------------- | ------------------------------- | --------------------------------------------- |
| Desktop runtime  | Electron                        | Printing, file access, Windows installer      |
| Scaffolding      | electron-vite (react-ts)        | Fast HMR, main/preload/renderer separation    |
| UI               | React + TypeScript              | Component model + type safety                 |
| Styling          | Tailwind CSS                    | Utility-first styling                         |
| Components       | shadcn/ui                       | Forms, dialogs, tables, inputs, cards, select |
| Database         | SQLite via better-sqlite3       | Synchronous, runs in main process only        |
| ORM / migrations | Drizzle ORM + drizzle-kit       | Type-safe schema + migration management       |
| Forms            | React Hook Form                 | Form state and submission                     |
| Validation       | Zod (+ @hookform/resolvers)     | Schema validation on IPC boundary + forms     |
| Packaging        | electron-builder                | Windows NSIS installer, native rebuild        |

## Core Dependency List (~10)

```json
{
  "electron": "",
  "react": "",
  "typescript": "",
  "tailwindcss": "",
  "drizzle-orm": "",
  "better-sqlite3": "",
  "zod": "",
  "react-hook-form": "",
  "electron-builder": "",
  "shadcn-ui": ""
}
```

## Deliberately Removed (Add Later If Needed)

| Removed         | Reason                                              | Add when                                  |
| --------------- | -------------------------------------------------- | ----------------------------------------- |
| Zustand         | App is small; React state + context is enough      | Global state becomes painful to thread    |
| TanStack Table  | Plain shadcn table handles 100–5000+ rows fine     | Need server-side paging / complex tables  |
| pdf-lib         | Electron renders HTML → print & printToPDF         | Need programmatic PDF manipulation        |

## Decisions Locked In

- **Scaffold:** electron-vite (react-ts).
- **State:** React state/context only.
- **Lists:** plain shadcn table with client-side search/filter/sort.
- **Print:** app renders the full layout (works on blank paper).
- **Print/PDF:** single source of truth via Electron `print()` + `printToPDF()`.
- **DB location:** OS `userData` (app-data) directory.

## Principle

Everything beyond the core list is optional until a real requirement appears.
Keep the app maintainable, offline, and lightweight.
