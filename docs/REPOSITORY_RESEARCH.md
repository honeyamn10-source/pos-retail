# GitHub component assessment — 11 September 2026

Selection is based on fit with Jawa, source availability, licence, operational
burden and testability. No repository is universally the best or a guarantee of
commercial readiness. Repositories were inspected through the GitHub connector;
metadata and selected README/licence files were checked. They were not all
installed or benchmarked.

| Area | Candidate and primary source | Decision for Jawa |
|---|---|---|
| ERP, purchasing, inventory, accounts | [ERPNext](https://github.com/frappe/erpnext), GPL-3.0 | Useful functional benchmark; a full Frappe stack, not a drop-in module. Not copied or integrated. |
| Full business suite and POS | [Odoo Community](https://github.com/odoo/odoo), [LGPLv3 licence](https://github.com/odoo/odoo/blob/19.0/LICENSE) | Useful alternative platform; adopting it is a migration project. Not integrated. |
| Retail POS | [Open Source POS](https://github.com/opensourcepos/opensourcepos), [licence](https://github.com/opensourcepos/opensourcepos/blob/master/LICENSE) | PHP/CodeIgniter/MySQL alternative. Licence contains additional visible footer requirements. Not copied. |
| Telephone voice agent | [LiveKit Agents](https://github.com/livekit/agents), Apache-2.0 | Retained as the existing Python agent integration. SIP, model configuration and real calls still required. |
| Alternative voice pipeline | [Pipecat](https://github.com/pipecat-ai/pipecat), BSD-2-Clause | Credible alternative; adding a second framework would duplicate the current integration. Not installed. |
| Local inventory image OCR | [Tesseract.js](https://github.com/naptha/tesseract.js), Apache-2.0 | Used now. Worker, WASM and English data stay local; review SKU/count extraction before receiving stock. |
| Structured document OCR | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR), Apache-2.0 | Candidate for complex invoices; Python/model deployment and document evaluation required. Not installed. |
| Receipt and kitchen printers | [python-escpos](https://github.com/python-escpos/python-escpos), MIT | Existing adapter retained; match the exact printer profile and test uncertain outcomes on hardware. |
| HTTPS server | [Caddy](https://github.com/caddyserver/caddy), Apache-2.0 | Reverse-proxy configuration supplied. Not installed or activated on the user's server. |
| Off-server backups | [restic](https://github.com/restic/restic), BSD-2-Clause | Operational option for copying encrypted snapshots to independent storage. Core backup/restore uses Node crypto and SQLite. |
| Server database | [Node SQLite documentation](https://nodejs.org/api/sqlite.html) | Native SQLite with WAL, FULL synchronization and compare-and-swap storage. Node 24 LTS required for delivered server kits. Aggregate scaling limits remain. |
| User interface | Existing React and shadcn primitives | Retained; standalone login/admin added, large register screens loaded on demand. |
| Payment terminals | Processor-supported SDK and terminal | No universal GitHub POS repository can activate merchant acquiring or certify a device. Processor integration remains open. |
| Delivery platforms | [DoorDash](https://developer.doordash.com/en-US/docs/marketplace/overview/), [Uber Eats](https://developer.uber.com/docs/eats/guides/getting-started), [Deliverect integration directory](https://help.deliverect.com/en/) | Existing normalized contract is not a native connector. Approved access, mapping, authenticated events, cancellations and settlement still required. |

ERPNext, LiveKit, Pipecat, Caddy and restic were not archived at inspection. Odoo's
repository metadata used NOASSERTION for licence, so its actual licence text was
read. Open Source POS also required direct licence inspection. Repository popularity
and recent pushes were not treated as proof of security or business suitability.

## Use of selected components

The existing Tesseract implementation is reused and its asset build is reproducible
from the lockfile. The existing LiveKit and ESC/POS adapters retain the same
idempotent order/print contracts. Their runtime dependency installation was
interrupted by the environment; this release does not claim new SDK import or
real-call/device certification. The standard-library adapter tests and actual
Jawa service API tests are separate evidence.

Caddy's [official reverse-proxy guide](https://caddyserver.com/docs/quick-starts/reverse-proxy)
supports the included deployment template. To protect automatic snapshots with
restic, configure an independent repository and run `restic backup data/backups`;
store `data/backup.key` separately, protect the restic password and rehearse
`restic restore` followed by Jawa's recovery command. Remote credentials and a
retention schedule must be chosen by the server operator. No remote backup was
configured by this delivery.

## Unresolved work cannot be replaced with a repository list

Long-term transaction normalization, tax edge cases, terminal payment lifecycle,
recipes and priced modifiers, split checks/tender, multi-location drawers,
disconnected terminal synchronization and real hardware/provider acceptance all
need implementation or real-world evidence. The installable server is a useful
delivery step, not proof that these tasks are finished.
