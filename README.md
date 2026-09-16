<p align="center">
  <img src="https://github.com/honeyamn10-source/honeyamn10-source/blob/main/assets/pos-retail.svg?raw=true" alt="Jawa Retail" width="100%" />
</p>

<h1 align="center">Jawa Retail</h1>

<p align="center">
  <b>A self-hosted retail register.</b>
  <br />
  <em>Cash sales, held carts, inventory, and back-office reporting — on your own server.</em>
</p>

<p align="center">
  <a href="https://github.com/honeyamn10-source/pos-retail/actions/workflows/server-kits.yml"><img src="https://github.com/honeyamn10-source/pos-retail/actions/workflows/server-kits.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <a href="product.json"><img src="https://img.shields.io/badge/version-0.5-blue.svg" alt="Version: 0.5"></a>
  <a href="https://github.com/honeyamn10-source/pos-retail/blob/main/docs/SERVER_VALIDATION.md"><img src="https://img.shields.io/badge/stage-controlled%20pilot-important.svg" alt="Stage: Controlled pilot"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/next.js-15-000000.svg" alt="Next.js 15"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/typescript-5-3178C6.svg" alt="TypeScript"></a>
</p>

---

**Edition:** Installable server · **Stage:** Controlled pilot

Self-host means your data stays yours: no cloud subscription, no forced login, no merchant database on a third-party server. Sales, held carts, inventory, and backups persist on a server you control.

> **Status: installable controlled pilot, not a completed commercial POS.** Cash sales/returns, held carts, inventory, and back-office reporting work in the tested scenarios. Live card payments and physical printer acceptance remain unfinished or unverified. The current bounded store supports at most 1,000 orders; long-term storage is a remaining release gate.

## 🚀 Quick start

Install **Node.js 24 LTS** and **pnpm 11.19.0**, then:

```sh
pnpm install --frozen-lockfile
pnpm run build:server
pnpm run start:server
```

Open [http://localhost:8787](http://localhost:8787). Use `data/setup-token` to create your owner account — no default password or ChatGPT login is required. Data persists on your server.

## ✨ Features

- 💵 **Cash sales & returns** with a SQLite transaction journal committed atomically with stock movements
- 🛒 **Held carts** for pending purchases
- 📦 **Inventory** with automatic stock updates
- 👥 **Staff action permissions** with per-role controls
- 🔍 **Owner-only searchable order history** (new in 0.5)
- 📊 **Custom business-date CSV reports**
- 💾 **Encrypted backup & recovery** including the journal
- 🖥️ **Desktop launchers** for prebuilt kits

The restaurant register remains available on `/restaurant`; this repository defaults to `/retail`. Both use the same transaction engine. For a shared store use one server installation, not two independent databases.

## 📖 Getting started

| Guide | Covers |
| --- | --- |
| [Deployment handbook](docs/CUSTOMER_DEPLOYMENT.md) | Customer deployment and integration |
| [Quick setup](docs/EASY_SETUP.md) | Fast local setup |
| [Server installation](docs/SERVER_INSTALL.md) | Installation, domain setup and recovery |
| [Server validation](docs/SERVER_VALIDATION.md) | Executed validation record |
| [Commercial launch checklist](docs/COMMERCIAL_LAUNCH_CHECKLIST.md) | Release readiness and open gates |

## 📁 Repository layout

```
pos-retail/
├── app/                 # Next.js application routes
├── components/          # UI components
├── server/              # Server / API logic
├── db/ + drizzle/       # Database schema and migrations
├── docs/                # Deployment, validation and research docs
├── deploy/              # Deployment configuration
├── public/              # Static assets
├── scripts/             # Build & operational helpers
├── tests/               # Test suite
├── START_JAWA.*         # Desktop launcher scripts
└── docs/                # Documentation
```

## 🛡️ Security

- Owner account created via a secure setup token — no default passwords
- Sessions and staff permissions enforced server-side
- No secrets, merchant database, `node_modules`, or private hosting identifiers in this repository
- Large OCR assets are reproduced during build from locked packages
- See [SECURITY.md](SECURITY.md) for the vulnerability policy

## 🤝 Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request. Third-party components carry their own licenses — see [docs/THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).

## 📄 License

[MIT](LICENSE) © 2026 [Bittu Sharma](https://github.com/honeyamn10-source). Third-party assets and components retain their original licenses and notices.