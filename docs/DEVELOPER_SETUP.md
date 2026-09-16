> **Server edition 0.3 update:** An independent Node server with owner/staff login, action permissions, encrypted backup/restore and daily summaries is now included. Start with [SERVER_INSTALL.md](SERVER_INSTALL.md). The older managed-host instructions below still describe that separate runtime. Commercial launch gaps remain.

# Developer setup and deployment

## Runtime and source layout

The source uses React, TypeScript, Vinext/Vite, a Cloudflare Worker runtime, D1
storage and a Drizzle migration. It also includes Python voice and printer adapters.
The current production authentication boundary is the private Sites dispatcher.
Do not expose the Worker directly while trusting client-supplied identity headers.

The ZIP is a source distribution, not a Windows executable, APK, AAB, IPA or
one-click hosting installer. Both kits retain both register routes and shared
business logic. `KIT_START_HERE.md` identifies the preferred starting route.

- `kits/` in the maintained repository: separate source distributions, kept outside hosted assets.
- `compiled/` in the ZIP: built Worker, client assets and staged database migration.
- `app/`: routes, two register interfaces, back office and API handlers.
- `lib/`: transaction rules, storage, signed quotes, intake and HTTP validation.
- `db/` and `drizzle/`: schema and published SQL migration.
- `integrations/`: optional external voice and printer adapters.
- `public/ocr/`: OCR runtime, language data and notices.
- `tests/`: deterministic engine, SQLite concurrency and Python adapter tests.
- `docs/`: operator, developer and validation guides.
- `public/Jawa_POS_Deep_Research_and_Release_Review.md`: current research.

## Install and verify

Use Node 22.13 or newer with TypeScript stripping support and the pnpm version
specified by packageManager. Python 3.11 or newer is recommended for the adapters.
An internet connection is needed to install dependencies.

```
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test
python -m unittest discover -s tests -p 'test_*.py' -v
pnpm run build
pnpm run test:api
```

Do not enable optional package installation hooks simply to remove an unrelated
fundraising prompt. The bundled OCR worker and language assets are present.

`pnpm run build` produces a server Worker and client assets. The external Sites
build helper additionally stages hosting metadata and migrations for its managed
archive contract. A native mobile or desktop build is a separate project.

## Local development

A clean source kit defaults to the starter's portable execution profile. Use the
loopback development server only:

```
pnpm dev --host 127.0.0.1
```

The starter includes local sign-in restricted to loopback host and peer addresses.
This is a developer identity, not merchant authentication. It is not included as
a production authentication replacement. The managed execution profile disables
that local mock and uses the platform's supervised private access mechanism.

A local D1 database must contain the migration. After a build has emitted the
Wrangler configuration, the supported local command pattern is:

```
pnpm exec wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_faulty_pandemic.sql
```

Run the initial migration only on a new local database. Do not alter an already
published migration. Confirm the local development server uses the same storage
path before treating CLI data as the server's data. Machine-specific local setup
and interactive browser operation are not verified by this delivery's tests.
Cloudflare documents the database binding argument, local mode and SQL-file flag:
[Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/).

## Hosted deployment

The maintained application is registered as a private Sites project. Source kits
remove its project identifier to prevent accidental attachment of a new deployment
to the maintained project's lifecycle. Logical DB binding configuration remains.
For a new hosted copy, register a new project with D1 and use its approved build,
version and private-deployment flow. Never invent account or project identifiers.

A deployment outside Sites needs a real authentication gateway or an application
session implementation, configured D1, migrations, environment secrets and a
trusted ingress that removes spoofed identity headers. Uploading these files to
static hosting or PHP hosting is insufficient. Keep authentication changes and
payment activation as separately reviewed integration work.

## Secrets and integrations

`.env.example` names variables without values. The server needs its own service
owner identifier and separate voice/printer secrets. The external adapters need
only their relevant service endpoint, scope token and optional platform-issued
access header. LiveKit/model credentials belong in the voice service, not the
browser or ZIP. See the integration guide for the full contract.

The Python core tests use only the standard library. The LiveKit and ESC/POS
runtimes must be installed and pinned in a platform-specific deployment lockfile
after actual SDK import, call and hardware tests. They are not vendored binaries.

## Operational bounds

This version stores one bounded JSON aggregate per authenticated owner with a
revision check. Defaults are 2,000 products, 1,000 accepted orders, 10,000 audited
actions, 100 held carts, 100 tables and an approximately 1.8 MB serialized payload.
No archival reset or import/restore procedure is implemented. Do not increase the
limits and call the result production scaling; normalize the schema first.

One owner, one active shared shift and one store configuration are supported.
Multi-store tenancy, staff roles, terminal-specific drawers and long-term retention
need implementation before a broader deployment. A source export contains code;
it does not contain a database backup or any live merchant records.
