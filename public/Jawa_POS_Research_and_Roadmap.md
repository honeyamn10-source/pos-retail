# Jawa POS — research, architecture and build roadmap

Prepared for Bittu Sharma · Canada-first · 10 September 2026

## Product decision

Build one shared commerce platform with separate retail and restaurant interfaces.
The first objective is trustworthy order, money and inventory records. Voice,
image intake and reporting must use those same records. They must not become
parallel systems with their own conflicting prices or stock counts.

“Number one” is an ambition, not a verified ranking. This research compares major
relevant product families and reusable projects; it is not an exhaustive census
of every POS. Vendor claims have not been independently benchmarked. No interviews,
merchant pilots, live telephone trials or physical hardware tests have occurred.

The original 15-page Retail and Restaurant POS Research and Build Plan remains
the broader application specification. This document extends it with voice,
photo intake, printer reliability and the actual first implementation.

## Competitors and lessons for Jawa

| Benchmark | Relevant advertised strengths | Jawa requirement drawn from it |
|---|---|---|
| [Square Retail](https://squareup.com/ca/en/point-of-sale/retail) | Inventory, returns, purchasing, barcode tools and online sales | Quick setup, clear stock controls, complete cost comparison |
| [Square Restaurants](https://squareup.com/ca/en/point-of-sale/restaurants) | Restaurant checkout and connected kitchen/service tools | A dedicated restaurant workflow instead of a retail checkout with new labels |
| [Shopify POS](https://www.shopify.com/ca/pos) | Connected online/in-person retail operations | Catalogue, customers and stock need a consistent cross-channel model |
| [Lightspeed Retail](https://www.lightspeedhq.com/pos/retail/) | Retail inventory and commerce operations | Purchasing, variants and reporting belong in the wider package |
| [Lightspeed Restaurant](https://www.lightspeedhq.com/pos/restaurant/) | Restaurant service, kitchen and operating tools | Kitchen acknowledgement and ingredient-level inventory matter |
| [Toast Canada](https://pos.toasttab.com/ca) | Restaurant POS, handheld and related applications | Evaluate the installed hardware-and-software package, not checkout alone |
| [TouchBistro](https://www.touchbistro.com/) | Restaurant POS and management suite | Tables, service flow and staff usability require restaurant-specific testing |
| [Clover Canada](https://www.clover.com/ca) | Payment hardware, POS and connected business tools | Payment-provider and hardware contracts are part of product fit |
| [ERPNext](https://github.com/frappe/erpnext) | Accounting, purchasing, stock and order management | Learn from mature ledgers; avoid inventing a weak accounting subsystem |
| [Odoo](https://github.com/odoo/odoo) | Broad modular business application platform | Keep shared services modular and assess edition-specific requirements |

These products already cover substantial parts of the proposed package. Our
potential advantage is a simpler connected workflow: photographed stock sheets,
validated phone orders, visible kitchen/printer failures, and understandable
closing reports. Whether merchants value this enough to switch remains a hypothesis.

Do not advertise the cheapest package without written Canadian quotes covering
registers, locations, KDS, support, onboarding, processing, contracts, telephone
minutes and hardware. No current subscription-price promise is made here.

## GitHub selections

| Project | Decision | Reason and boundary |
|---|---|---|
| [LiveKit Agents](https://github.com/livekit/agents) | Preferred voice foundation | Server-based voice agents, tools and telephony integration; Apache-2.0 framework. Turn-detection models have a separate model licence. |
| [Pipecat](https://github.com/pipecat-ai/pipecat) | Alternative for evaluation | Provider-flexible real-time voice pipeline; BSD-2-Clause. Evaluate with the same restaurant call scripts. |
| [Tesseract.js](https://github.com/naptha/tesseract.js) | Included in this build | Browser-side text extraction, Apache-2.0; appropriate for clear printed SKU/quantity sheets. |
| [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Next OCR evaluation | Candidate for more complex documents and structured extraction; assess model assets and deployment resources separately. |
| [python-escpos](https://github.com/python-escpos/python-escpos) | Printer bridge foundation | ESC/POS text and printer commands, MIT; actual printer profiles and transport tests remain necessary. |
| [QZ Tray](https://github.com/qzind/tray) | Desktop alternative | Browser-to-device bridge. Review signing, distribution and commercial-support terms before adoption. |
| [ERPNext](https://github.com/frappe/erpnext) | Integration/reference candidate | Mature stock and financial workflows, GPL-3.0. No ERPNext code has been copied into this pilot. |
| [URY](https://github.com/ury-erp/ury) | Restaurant reference candidate | ERPNext-based restaurant system, AGPL-3.0; repository warns of active development and compatibility changes. |
| [Odoo](https://github.com/odoo/odoo) | Alternative suite evaluation | Evaluate modules, edition boundaries, licences and deployment cost at a selected revision. |

This is a fit-based shortlist, not an objective “best GitHub repository” ranking.
Popularity is not evidence of correctness. Dependency lockfiles, licences,
security notices, release maintenance and integration tests must be reviewed
before each commercial release. Third-party product names and source code are
not Jawa's intellectual property.

## What version 0.1 actually implements

| Area | Implemented | Not yet a production capability |
|---|---|---|
| Access | Private Site and server-enforced per-user record ownership | Merchant onboarding, shared staff accounts, role permissions, support access |
| Retail | Catalogue/SKU search, quantities, cash sales, original-price partial refunds | Card terminals, discounts, exchange settlement, weighted goods, split tenders |
| Restaurant | Separate menu, table/pickup text, order notes, unpaid orders and later cash settlement | Floor-plan management, seats, structured modifiers, courses, split checks, tips |
| Kitchen | New/preparing/ready/served stages, shared cloud records, 10-second refresh | Local-network outage operation, station routing, amendments and recall |
| Stock | Opening quantities, deductions at order acceptance, adjustments, receiving, movement history | Recipes, ingredient yields, lots/expiry, purchase orders, transfers, valuation methods |
| Returns | Original line prices/taxes, quantity caps, optional restock, cash refund ledger | Actual movement of electronic funds or payment-provider refund integration |
| Reports | Business-date range, net/gross/refunds/tax/cash, CSV, shift cash reconciliation | Accounting statements, scheduled delivery, audited tax reporting |
| Hours | Store time zone, daily opening/closing, closed weekdays, reporting cutoff | Holiday exceptions, multiple daily intervals, scheduled background report jobs |
| Images | Local text OCR, editable text, strict SKU/quantity review and approved stock receipt | Recognition of every product from shelf photos, hidden quantities, automatic new-SKU creation |
| Phone | Assisted text intake in UI; LiveKit adapter source; signed quote/confirm API foundation | Connected number, live voice service, attended transfer, multilingual call validation |
| Printing | Browser receipt/ticket print, durable queue, manual paper confirmation; bridge source | Connected physical printer, unattended production printing and cancellation amendments |

Sample catalogue loading is explicit and creates no fabricated sales. All stored
transactions in this release are training records. The UI identifies live-service
gaps; it must not be used as a merchant production register yet.

## Shared architecture and why the pilot differs from the final system

The cloud pilot uses a React interface and server routes with a durable SQLite/D1
store aggregate per authenticated owner. Server-side commands calculate totals
and validate inventory. A compare-and-swap revision updates the order, stock
movement, print job and operation receipt together. Conflicting requests retry
against current state. Reusing the same operation ID with changed content fails.

The aggregate is deliberately bounded: at most 1,000 orders, 2,000 products,
10,000 audit actions and an approximately 1.8 MB payload ceiling. It is convenient
for inspecting a coherent first implementation; it is not the final architecture
for a busy chain. Split durable order, line, payment, stock, shift, outbox and
audit records into relational tables with tenant/location indexes before scaling.

The production target remains the earlier plan's store hub plus local
transactional storage and central backend. PostgreSQL is a reasonable target for
the central ledger, with device SQLite and an outbox for offline coordination.
This pilot does not implement the hub and does not promise offline checkout.

Current money is stored as integer cents. Posted orders snapshot descriptions,
price, unit cost and configured tax rate. Partial refunds allocate the original
rounded line tax cumulatively, so refunding all units reverses exactly that tax.
Unpaid restaurant orders consume sellable portions at acceptance. Cancellation
before preparation restores those portions; after preparation it leaves them
consumed. Ingredient consumption and explicit waste reporting are future work.

## Voice call workflow

1. An inbound SIP call reaches the deployed LiveKit agent. Introduce it as an AI
   assistant. Apply the agreed privacy notice before any optional recording.
2. Fetch the approved store menu, opening state and available quantities.
3. Gather items, quantities and pickup name. Unknown products or dietary-safety
   questions go to staff; the agent must not invent a substitution or assurance.
4. Request a server quote. Prices and taxes come from the POS, not the language
   model. The signed quote binds store owner, call, operation and expiry.
5. Read back the order and total, and obtain explicit customer agreement. Changes
   invalidate the prior readback and require a new quote.
6. Submit confirmation. The server rechecks stock, hours, open shift, total and
   duplicate call ID. Record one unpaid order with kitchen state and print job.
7. Tell the caller the returned order number. Distinguish order accepted from
   kitchen acknowledged, ready for pickup, paid and physically printed.

The source implementation covers deterministic menu/quote/confirm foundations.
It has not placed a call. The private Site's sign-in also prevents an ordinary
external service token from reaching its routes. Provision approved service
ingress or a production merchant backend with the same database; do not weaken
the private access policy or reuse browser credentials to work around it.

Before activation: number ownership, SIP carrier, agent hosting, chosen speech
and language models, staff transfer destination, pickup capacity, rate limits,
durable call state, retry policy and a budget cap must be configured. A model's
confirmation flag is not independent proof of consent; evaluate the actual
conversation/readback behaviour. Test noise, accents, interruptions, corrections,
silence, sold-out items, disconnects, repeat confirmation and provider outage.

[LiveKit's telephony documentation](https://docs.livekit.io/telephony/accepting-calls/)
describes inbound call setup. GitHub code does not provide free phone numbers,
carrier minutes, hosted compute or model inference.

## Photo-to-inventory workflow

Start with clear invoices/count sheets containing known SKUs and quantities.
Extract text locally, display it for correction, and convert only unambiguous
rows. Unknown SKUs, duplicate rows or extra columns are rejected with a line-level
message rather than silently ignored. Approved receiving adds quantities;
physical stocktaking uses a separate replacement count with a reason.

The current source image stays in its browser tab. Only approved stock changes
are saved. A clean two-row synthetic sheet was read correctly. That is a smoke
test, not an accuracy study on real merchant invoices. Build a labelled sample
set from permitted merchant documents before claiming an accuracy percentage.

Next: invoice-table extraction, supplier/SKU matching, pack-to-unit conversion,
duplicate-invoice detection, confidence by field and evidence attachments.
Unknown prices, taxes, quantities or pack sizes must remain unknown until reviewed.
A shelf picture cannot prove stock behind visible products or in a back room.

## Printer and kitchen delivery

One accepted order creates one durable print job. A local bridge claims the job
before sending it to its configured printer. The bridge writes a local journal
before transport and never automatically repeats an uncertain submission. A
successful socket write means submitted, not paper printed. Staff can confirm
paper output in the POS. A crash or paper jam must lead to an explicit operator
decision; reprints require a visible reprint label in the commercial version.

The bridge source strips control characters from order text. It currently uses
ASCII output and an operator-configured ESC/POS profile. Test paper-out, cutter
failure, unplugged cable, printer reboot, queue recovery, two bridges competing
for a job, duplicate delivery and cancellation during printing. Add kitchen
station routing and amendment/cancel tickets before automatic restaurant use.

## Opening, closing and reports

Store time zone, opening time, closing time and closed weekdays are configurable.
Overnight hours belong to the day service opened. The reporting cutoff separately
defines the business date, so a sale at 1 a.m. can belong to the previous service
day. Historical sale/refund business dates are saved when the event happens;
changing future settings must not regroup past postings.

The current report accepts an inclusive business-date range and generates CSV.
Cash shifts close only after unpaid checks are settled or cancelled. Closing
saves opening float, expected drawer, counted drawer and variance. Scheduled
closing does not invent a drawer count or authorize a cash reconciliation.

Next scheduled-report design: a durable worker runs by location/time zone,
creates an idempotent snapshot keyed by location and closing occurrence, and
records delivery attempts separately. Handle daylight-saving changes, overnight
service, holidays, missed jobs and late/offline events. Mark late updates instead
of silently replacing a previously distributed financial report. The pilot has
no active scheduler or report email delivery.

## Canada-first gates

Ontario's standard HST rate is not the correct effective rate for every product.
The current training build uses configurable item rates; it does not implement
all classification and rebate rules. In particular, CRA describes a provincial
point-of-sale rebate for qualifying prepared food/beverages under specified
conditions and a $4 qualifying-item threshold. Review classification, mixed
baskets, returns and rounding before merchant use. [CRA GI-064](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/gi-064/harmonized-sales-tax-ontario-point-sale-rebate-on-prepared-food-beverages.html)

For businesses subject to PIPEDA, call recording requires an appropriate purpose,
notice, consent and safeguards; outsourcing does not remove responsibilities.
Set retention and meaningful alternatives. The current agent does not configure
recording. Transcripts and service logs also need privacy design. [Privacy
Commissioner guidance](https://www.priv.gc.ca/en/privacy-topics/surveillance/02_05_d_14/)

Use an established payment provider and approved terminals. Do not store raw
card numbers or CVV in Jawa records or voice transcripts. Provider certification,
refund reconciliation, offline-card policies and terminal compatibility are
separate release gates. No card-processing implementation is active here.

## Full package and build sequence

**Stage 1 — this working foundation:** retail and restaurant registers, owner
inventory/reporting surface, kitchen display, records and return workflow.

**Stage 2 — operating completeness:** structured modifiers, ingredient recipes,
waste, purchase receiving, discount/return permissions, table checks, split
payments, till paid-in/out, printing delivery protocol and scheduled snapshots.

**Stage 3 — reliability and connected services:** store hub, offline journal,
conflict recovery, supported payment terminal, production voice ingress, actual
phone transfer and printer hardware certification. Add backup restoration,
tenant/staff security testing, observability and support diagnostics.

**Stage 4 — application package:** waiter handheld, customer display, stock app,
kiosk, online ordering, owner mobile app and staff portal. Multi-location
operations, loyalty, gift cards and accounting integrations follow. Native
Android/iOS release packages require separate signing, device tests and store
submission work; none are delivered by this web pilot.

Each stage should ship behind explicit capabilities, with a migration and
rollback plan. Do not sell planned integrations as working features.

## Validation evidence and release checklist

- 25 deterministic checks pass: cash totals, stock effects, duplicate operations,
  oversell prevention, partial refunds, original-tax reversal, kitchen states,
  cancellation, opening hours, overnight/DST dates, cash reconciliation, strict
  text intake, signed voice quotes, expiry, owner binding and printer claims.
- SQLite tests use the generated schema and the actual repository queries,
  including concurrent last-item sales and concurrent duplicate requests.
- Tesseract correctly extracted two printed SKU/quantity rows from one synthetic
  test image. No broad OCR accuracy claim follows from that result.
- LiveKit and printer adapter Python files are syntax-checked. Provider SDK
  runtime compatibility, live speech, SIP, actual printing and end-to-end merchant
  behaviour remain unverified.
- No browser visual/end-to-end QA was performed in this iteration. The optional
  WebMCP inventory tool was not validated in a supported browser context.

Before merchant launch, require zero unexplained financial differences in the
agreed test set, one business effect under duplicate/reordered requests, verified
tenant isolation, tested backups/restores, real printer recovery, payment-provider
reconciliation and observed staff completion of ordinary/difficult shifts.
Proposed performance targets should be measured on representative hardware;
they are not current guarantees.

Next customer validation: observe five retailers and five restaurants, collect
permitted anonymized sample catalogues/receipts/invoices, test migration and a
closing shift, and recruit a small supervised pilot. Focus the initial package
on one-location independent shops, quick-service restaurants and hybrids. Large
chains, regulated retail and complex hospitality need separate scope.

The earlier six-person/six-month cost scenario was illustrative, not a quotation.
Re-estimate after selecting supported devices, provider contracts, voice usage,
support coverage and merchant requirements. No revenue or defect-free guarantee
is supported by this research.
