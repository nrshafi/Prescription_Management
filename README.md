# PrescriptX

PrescriptX is an offline desktop app for single-doctor prescription management.
It is built with Tauri v2, React, TypeScript, and Tailwind CSS, backed by a Rust
backend and local SQLite storage.

The renderer is a Vite-powered React app. Desktop integration, native windows,
and backend commands are handled through Tauri v2. Application data is stored in
SQLite on the local machine.

## Project Setup

### Prerequisites

- [Bun](https://bun.sh)
- [Rust toolchain](https://www.rust-lang.org/tools/install) (required by Tauri)
- Platform-specific Tauri prerequisites: https://v2.tauri.app/start/prerequisites/

### Install

```bash
bun install
```

## Development Commands

```bash
bun run dev          # Start the Tauri desktop app in development mode
bun run dev:renderer # Start the Vite renderer only
bun run typecheck    # Run TypeScript type checking
bun run lint         # Run Biome linting
bun run check        # Run Biome checks, formatting, and import sorting
bun run format       # Format files with Biome
```

### Build

```bash
# Builds a bundle for the current operating system
bun run build
```
