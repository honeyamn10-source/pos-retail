# Server release validation

## Current release 0.5 — 15 September 2026

Added an additive native SQLite journal and owner-only order history. Each changed
order snapshot, refund, stock movement, business audit entry and operation retry
record is journaled within the same transaction as the store update. Startup and
restore backfill current legacy records without inventing prior intermediate
versions. The History screen filters and pages records and downloads receipt JSON.

Executed verification:

- TypeScript and native production build passed.
- **79 business/repository tests passed**, including five new ledger tests for
  repeatable migration, duplicate/partial-refund history, fault-injected rollback,
  immutable-record preservation and 105-record pagination/merchant isolation.
- **106 native HTTP checks passed**, including list/detail/filter access,
  denied anonymous/staff access, invalid filters, and encrypted backup/recovery
  preserving four receipts, five order versions and matching journal revision.
- **6 launcher/connection-generator tests** and **8 Python adapter tests** passed.
- The extracted retail kit ran the same **106 HTTP checks without node_modules**.
  Packaging verifies ZIP integrity and every file digest. The build now clears
  generated output first and copies public OCR assets only into the served web
  directory, preventing stale bundles and an unused second runtime OCR copy.

This is a foundation for future storage work, not completed archiving. The
1,000-order and 1.8 MB working-state limits remain; no records or retry identifiers
are removed. Journal writes currently inspect the bounded working state and need
further normalization/performance work before lifting those limits. No dependencies
were added or upgraded. Live payment, call, marketplace and hardware acceptance
remain outstanding. Rendered browser verification is still unavailable because
the browser service blocked the local test URL in the previous release; this
release has no new visual-verification claim.

## Release 0.4 — 12 September 2026

Added Store Control with summary metrics, queue shortcuts, setup steps, connection
configuration status and latest successful API contact. Added owner-only business
date CSV export, readable daily summary tables, a deployment-guide download and
a native release-notes route. Private connection-file generation preserves existing
server settings and produces distinct matching scope credentials. Voice dispatch
now uses an explicit agent name and supports a configurable TTS voice.

Executed verification for this update:

- TypeScript and native production build: passed.
- Business/repository and report tests: **74 passed**.
- Launcher and private connection-generator scenarios: **6 passed**.
- Standard-library Python adapter tests: **8 passed**.
- Native HTTP integration checks: **85 passed**, including owner-only overview,
  secret non-disclosure, latest voice API activity, CSV access/date validation and
  deployment guide delivery.
- LiveKit Agents 1.8.1 and python-escpos 3.1 installed in an isolated Linux/Python
  3.12 environment. Agent/printer imports and VAD construction passed. Resolved
  dependencies are in `integrations/requirements-linux-py312.lock.txt`.

The browser service rejected the local visual-test URL with
`net::ERR_BLOCKED_BY_CLIENT`. The redesigned UI has build/type coverage and its
backend has HTTP tests, but rendered appearance and browser interactions were not
verified. No screenshot of the new design is claimed. Earlier screenshots are
historical examples. Live SIP, models, transfers, actual paper, real domain/server
installation and Windows/Mac desktop acceptance remain unverified.

The sections below retain the earlier release's verification history; their SDK
installation limitation is superseded by the successful imports above.

## Easy setup update — 12 September 2026

Added launchers for Windows, Mac and Linux, a short first-run guide, Node/build
preflight checks, browser opening and one-time token display in the local launch
window. New retail launcher installations use port 8788 to avoid the restaurant
default. Existing environment configuration is preserved. ZIPs retain executable
permissions for the Unix launchers.

Four automated launcher scenarios passed on Linux with the real built server:
restaurant and retail first launch from a different working directory, owner
setup and restart persistence; invalid configuration/missing-build rejection;
and an occupied-port failure without displaying the setup token. The launcher
tests use `--no-browser`: desktop browser opening and Windows/Mac launch-file
interaction still require validation on those systems. No payment, voice,
marketplace or hardware activation is implied by this setup update.

Reproduce with `node --test tests/launcher.test.mjs` after the server build.

## Core server validation

Executed on Linux with Node.js 24.19.0 and pnpm 11.19.0.

- Locked dependency installation: passed after correcting an unresolved
  `tesseract.js` build-script policy placeholder to `false` (the optional script
  is not needed by local OCR). Dependency versions were not upgraded.
- TypeScript check: passed.
- Native server and browser asset production builds: passed.
- Existing business rules/repository tests: 70 passed.
- Existing standard-library Python adapter tests: 8 passed.
- Native HTTP integration suite: **72 checks passed**.

The native checks create an isolated database and real local HTTP server. They
cover owner setup and replay rejection, forged identity-header denial, login,
cross-origin denial, staff creation, permission denial, duplicate retail checkout,
stock movement, restaurant preparation, voice quote/confirm API, anonymous pickup
ordering, staff attribution, route/static serving, data-file exposure denial,
encrypted backup, corrupted-backup rejection, safe restore, session revocation,
restart persistence and recovery into a second installation. Daily report catchup
and automatic encrypted backup creation were also exercised.

The source was recovered after workspace maintenance interrupted development.
The rebuilt native release was rechecked; the 72-check result applies to that
reconstructed version, not just the earlier interrupted work.

These checks do not certify Docker/systemd/Caddy on the user's server, browser
interaction on every device, physical printer output, real phone calls, payment
terminals or delivery-platform integrations. New UI controls have API/build/type
coverage; earlier register screenshots remain examples from the prior release.
Provider SDK installation was interrupted by the environment and is not claimed
as completed. The previous managed Worker release had 68 separate API checks;
those are historical evidence, not the count for this native server build.

## Reproduce

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
python -m unittest discover -s tests -p 'test_*.py'
pnpm run build:server
pnpm run test:server
python scripts/package-server-kits.py
```

The packaging script verifies ZIP integrity and every file's SHA-256. Testing
found no failures in the executed scenarios; it does not prove zero defects.
Use `docs/SERVER_INSTALL.md` and the commercial launch checklist for scope limits.
