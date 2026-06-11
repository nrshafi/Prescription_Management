# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: `[TODO]` no test framework dependency or `test` script was found in `package.json`.
- Assertion/mocking tools: `[TODO]` no assertion or mocking tooling was found.
- Commands:

```bash
[TODO] run all tests
[TODO] run unit tests
[TODO] run integration/e2e tests
[TODO] run coverage
```

Available non-test quality commands from `package.json` are:

```bash
bun run typecheck
bun run lint
bun run check
bun run build
```

### 2) Test Layout

- Test file placement pattern: `[TODO]` no test files matching `**/*.{test,spec}.{ts,tsx,js,jsx}` were found.
- Naming convention: `[TODO]` no repository test naming convention was found.
- Setup files and where they run: `[TODO]` no test setup files were found.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | no detected tests | `[TODO]` | No unit test files or runner config found. |
| Integration | no detected tests | `[TODO]` | No IPC/database integration test files found. |
| E2E | no detected tests | `[TODO]` | No Electron E2E tooling found. |

### 4) Mocking and Isolation Strategy

- Main mocking approach: `[TODO]` no mocks or test framework were found.
- Isolation guarantees: `[TODO]` no test database setup/teardown exists in files reviewed.
- Common failure mode in tests: `[TODO]` cannot determine without test suite or CI output.

### 5) Coverage and Quality Signals

- Coverage tool + threshold: `[TODO]` no coverage config was found.
- Current reported coverage: `[TODO]` no coverage output was found.
- Known gaps/flaky areas: no automated coverage for SQLite migrations, IPC handlers, renderer prescription workflow, backup import/export, or print/PDF flows was found.
- Repository quality commands exist for type checking and Biome lint/check, but AGENTS guidance requires explicit permission before running them.
- CI/CD: none detected in Phase 1 scan terminal output.

### 6) Evidence

- `package.json`
- `tsconfig.node.json`
- `tsconfig.web.json`
- `biome.json`
- `AGENTS.md`
- Phase 1 scan terminal output
