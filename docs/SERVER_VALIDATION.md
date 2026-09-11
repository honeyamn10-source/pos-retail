# Server release validation — 11 September 2026

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
