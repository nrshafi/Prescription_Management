# Security Concerns

## Overview

This plan tracks security risks, current mitigations, known gaps, and follow-up work. Several items require documented product or security decisions before implementation details can be chosen safely.

## Concerns & Action Plans

### Local Sensitive Data at Rest

- OWASP category: A02 Cryptographic Failures
- Evidence: `src/main/db/client.ts`, `src/main/db/migrate.ts`
- Current mitigation: SQLite is stored under Electron `userData`; no database credentials are used.
- Gap: Encryption, file-permission, and compliance requirements are not documented.

Actionable Steps:

1. Define whether local database encryption is required.
2. Define file-permission expectations for the SQLite database.
3. Document any compliance requirements that apply to locally stored prescription or patient data.
4. Record the agreed requirements in security or architecture documentation.
5. Reassess the local storage implementation after requirements are documented.

Potential Challenges & Mitigation:

- Challenge: Encryption requirements may depend on legal, clinical, or organizational policies.
- Mitigation: Treat this as a product/security policy decision before changing implementation.
- Challenge: File-permission behavior may differ by operating system.
- Mitigation: Document target platform expectations before implementation work begins.

Estimated Effort: medium

### Renderer Sandbox Disabled

- OWASP category: A05 Security Misconfiguration
- Evidence: `src/main/index.ts`, `src/main/print-window.ts`
- Current mitigation: Navigation policy denies new windows and only opens allowlisted external protocols.
- Gap: Rationale for `sandbox: false` is not documented.

Actionable Steps:

1. Confirm why the renderer sandbox is disabled.
2. Document the rationale for `sandbox: false`.
3. Review whether the current navigation policy remains sufficient for the documented rationale.
4. If the sandbox is not required to be disabled, evaluate re-enabling it.
5. Keep allowlisted external protocol handling documented as part of the renderer security model.

Potential Challenges & Mitigation:

- Challenge: The sandbox may be disabled for compatibility with existing renderer behavior.
- Mitigation: Document the dependency that requires `sandbox: false` before attempting to change it.
- Challenge: Re-enabling the sandbox may introduce runtime regressions.
- Mitigation: Validate affected renderer and print-window flows before changing configuration.

Estimated Effort: medium

### User-Facing Raw Error Messages

- OWASP category: A09 Security Logging and Monitoring Failures / N/A
- Evidence: `src/renderer/src/pages/NewPrescription.tsx`, `src/renderer/src/pages/Settings.tsx`, `src/main/services/patients.ts`
- Current mitigation: Renderer uses fallback strings for non-Error values.
- Gap: Redaction and user-facing error policy is not documented.

Actionable Steps:

1. Define the policy for user-facing error messages.
2. Define whether sensitive details should be redacted from UI error messages.
3. Document the distinction between internal diagnostic errors and user-facing messages.
4. Review affected renderer pages and patient service error paths against the documented policy.
5. Update user-facing error handling if the policy requires redaction or standardized messages.

Potential Challenges & Mitigation:

- Challenge: Raw errors may be useful during development but inappropriate in production.
- Mitigation: Document separate expectations for development diagnostics and production-facing messages.
- Challenge: Some errors originate from lower-level services.
- Mitigation: Define a consistent boundary where errors are converted into safe user-facing text.

Estimated Effort: medium

### SQL Injection Through User Input

- OWASP category: A03 Injection
- Evidence: `src/main/services/patients.ts`, `src/main/services/prescriptions.ts`, `src/main/services/settings.ts`
- Current mitigation: Values are bound as `?` parameters; dynamic sort columns use whitelisted maps; section type subquery uses bound parameters.
- Gap: New dynamic SQL still needs review for whitelist and parameter use.

Actionable Steps:

1. Continue using bound `?` parameters for user-provided values.
2. Continue using whitelisted maps for dynamic SQL identifiers such as sort columns.
3. Review new SQL changes for parameter binding and whitelist usage.
4. Avoid string interpolation for user-controlled SQL values.
5. Document SQL review expectations for future database service changes.

Potential Challenges & Mitigation:

- Challenge: Dynamic SQL may be needed for sorting, filtering, or optional query sections.
- Mitigation: Keep dynamic identifiers whitelist-based and dynamic values parameter-bound.
- Challenge: Future changes may accidentally bypass current safe patterns.
- Mitigation: Include SQL injection checks in code review for database service changes.

Estimated Effort: low

## Overall Effort

Overall effort: medium. Immediate work is mostly documenting missing security decisions. Implementation effort may increase if the decisions require database encryption, stricter file permissions, sandbox reconfiguration, or standardized error redaction.
