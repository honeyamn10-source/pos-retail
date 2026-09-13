# Jawa POS — customer deployment & integration handbook

Updated 12 September 2026 · Separate Restaurant and Retail server kits

## 1. What you are installing

Jawa is a self-hosted browser POS with separate restaurant and retail interfaces.
One installation belongs to one merchant. The two interfaces share that merchant's
catalogue, stock, cash-shift and transaction engine. To host different customers,
use separate installations, data folders, secrets, domains and backups. Never put
unrelated customers in one installation.

**This is a controlled-pilot release, not a finished commercial POS.** Cash sales,
refunds, item inventory, receiving/OCR review, restaurant kitchen/tables, held retail
carts, own pickup ordering, role-based actions and encrypted backups are implemented.
The phone and printer adapters have passed SDK import checks on Linux/Python 3.12;
actual calls, staff transfers, speech quality and paper output need acceptance tests.
Native delivery connectors, card payments, split tender, priced modifiers, recipe
inventory and long-term transaction storage are unfinished.

Current storage limits: **2,000 products, 1,000 orders, 1.8 MB store payload**;
channel inbox history also has a 500-request limit. Reports do not clear that history.
There is no safe archival reset in this release. Do not sell an unlimited service
or use this as a customer's sole production register before closing these gaps.

## 2. Choose the deployment

| Customer need | Installation |
| --- | --- |
| Try on one computer | Prebuilt Server Kit + Node.js 24 LTS + included launcher |
| Several tills/tablets or remote owner | One dedicated server, HTTPS domain and browser access |
| Public online pickup | HTTPS domain reachable by customers; enable pickup requests in the POS |
| Phone orders | Restaurant server + LiveKit/SIP/model accounts + voice worker |
| Network printer | Supported ESC/POS printer + local Python bridge with persistent journal |
| DoorDash/Uber Eats/Skip | Approved provider/aggregator access and additional connector implementation |

The server must stay powered on and awake while customers or tills use it. Localhost
links work only on the same computer; they do not open on another customer's phone.
A browser disconnected from the server cannot record offline sales. The local POS
core can keep working without internet, but internet-dependent integrations cannot.

## 3. Easiest first installation

1. Install Node.js **24 LTS** from https://nodejs.org/en/download.
2. Download the Restaurant or Retail **Server Kit**, not GitHub's source ZIP.
3. Extract the entire ZIP into a permanent writable folder owned by the operator.
4. Windows: double-click `START_JAWA.cmd`. Mac: open `START_JAWA.command`, or run
   `bash START_JAWA.command` from Terminal in that folder. Linux:
   `bash START_JAWA.sh`.
5. Keep the window open. The launcher checks files/settings, starts the server,
   displays a one-time installation token and attempts to open your browser.
6. Paste the token into the setup form. Choose your owner username and password
   (at least 12 characters). Save the password securely. There is no default password.
7. New restaurant launchers use http://localhost:8787; new retail launchers use
   http://localhost:8788. Always follow the printed address.

Run the same start file each day. Ctrl+C stops the server; the records remain in
`data`. The launcher is not a Windows service and does not start after reboot by itself.
Desktop browser opening and Windows/Mac launch interaction still need device testing.

A configuration-only check is `node scripts/start-local.mjs --check`.

## 4. Set up the merchant in the application

Open **Store control** in the top bar (`/admin`). The owner sees Overview,
Connections, Reports, and Staff & backups. Refresh reads actual store records.
Connection labels say whether the API is configured; they do not certify a live call
or printer. Successful integration requests appear with their latest contact time.

1. **Store settings:** Back office → Store settings (`/manage?view=settings`).
   Enter the store name, timezone, opening/closing times and reporting cutoff.
   Choose closed weekdays. Review the per-product tax settings with the merchant;
   the included example tax is not a universal Canadian tax setup.
2. **Catalogue:** Inventory (`/manage?view=inventory`). Add SKUs, names, prices,
   costs and stock. Restaurant and retail products are distinct by mode.
3. **Photo inventory:** upload a clear supported inventory document or paste text.
   OCR proposes text; review SKU matches and quantities before receiving stock.
   A shelf photograph does not reliably establish item identity or counts.
4. **Staff:** Store control → Staff & backups. Create separate accounts with roles.
   Managers can change store records; cashiers handle sales/orders; kitchen staff
   update preparation/printing. Owner-only controls include staff and backups.
   Action permissions exist; staff record visibility is not confidential per-field
   separation in this release.
5. **Cash shift:** open the Cash drawer tab and enter the counted opening float.
   There is one shared active shift per installation, not separate drawer shifts.
