![Jawa Retail — project cover](https://github.com/honeyamn10-source/honeyamn10-source/blob/main/assets/pos-retail.svg?raw=true)

# Jawa Retail

A self-hosted retail register for cash sales, held carts, inventory, and back-office reporting.

**Edition:** Installable server · **Version:** 0.4 · **Stage:** Controlled pilot

[Deployment handbook](docs/CUSTOMER_DEPLOYMENT.md) · [Quick setup](docs/EASY_SETUP.md) · [Validation record](docs/SERVER_VALIDATION.md) · [Release readiness](docs/COMMERCIAL_LAUNCH_CHECKLIST.md)

## Version 0.4: start here

- [Customer deployment and integration handbook](docs/CUSTOMER_DEPLOYMENT.md)
- [Quick local setup](docs/EASY_SETUP.md)

Open **Store control** after signing in for sales, queues, connection readiness,
custom business-date CSV reports, staff and backups. Prebuilt kits include desktop
launchers. Voice/printer connection helpers and a tested Linux/Python 3.12 SDK
snapshot are included; real calls and hardware still need acceptance testing.

## Start

Install Node.js 24 LTS and pnpm 11.19.0, then:

```sh
pnpm install --frozen-lockfile
pnpm run build:server
pnpm run start:server
```

Open http://localhost:8787. Use `data/setup-token` to create your owner account.
No default password or ChatGPT login is required. Data persists on your server.

- [Installation, domain setup and recovery](docs/SERVER_INSTALL.md)
- [GitHub component assessment](docs/REPOSITORY_RESEARCH.md)
- [Executed validation](docs/SERVER_VALIDATION.md)
- [Commercial release gaps](docs/COMMERCIAL_LAUNCH_CHECKLIST.md)

**Status: installable controlled pilot, not a completed commercial POS.**
Cash sales/returns, inventory, tables, kitchen, online pickup requests, staff action
permissions and encrypted backup/recovery work in the tested scenarios. Live card
payments, native DoorDash/Uber/Skip connections, physical printer acceptance and
real phone-call activation remain unfinished or unverified. The current bounded
store supports at most 1,000 orders; long-term storage is a remaining release gate.

The restaurant register remains available on `/restaurant`; this repository defaults to
`/retail`. Both use the same transaction engine. For a shared store use one
server installation, not two independent databases.

Large OCR assets are reproduced during build from locked packages. No secrets,
merchant database, node_modules or private hosting project identifier are included.
