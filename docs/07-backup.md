# 07 — Backup

Local-only backup and restore. No cloud, no accounts. Must exist in the MVP.

## Database Location

The SQLite database lives in the OS `userData` (app-data) directory
(`app.getPath('userData')`). This keeps it outside the install folder so updates
and reinstalls do not destroy data.

## Export

Produce a portable copy of the data:

```text
database.db
```

or a bundled archive:

```text
backup.zip
```

Flow:

```text
Settings → Backup → Export
↓
Choose destination
↓
Copy database file (and assets) to destination
```

Notes:

- Use a safe copy of the live DB (checkpoint WAL before copying).
- If using `backup.zip`, include the DB plus referenced assets (logo, signature).

## Import (Restore)

```text
Settings → Backup → Import
↓
Choose Backup file
↓
Restore
```

Flow:

- Validate the chosen file.
- Replace the current `userData` database with the imported one (back up the
  existing DB first as a safety measure).
- Restart / reconnect the DB connection so the app uses the restored data.

## IPC

| Channel         | Purpose                           |
| --------------- | --------------------------------- |
| `backup:export` | Write DB/zip to a chosen path     |
| `backup:import` | Restore DB/zip from a chosen path |

## Out of Scope (v1)

- Cloud backup / sync.
- Scheduled / automatic backups (could be added later).
- User accounts or authentication.
