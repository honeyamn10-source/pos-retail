# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < 0.5   | :x:                |

Security fixes are applied to the latest commit on `main`. This is a self-hosted, installable server — keep your deployments updated.

## Reporting a vulnerability

Please **do not open a public issue** for security vulnerabilities.

Email the maintainer privately with the subject `[pos-retail] Security` and include:

- Description of the vulnerability and potential impact
- Affected endpoint, module, or data path
- Reproduction steps (fictional test data only — never customer or merchant data)
- Suggested fix, if known

You will receive an acknowledgement within 5 business days and a remediation plan or a written explanation if the finding is not a vulnerability.

## What we take seriously

- Owner account setup tokens and session/auth handling (no default passwords)
- SQLite transaction journal integrity for sales, refunds, held carts, and stock movements
- Encrypted backup/recovery material
- Staff action permissions and audit boundaries
- Secrets: none are stored in the repository; `data/` and environment values stay out of Git

## Deployment guidance

Follow [docs/SERVER_INSTALL.md](docs/SERVER_INSTALL.md) and [docs/CUSTOMER_DEPLOYMENT.md](docs/CUSTOMER_DEPLOYMENT.md). Validate card payments, printers, and delivery integrations before relying on them — see [docs/COMMERCIAL_LAUNCH_CHECKLIST.md](docs/COMMERCIAL_LAUNCH_CHECKLIST.md) for open release gates.