6. Use a test installation to practise a sale, partial refund, stock check,
   kitchen preparation, closing reconciliation, encrypted backup and restore.
   Keep test and customer installations separate. No automatic test-data reset exists.

## 5. Register tabs and order routing

| Task | Restaurant | Retail |
| --- | --- | --- |
| Checkout | `/restaurant?screen=sell` | `/retail?screen=sell` |
| Open orders | `/restaurant?screen=checks` | `/retail?screen=checks` |
| Tables | `/restaurant?screen=tables` | Not applicable |
| Kitchen | `/restaurant?screen=kitchen` | Not applicable |
| Phone orders | `/restaurant?screen=calls` | Restaurant voice adapter only |
| Online inbox | `/restaurant?screen=online` | `/retail?screen=online` |
| Printer queue | `/restaurant?screen=printers` | `/retail?screen=printers` |
| Cash drawer | `/restaurant?screen=cash` | `/retail?screen=cash` |
| Held carts | Not applicable | `/retail?screen=holds` |
| Catalogue | `/restaurant?screen=catalog` | `/retail?screen=catalog` |

Restaurant register/confirmed voice order → saved unpaid order → stock movement →
kitchen batch → pending ticket. Staff advance preparation and settle payment.
Later additions produce their own kitchen batch/ticket. Do not assume printing
means cooking has started.

Online customer request → pending Online orders inbox → staff acceptance rechecks
prices and stock → saved POS order → kitchen/print for restaurant, pickup workflow
for retail. A pending request does not reserve stock. Review expired requests.

## 6. Put one merchant on an HTTPS server

Use a host you control with persistent disk. This is a Node server, not a PHP/static
hosting package. DNS, host access and a domain are required from you/customer.

1. Put the extracted kit in `/opt/jawa` (or adapt every path consistently).
2. Create a dedicated `jawa` OS user. Give it ownership of the installation and
   data directories. Keep port 8787 private; expose only your HTTPS reverse proxy.
3. Create `.env.server` in the kit root, using the example below. Do not use the
   desktop launcher port defaults for a service deployment.

```dotenv
JAWA_HOST=127.0.0.1
JAWA_PORT=8787
JAWA_ORIGIN=https://pos.customer-domain.ca
JAWA_DATA_DIR=/opt/jawa/data
```

4. Point the domain's DNS to the server. Configure Caddy from
   `deploy/Caddyfile.example`, replacing its domain. The proxy destination is
   `127.0.0.1:8787`. Preserve the original Host header. Install Caddy using its
   official instructions: https://caddyserver.com/docs/install.
5. Adapt `deploy/jawa.service.example` with the actual Node executable, user and
   paths. It starts the native server with `.env.server`. Once installed under
   `/etc/systemd/system/jawa.service`, an administrator can run:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now jawa
