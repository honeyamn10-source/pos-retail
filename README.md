# Jawa Retail — installable server edition

Separate retail register with shared inventory, held carts and back office.

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
