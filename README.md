![Jawa Retail — The essentials of a busy shop](docs/assets/cover.svg)

# Jawa Retail

<!-- repo-badges:start -->
<div align="center">

[![Stars](https://img.shields.io/github/stars/honeyamn10-source/pos-retail?style=flat-square&logo=github&label=Stars)](https://github.com/honeyamn10-source/pos-retail/stargazers)
[![Forks](https://img.shields.io/github/forks/honeyamn10-source/pos-retail?style=flat-square&logo=github&label=Forks)](https://github.com/honeyamn10-source/pos-retail/forks)
[![Issues](https://img.shields.io/github/issues/honeyamn10-source/pos-retail?style=flat-square&logo=github&label=Issues)](https://github.com/honeyamn10-source/pos-retail/issues)
[![Last Commit](https://img.shields.io/github/last-commit/honeyamn10-source/pos-retail?style=flat-square&logo=github&label=Last%20Commit)](https://github.com/honeyamn10-source/pos-retail/commits/main)

[Repository](https://github.com/honeyamn10-source/pos-retail) · [Issues](https://github.com/honeyamn10-source/pos-retail/issues) · [Pull Requests](https://github.com/honeyamn10-source/pos-retail/pulls) · [Actions](https://github.com/honeyamn10-source/pos-retail/actions)

</div>
<!-- repo-badges:end -->

<!-- professional-meta:start -->
<div align="center">

[![ci](https://github.com/honeyamn10-source/pos-retail/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/honeyamn10-source/pos-retail/actions/workflows/ci.yml) [![codeql](https://github.com/honeyamn10-source/pos-retail/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/honeyamn10-source/pos-retail/actions/workflows/codeql.yml) [![server kits](https://github.com/honeyamn10-source/pos-retail/actions/workflows/server-kits.yml/badge.svg?branch=main)](https://github.com/honeyamn10-source/pos-retail/actions/workflows/server-kits.yml)

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)

[Documentation](docs) · [Integrations](integrations) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

</div>
<!-- professional-meta:end -->


A self-hosted retail cash register for SKU lookup, held carts, stock receiving, returns and store reports.

[Project website](https://honeyamn10-source.github.io/pos-retail/) · [Source](https://github.com/honeyamn10-source/pos-retail) · [Build results](https://github.com/honeyamn10-source/pos-retail/actions) · [Issues](https://github.com/honeyamn10-source/pos-retail/issues)

<!-- architecture-showcase:start -->
## Architecture

```mermaid
flowchart LR
    A[Retail UI] --> B[Next.js application]
    B --> C[Standalone Node server / managed Worker]
    C --> D[(Store database)]
    C --> E[SKU, cart, stock and reporting workflows]
    C --> F[Integration adapters]
    F --> G[External services]
```

The repository supports separate deployment paths; payment and hardware integrations require their own live configuration and validation.
<!-- architecture-showcase:end -->

## What it does

- **Build a basket.** Scan exact SKUs or choose products and review quantities and configured tax.
- **Hold and recall.** Save carts for later; current prices and stock apply when completing a sale.
- **Close the day.** Reconcile cash shifts, inspect reports and back up the store.

## Start from source

Node.js 24 or later. Open http://localhost:8787 and use the local setup token to create the owner account.

```bash
git clone https://github.com/honeyamn10-source/pos-retail.git
cd pos-retail
corepack enable
corepack prepare pnpm@11.19.0 --activate
pnpm install --frozen-lockfile
pnpm run build:server
pnpm run start:server
```

The standalone Node server and the managed Worker build are separate deployment paths. The commands above select the standalone server. Follow [SERVER_INSTALL.md](docs/SERVER_INSTALL.md) for setup tokens, staff roles, backups and domain configuration. This repository includes both restaurant and retail routes; use `/retail` for this edition.

## Check your changes

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm run test:server
```

These are the repository’s checks, not a claim of complete test coverage. See [GitHub Actions](https://github.com/honeyamn10-source/pos-retail/actions) for the result on a specific commit.

## Scope and limitations

Development/training release. Card payments, live phone service and physical printers require separate integrations and validation. Held carts do not reserve stock.

## Find your way around

| Source | Purpose |
| --- | --- |
| [`docs/SERVER_INSTALL.md`](docs/SERVER_INSTALL.md) | Install the server |
| [`docs/START_HERE.md`](docs/START_HERE.md) | Operator guide |
| [`docs/COMMERCIAL_LAUNCH_CHECKLIST.md`](docs/COMMERCIAL_LAUNCH_CHECKLIST.md) | Launch checklist |

## Contributing

Include the command you ran, your runtime version, a minimal reproduction and the expected result in an issue. Remove credentials and personal data from logs. Follow [CONTRIBUTING.md](CONTRIBUTING.md) when proposing a change.

## License

MIT — see [LICENSE](LICENSE). Third-party dependencies retain their own licenses.
