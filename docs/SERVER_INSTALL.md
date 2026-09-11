# Install Jawa on your server

Jawa Server 0.3 is an installable **controlled pilot**, not a completed commercial
POS. It runs both register interfaces on one server; `product.json` chooses the
restaurant or retail entry point. No ChatGPT account is needed for this edition.

## Fast start from a prebuilt Server Kit

Install Node.js 24 LTS. Extract the kit and open a terminal in its folder:

```sh
node server-dist/main.js
```

Open http://localhost:8787. Read `data/setup-token` on the server and paste it
into the first-run form. Choose your owner username and a password of at least
12 characters. The token is deleted after setup. There is no default password.
Create products in Inventory, set store hours and open a cash shift to sell.

The prebuilt core needs no package install, cloud database or model API key.
Voice and physical printing are optional separate services. Use a modern browser.

## Build from either GitHub repository

Node.js 24 LTS, pnpm 11.19.0 and internet for dependency installation are required.
The exact dependency versions remain in `pnpm-lock.yaml`.

```sh
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
pnpm run build:server
pnpm run start:server
```

The build recreates OCR workers and language data from the locked dependencies.
Those large generated assets are included in downloadable kits and regenerated
for a source checkout. This is not a static/PHP hosting package, APK or IPA.

## Configure a domain and keep the app running

Copy `deploy/server.env.example` to `.env.server`. Set `JAWA_ORIGIN` to your exact
HTTPS domain, including a nonstandard port if used. Install Caddy on the server,
point domain DNS at it, and adapt `deploy/Caddyfile.example`. Caddy handles HTTPS
and proxies to the private Node port. Keep port 8787 blocked from public access.
The server rejects other Host headers; do not override Host in the proxy.

For a Node installation, use `deploy/jawa.service.example` after creating the
dedicated `jawa` OS account and writable `/opt/jawa/data` directory. Adapt paths
to your installed Node executable. Run only one Jawa process per data directory.

Alternatively, with Docker Compose installed:

```sh
cp deploy/server.env.example .env.server
docker compose up --build -d
docker compose exec jawa cat /data/setup-token
```

The named volume stores data across container upgrades. **Do not run
`docker compose down -v` on an installation containing records.** The Node HTTP
path was tested here; Docker, systemd and Caddy deployment require verification on
your host. No domain, DNS or paid hosting was provisioned.

## Operating and staff access

- `/restaurant`: restaurant register, tables, kitchen, calls and online inbox.
- `/retail`: retail register, held carts, cash and online inbox.
- `/manage`: inventory, receiving, returns, reports and store hours.
- `/admin`: staff accounts, password change, backups and daily summaries.
- `/order/restaurant` and `/order/retail`: public pickup request pages.

The owner manages accounts and backups. Managers can change store records.
Cashiers handle sales and orders, but cannot change stock/settings, refund or
control cash shifts. Kitchen staff update preparation and printing. Roles enforce
**action permissions**; staff can currently read shared store records. They do
not provide confidential per-field or per-department data separation.

Sessions expire after eight hours. Disabling staff or changing a password revokes
their sessions. The server ignores incoming ChatGPT identity headers. Login and
public ordering have basic persistent rate limits. Behind the supplied proxy,
limits share the proxy's address; per-customer edge limits remain a launch task.

## Backup and recovery

Download an AES-256-GCM encrypted database backup from Account & server. Choose
a passphrase of 16–128 characters and keep it separately. A forgotten passphrase
cannot be recovered. Backups contain staff password hashes and business records.

An automatic encrypted snapshot is created each UTC day while the server is
running. Files are in `data/backups`; the key is `data/backup.key`. Keep a secure
copy of that key separate from the backups. Same-disk copies cannot protect
against losing the server. Copy encrypted snapshots to a separate device or
remote restic repository; see `docs/REPOSITORY_RESEARCH.md`.

To recover into a **new, empty** data directory:

```sh
node server/restore.mjs jawa-backup.jawabak /secure/passphrase.txt /new/jawa-data
JAWA_DATA_DIR=/new/jawa-data node --env-file-if-exists=.env.server server-dist/main.js
```

The passphrase file contains only the passphrase (a trailing newline is allowed).
Recovery verifies authenticated encryption, database integrity and schema, refuses
to overwrite an existing installation and deletes old login sessions. Sign in
again and reconcile products, orders, refunds and cash balances before use.
Automatic backup files do not include `.env.server`, printer journals or voice
journals; protect those separately. Backups are not automatically pruned.

## Scope and remaining limits

Cash sales/refunds, item stock, receiving, kitchen workflows, quote-confirmed
phone-order API and pickup-order handling are implemented. Daily summaries run
each minute, catch up after restart and use the configured business-day cutoff.
They update after late adjustments; they are not immutable accounting closes.
Configure the cutoff to match the desired reporting boundary, independently of
opening hours. No scheduled email delivery is configured.

The aggregate still limits an installation to 2,000 products, 1,000 orders and
approximately 1.8 MB of store data. No archival reset is provided. Normalized
long-term transaction storage is unfinished: do not sell this as unlimited.
One merchant, one store configuration and one shared active cash shift are
supported. Local server operation can survive loss of the external internet,
but disconnected terminals cannot create offline sales.

Card terminals, online card payments, native DoorDash/Uber/Skip connectors,
ingredient recipes, split tender, priced modifiers, discounts/variants, multi-store
operation and complete accounting reconciliation remain unfinished. Telephone
numbers/models require accounts and a real-call test. Printer models require a
physical test. See `COMMERCIAL_LAUNCH_CHECKLIST.md` before selling the product.
