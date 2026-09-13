# Server release validation — 11 September 2026

## Current release 0.4 — 12 September 2026

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