sudo systemctl status jawa
```

6. Open the exact HTTPS origin. Create the owner using the server's
   `data/setup-token`. Verify login, logout, page loads, and a test order from a
   second device. Reboot the host and verify service/database persistence.
7. Do not run a second Jawa process against the same data folder. Give other
   merchants a separate deployment. Configure off-server backups before handover.

Docker is an alternative using `compose.yaml`; follow SERVER_INSTALL.md. Docker,
Caddy and systemd must be verified on your actual host; they were not run here.
Do not use `docker compose down -v` on a database you need to keep.

## 7. Generate matching integration settings

Once your HTTPS origin is decided, run in the kit root:

```sh
node scripts/configure-integrations.mjs --origin https://pos.customer-domain.ca
```

This creates private files under `data/connection-kit` with separate matching
voice/printer/channel secrets. It carries forward existing `.env.server` fields
and replaces the origin you explicitly provided. It does **not** edit the running
configuration. It refuses to overwrite an existing connection kit. Keep this
folder private; never send it in a customer support ZIP or commit it to GitHub.

1. Review `data/connection-kit/server.env`, including custom port/data settings.
2. Securely back up your current `.env.server`, if present. Copy `server.env` to
   `.env.server` in the installation root. Restart the server.
3. Fill the blank provider/device fields in `voice.env` and `printer.env`.
4. Set `JAWA_PYTHON` in each file to the Python executable in your virtual environment.
   On Linux this may be `/opt/jawa/.jawa-venv/bin/python`; on Windows it ends in
   `.jawa-venv\Scripts\python.exe`.
5. Store control → Connections should show **API configured** for voice/printer.
   A successful `--probe` below adds a latest API contact timestamp.

The generator does not create a phone number, LiveKit project or delivery connector.
Its files use dotenv syntax, not shell commands: load them with the supplied Node
runner; do not `source` customer-supplied files as shell code.

If the workers run on different machines, copy only the relevant scope file through
an approved secure channel, adapt journal/Python paths, and keep each journal on
persistent storage. Do not give printer hardware the voice or marketplace secrets.

## 8. Install the optional integration runtime

Use Python 3.12 on a tested Linux x64 host for the included dependency snapshot:

```sh
python3 -m venv .jawa-venv
.jawa-venv/bin/python -m pip install -r integrations/requirements-linux-py312.lock.txt
.jawa-venv/bin/python integrations/check.py voice --sdk-only
.jawa-venv/bin/python integrations/check.py printer --sdk-only
```

The lock records the resolved Linux/Python 3.12 environment validated here. Other
operating systems need compatible wheels and their own validation; the direct
requirements are in `integrations/requirements.txt`. Installing dependencies needs
internet. LiveKit/SIP/model usage may incur provider charges; set provider budgets.
Never collect payment-card details in the phone agent or its journal.

## 9. Connect inbound telephone ordering

Configure `data/connection-kit/voice.env`:

| Setting | Value you supply |
| --- | --- |
| LIVEKIT_URL | Your project's WebSocket URL |
| LIVEKIT_API_KEY / LIVEKIT_API_SECRET | Project credentials |
| JAWA_STT_MODEL | Speech-to-text model supported by your LiveKit account |
| JAWA_LLM_MODEL | Supported language model ID |
| JAWA_TTS_MODEL | Supported text-to-speech model ID |
| JAWA_TTS_VOICE | Optional voice ID required by your selected TTS provider |
| JAWA_STAFF_PHONE | Real staff transfer number in E.164 format |
| JAWA_AGENT_NAME | `jawa-orders`, matching the dispatch rule |
| JAWA_VOICE_ENDPOINT / TOKEN | Generated matching HTTPS API credentials |
| JAWA_VOICE_JOURNAL | Writable persistent SQLite path; generated for this host |
| JAWA_PYTHON | Virtual environment's Python executable |

Follow LiveKit's official voice and inbound SIP documentation to configure the
carrier or LiveKit phone number, inbound trunk and dispatch rule. The dispatch rule
must send the incoming SIP call to agent name **jawa-orders** (or your configured
name). This agent intentionally accepts SIP callers; it is not a general web chat
entrypoint. Use one active worker owner per call and durable journal volume.

```sh
node scripts/run-integration.mjs voice --check
node scripts/run-integration.mjs voice --probe
node scripts/run-integration.mjs voice
```

`--check` validates local settings/imports. `--probe` performs a read-only authenticated
menu GET; it does not place an order. The final command starts the agent worker and
keeps running. For unattended operation, supervise it as a separate service using
the same environment and persistent journal. The Node runner loads the scope file.

The agent retrieves the menu, quotes exact prices, reads the order back and asks
for confirmation. A confirmed quote creates one unpaid order, reserves item stock,
and queues kitchen/print work. If confirmation times out, the journal retries the
same signed request to avoid a replacement order. Staff handoff pauses automation.

Before connecting public traffic, place real test calls covering: open/closed hours,
out-of-stock items, changed quantities, silence/interruption, declined confirmation,
connection loss during confirmation, duplicate retry, staff transfer failure, accents
and dietary/allergy requests. Compare each accepted call with exactly one POS order
and the correct kitchen batch. The model's boolean is not independent consent proof.
Live calls, handoff and audio quality remain unverified in this environment.

## 10. Connect a kitchen/receipt printer

The provided bridge supports a **network ESC/POS printer** through python-escpos.
It does not auto-discover USB/Bluetooth printers or configure cash-drawer hardware.
Set a stable LAN address and verified device profile in `printer.env`:

- `JAWA_PRINTER_HOST`: printer LAN address, accessible from the bridge host.
- `JAWA_PRINTER_PROFILE`: exact supported python-escpos capability profile.
- `JAWA_PRINTER_ENDPOINT`, `JAWA_PRINTER_TOKEN`: generated server connection.
- `JAWA_PRINT_JOURNAL`: writable persistent SQLite path.
- `JAWA_PYTHON`: virtual environment Python executable.

```sh
node scripts/run-integration.mjs printer --check
node scripts/run-integration.mjs printer --probe
node scripts/run-integration.mjs printer
```

A probe fetches queue status without claiming or printing. Starting the worker can
print pending jobs: use a test merchant first. Keep the printer on the private LAN;
do not forward its port to the internet.

The bridge records an attempt, claims a frozen ticket and submits ESC/POS output.
**Submitted does not mean paper was confirmed.** In Printers, inspect actual paper,
then confirm output. If power/network fails, inspect before creating a labelled
copy; the bridge deliberately avoids blindly repeating uncertain output. Test paper
out, reboot, additions, cancellations, receipt totals and order notes. ASCII text
sanitization is implemented; non-English printer encoding needs model-specific work.
Receipts remain labelled training receipts. One bridge handles the queue; station
routing and multiple-printer orchestration need further implementation.

## 11. Enable your own online ordering

1. Configure the HTTPS customer domain and catalogue.
2. Set store hours and open a cash shift.
3. In Online orders, set an honest pickup estimate and enable requests.
4. Store control → Connections → Online pickup: copy the customer URL.
5. Customer pages are `/order/restaurant` and `/order/retail`; they require no staff
   login on the native server. Staff records remain authenticated.
6. Customer selects products, confirms a pickup name and total, then receives a
   private status receipt. Staff accept in Online orders before stock is reserved.
7. Collect payment at pickup. Online card payments, SMS and delivery dispatch are
   not implemented. Estimates are not reserved capacity slots.

Check from a phone using the public HTTPS URL, including duplicate submission,
closed store, unavailable items, expired requests and price changes. Do not share a
localhost URL or a private customer receipt key in advertising.

## 12. DoorDash, Uber Eats and Skip

There is **no finished native connector** for these providers. The tabs/inbox and
`/api/channel-orders` implement Jawa's normalized intake contract only. Provider
accounts, location IDs and one API key do not complete an integration.

Use `integrations/channels/README.md` for the exact payload and supported limits.
An authorized connector must verify real provider events, map product/location IDs,
handle provider amount components, preserve durable retries, send acceptance/ready/
cancellation updates back, and reconcile external refunds/settlement. Currently
local responses explicitly say `providerUpdateSent: false`.

Do not paste Jawa's URL into a provider webhook field and assume compatibility.
Do not fake provider signatures. Keep the provider's own tablet/order console while
connector work remains unfinished. A reviewed aggregator route may help, but coverage,
partner approval, fees and scopes must be confirmed directly.

## 13. Reports, backup and restore

Store control → Reports offers inclusive custom business-date CSV export. Sales
and refunds follow the configured timezone/cutoff. Platform-collected amounts stay
separate from drawer cash. Daily summaries catch up after restart and update after
late adjustments; they are not immutable accounting closes or settlement records.

Download encrypted backups in Staff & backups using a 16–128-character passphrase.
Store the passphrase separately. Automatic UTC-day backups are in `data/backups`
with their key in `data/backup.key`; protect the key and copy backups off the host.
Keep `.env.server`, connection settings and voice/printer journals in your separate
protected configuration backup: they are not included in the database download.

Recovery into a new empty folder:

```sh
node server/restore.mjs backup.jawabak /secure/passphrase.txt /new/jawa-data
```

Point JAWA_DATA_DIR at that new directory and start one server process. Old sessions
are revoked. Verify stock, orders, refunds, daily totals and cash before resuming.
Never overwrite the only working database. See SERVER_INSTALL.md for details.

## 14. Handover checklist

- [ ] Record the merchant's domain, server location, supported devices and support contact.
- [ ] Owner controls credentials; staff have individual accounts and tested permissions.
- [ ] Register, kitchen, pickup, refunds, stock and closing flow demonstrated to staff.
- [ ] HTTPS and reboot recovery tested on the actual server and second device.
- [ ] Encrypted off-server backup restored into a separate test installation.
- [ ] Every activated phone/printer feature passed the real-call/device checks above.
- [ ] Original provider consoles remain available for unfinished marketplace connectors.
- [ ] Storage limits and all unfinished commercial features disclosed to the merchant.
- [ ] Agree on a pilot scope and fallback register before accepting real traffic.

## 15. Official integration references

- Node.js installer: https://nodejs.org/en/download
- Caddy HTTPS proxy: https://caddyserver.com/docs/quick-starts/reverse-proxy
- LiveKit voice quickstart: https://docs.livekit.io/agents/start/voice-ai/
- LiveKit inbound calling: https://docs.livekit.io/telephony/accepting-calls/
- python-escpos printers: https://python-escpos.readthedocs.io/en/latest/user/printers.html
- DoorDash Marketplace: https://developer.doordash.com/en-US/docs/marketplace/overview/
- Uber Eats onboarding: https://developer.uber.com/docs/eats/guides/getting-started
- Deliverect integration catalogue: https://help.deliverect.com/en/

Feature readiness is based on this repository's code and executed tests, not on a
provider's feature list. See SERVER_VALIDATION.md for the precise verification scope.
