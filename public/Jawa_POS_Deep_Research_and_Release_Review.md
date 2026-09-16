> Latest source update: direct pickup-order pages, a channel inbox and a normalized marketplace bridge contract are now implemented. Native marketplace connections, public customer deployment, online card payments and provider settlement remain unfinished. See integrations/channels/README.md and docs/ONLINE_ORDERING_UPDATE.md in the source kits.

# Jawa POS: Restaurant and Retail Product Research and Release Review

## Executive assessment

Jawa should be one business platform with two deliberately different selling applications: **Jawa Restaurant** for table service and takeaway, and **Jawa Retail** for stores. The shared platform should own products, stock movements, orders, refunds, staff permissions, tax configuration, cash shifts, reporting and integration records. A cashier should enter the correct selling screen directly and reach management functions only when needed.

This recommendation is a product and engineering judgment based on the workflows reviewed below. It is not evidence that Jawa is the best POS available. Established competitors already cover substantial parts of this package. The defensible opportunity is a simpler setup and a dependable connection between calls, accepted orders, stock, kitchen instructions and reconciled records. Whether customers prefer that experience requires observation in real shops and restaurants.

The current v0.2 deliverable is a **private development and training build**, with separate restaurant and retail source kits. It implements useful workflows and includes deterministic regression tests. It is not a commercially complete, certified payment system, a native mobile installer, or a verified live telephone deployment. The completion matrix later in this report separates working code from external connections and future product work.

Research was checked on 10 September 2026 using representative official product documentation, vendor feature pages, standards, Canadian public guidance and original GitHub repositories. “Every available POS” cannot be exhaustively audited: products change, regional packages differ, and vendor pages do not establish real-world reliability. This review therefore examines the most consequential capabilities and failure cases rather than treating feature counts or GitHub stars as a ranking.

## What familiar POS products teach us

Shopify’s POS documentation places adding items, managing the cart, discounts, payment and order management within the everyday selling workflow. Its customization material also provides a precedent for adapting the register to the merchant. The implication for Jawa is straightforward: the selling screen should be immediately recognizable, with search, product selection and the bill occupying the main workspace. Analytical cards and release planning should not displace the cashier’s work. [Shopify POS](https://help.shopify.com/en/manual/sell-in-person/shopify-pos), [register customization](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/customize-pos).

Square’s Canadian restaurant feature page includes restaurant-specific menu, table and kitchen capabilities. These are useful benchmarks because a restaurant order has a preparation lifecycle beyond payment. Jawa consequently treats table selection, an unpaid check, preparation progress and a later cash settlement as separate steps. A restaurant bill can remain open while the kitchen works. The product should eventually support course timing, structured modifiers and station routing, but those capabilities should not be inferred from the presence of a kitchen screen. [Square for Restaurants features](https://squareup.com/ca/en/point-of-sale/restaurants/features).

TouchBistro presents floor plans, tableside ordering, menu management, staff controls and reporting as parts of its restaurant package. This supports offering both table service and counter service, which the user selected for Jawa. A simple list of table records is a useful first implementation; it does not yet equal editable floor geometry, assigned servers, reservations or split checks. [TouchBistro](https://www.touchbistro.com/).

Lightspeed’s retail material emphasizes purchasing, suppliers, stock across locations, reporting and connected sales channels. This establishes how far a complete retail package extends beyond a product grid. Jawa’s current quantity ledger is a foundation for inventory control. Purchase orders, supplier reconciliation, transfers and omnichannel reservations require additional business entities and tests. They are included in the expansion specification, not represented as finished features. [Lightspeed Retail](https://www.lightspeedhq.com/pos/retail/).

Shopify distinguishes cash rounding from item tax and applies rounding to cash payments and refunds, with special handling of full and partial returns. This is an important accounting benchmark. Jawa currently records exact cents in training; introducing five-cent rounding requires explicit tender adjustments and corresponding refund rules. Quietly rounding line prices would damage both tax and return reconciliation. [Shopify cash rounding](https://help.shopify.com/en/manual/sell-in-person/shopify-pos/cash-rounding-on-pos).

The resulting interface direction is familiar rather than unusual: a persistent bill, large product buttons, visible prices, search with scanner support, simple category filters, an obvious payment action and a clear route back to previous transactions. The restaurant register adds dining tables, open checks and a kitchen display. The retail register adds held carts and a product catalogue. Both use a shared back office.

## Interface specification and current improvements

The v0.2 home screen is an application chooser, not a marketing page. Restaurant and Retail each have a dedicated route and their own navigation, colour accent and terminology. This keeps product identity consistent while making the active register unambiguous. The two kits include the common source because stock, transaction validation and reporting must not evolve into incompatible implementations.

In Retail, the primary task is “Sell.” Search accepts a name or SKU, and Enter adds an exact SKU match. Product buttons show a name, price and current quantity. A right-hand bill shows quantities, subtotal, tax and total. Cash entry displays the amount due and change. Held carts are saved in the server records and can be recalled later; they do not reserve inventory or preserve a guaranteed price. Completing a held cart consumes it atomically so two registers cannot both complete the same saved cart.

In Restaurant, “New order” offers takeaway and dine-in. A pickup name is required for takeaway in the focused interface. Table records have names and seat counts; an existing unpaid table check is opened rather than creating another one silently. Staff can add items to an unpaid, unserved check. New items generate an addition ticket, while the earlier ticket remains unchanged. The same item can be combined only when its original price, tax and preparation note match; otherwise this release requires a separate check.

Preparation notes are attached to individual lines and can also apply to the whole original order. These are free-text instructions, not priced modifiers, allergy certification or ingredient substitutions. The kitchen board shows New, Preparing and Ready, with an explicit Served action. Each accepted set of additions is a separate preparation batch. Earlier batches retain their progress, so adding fries does not tell the kitchen to prepare an already completed burger again. The printer queue provides the corresponding immutable ticket history.

Primary action buttons and quantity controls target 44 CSS pixels or more. W3C’s WCAG 2.2 minimum target-size criterion generally specifies 24 by 24 CSS pixels, with defined exceptions. Choosing larger controls is Jawa’s usability decision for touch operation; it is not a declaration that the entire application has passed an accessibility audit. Keyboard focus, small-screen scrolling, screen-reader announcements and real-device testing remain part of acceptance testing. [W3C target size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

The new client uses a short-lived browser session journal for uncertain submissions. Authoritative business records remain on the server. If a request outcome is unknown, the interface blocks another mutation and offers recovery using the original operation identifier. Closing the tab may lose that local recovery handle, so this is not a complete offline register. Staff must inspect server history before starting a replacement transaction after losing local state.

## Transaction integrity and refunds

A POS must preserve the relationship between accepted orders, stock and money. Jawa’s engine uses integer cents and item-level tax amounts. An accepted order snapshots product names, SKU, unit price, cost and tax rate. Later product edits do not rewrite an earlier receipt. Quantity reductions, the accepted order and its print job are committed as one versioned store update.

Requests carry a unique operation identifier. Repeating the same request returns its original result; reusing an identifier with different content is rejected. v0.2 canonicalizes JSON property order and remains compatible with older fingerprints. Reserved prototype identifiers are rejected. This corrects a subtle distinction between “the same JSON request” and “the same string serialization.”

Storage uses a compare-and-swap update against the store revision. Competing requests must re-evaluate current stock rather than both selling the last unit from an old screen. Regression tests use an actual SQLite database and the published migration to exercise concurrent last-item checkout and duplicate requests. Contention that exhausts the retry loop returns a retryable service error. SQLite’s own atomic-commit documentation explains that durability also depends on the operating environment; an application test is not a storage-provider disaster-recovery certification. [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html).

Refunds use original transaction quantities and amounts. Cumulative tax allocation ensures a sequence of partial returns reverses exactly the original tax rather than losing cents through repeated rounding. An operator must provide a reason and decide whether returned units go back into sellable stock. Prepared food should not automatically reappear as inventory. Unpaid cancellation restores quantities only when preparation has not begun. Once any preparation has begun, this release conservatively leaves the entire cancelled check consumed, including subsequent additions; finer waste attribution is future work.

The current engine is a bounded pilot aggregate, with 2,000 products, 1,000 orders, 10,000 audited actions and a payload limit of approximately 1.8 MB. It is not suitable for indefinite trading history or a large chain. Exporting does not reset those limits. The production architecture must move to normalized, indexed records with durable idempotency history, migrations, backup restoration and archival policies before these limits become operational constraints.

Discounts, split tender, split checks, exchanges, gift cards and loyalty are intentionally explicit gaps. Each affects allocation or liabilities. A complete implementation must specify tax treatment, partial returns, rounding, reconciliation and audit permissions for each; a visually present button would not satisfy that requirement.

## Phone ordering: GitHub selection and actual integration state

LiveKit Agents is the recommended foundation for the current inbound-call implementation. Its original repository documents real-time agents, speech/model integrations, telephony and a testing framework. The framework uses Apache-2.0, while its turn-detection models have a separate model licence. These must be reviewed separately when shipping a commercial bundle. LiveKit is selected for fit with this architecture, not because this project measured it as universally superior in latency or accuracy. [LiveKit Agents repository](https://github.com/livekit/agents).

Pipecat is the main alternative evaluated. Its original repository describes a composable Python framework for voice and multimodal applications under BSD-2-Clause. It is worth reconsidering if Jawa needs a different transport or substantially more customized audio pipelines. Maintaining two voice frameworks now would duplicate integration and testing work without proving a customer benefit. [Pipecat repository](https://github.com/pipecat-ai/pipecat).

The phone-to-POS contract follows menu lookup, draft pricing, complete readback, explicit confirmation, server acceptance and status lookup. It never takes card details. Accepted pickup orders remain unpaid until the store records payment. Menu availability depends on current stock, configured hours and an open cash shift. The server rejects an unavailable product, mismatched total, duplicated call or superseded quote.

The earlier adapter generated a new random call ID for each process, held the signed quote only in memory and lacked a real transfer tool. It could therefore lose the relationship between a call and a submitted order after an interruption. v0.2 derives a stable identifier from SIP call identity, persists confirmation state in a local SQLite journal, serializes tools per active agent, and retains the same token for recovery. A pending or unknown confirmation prevents a replacement quote until the outcome is resolved. The service provides a status lookup and returns the current kitchen and order state rather than always claiming that the order is new.

Signed quotes expire after two minutes for new acceptance. An exact already-accepted request may still be recovered after expiry; this does not permit an expired new order. Persisting the latest quote ID prevents an older, unaccepted quote from being used after a replacement has been issued. The quoted response contains item names, quantities, pickup name, notes and total so the agent can read back something meaningful to the customer.

The adapter now includes a staff transfer tool using LiveKit’s documented SIP transfer API and a fixed operator-configured destination. Automatic ordering pauses when handoff begins. A failed transfer is reported as failed, not as a successful connection or promised callback. This is a cold transfer foundation; an attended transfer with a staff introduction, availability check and return-to-agent policy remains future work. Actual carrier support and call behaviour have not been tested. [LiveKit call forwarding](https://docs.livekit.io/telephony/features/transfers/cold/), [warm transfer documentation](https://docs.livekit.io/telephony/features/transfers/warm/).

No phone number, SIP carrier, LiveKit account, model configuration or verified service ingress is connected in this release. The code cannot receive a public telephone call without that infrastructure. Python journal and transport tests use controlled responses and do not measure speech recognition, accents, interruptions, hallucinations or telephone quality. A model-generated confirmation boolean is also not independent proof that a caller heard the complete quote and agreed. Conversation evaluations and controlled live-call tests are mandatory before activation.

For the private hosted site, the adapter supports separate service authentication and an optional platform-issued access token in the supported service header. Tokens must be provisioned through the owner’s approved access mechanism and supplied through secret configuration. The release does not generate access tokens, copy browser credentials, make the site public or activate service accounts.

Twilio’s security documentation provides a separate benchmark for authenticated webhooks and request validation. If a future implementation accepts direct Twilio callbacks, it must validate their signatures using the provider’s supported mechanism. Jawa’s present LiveKit adapter does not constitute a Twilio webhook implementation. [Twilio security](https://www.twilio.com/docs/usage/security).

## Printer and kitchen delivery

The chosen local adapter uses python-escpos, whose original repository provides an ESC/POS integration library. This reduces the need to build a low-level printer protocol from scratch. It does not establish compatibility with every receipt printer. Device model, interface, character encoding, paper width, cutter and cash-drawer behaviour need a tested support matrix. [python-escpos repository](https://github.com/python-escpos/python-escpos).

The earlier queue returned the current order while a worker subsequently claimed a job. An order could change between those steps. v0.2 freezes the printable order or addition inside the job and returns that snapshot from the atomic claim response. The bridge prints that claimed payload. Accepted original orders, additions, cancellations and reprints have distinct event labels.

A local printer journal is written before attempting a claim or physical output. Previously attempted jobs are not blindly printed again after restart. Transport completion is called “submitted”; it does not assert that paper emerged. A timeout is “uncertain.” Staff must inspect the printer and reconcile the result before requesting a labelled copy. An interrupted claim can still require manual intervention, so unattended self-repair is not claimed.

The queue now identifies manual versus bridge claims. A manual operator reserves a ticket before opening the print dialog; another worker cannot claim the same pending job. Copies require a reason and create a separate job. Historical receipt previews are labelled as copies or check summaries, and they must not be used as instructions to prepare the whole amended bill again.

ASCII sanitization prevents order text from injecting ESC/POS control commands. It also means accented names and non-Latin scripts are not yet faithfully supported by the physical bridge. Browser rendering and printer encoding are separate concerns. Unicode and bilingual printing should be accepted only after testing specific device code pages or raster printing.

## Inventory from photographs and ongoing stock control

Tesseract.js is already bundled for local text extraction in the browser. The project provides OCR functionality; it does not provide knowledge of the store’s catalogue, a reliable count of obscured objects on a shelf, or a supplier-invoice reconciliation engine. Its own documentation also describes limitations such as its input support. [Tesseract.js repository](https://github.com/naptha/tesseract.js).

The present workflow is image upload, local OCR, text review, strict SKU-and-quantity parsing and confirmed receipt into inventory. Known SKUs are required. Unknown, duplicate or malformed rows fail the whole import rather than being silently skipped. v0.2 fixes mixed-case duplicate SKUs. An operator can correct extracted text before receiving stock. The original image is transient in the browser; the app does not claim to retain supplier evidence in durable storage.

A photo of a clearly printed stock list can be useful. A shelf photo usually cannot prove unseen quantity, unit size, variant, cost or ownership. A professional “photo to inventory” expansion should produce a proposed mapping with confidence and evidence, then require review of uncertain fields. Stock should change only after an approved receiving event. Model confidence must not be treated as a physical inventory count.

For restaurant ingredients, the target design needs recipe versions, yield, base-unit conversions, substitutions, purchasing packs, waste and menu availability. A sale would consume the snapshotted recipe quantities, not merely subtract a burger product. v0.2 tracks sellable portions only. That is a material limitation for food-cost reporting and must remain visible.

For retail, expansion requires variants, multiple barcodes, bundles, suppliers, purchase orders, partial receipts, returns to suppliers, transfer-in-transit records, cycle counts and damaged stock. Serial or lot tracking, expiry dates and scales are business-specific options. Weighted goods require decimal quantity and unit-price rules; integer quantity support should not be presented as scale integration.

ERPNext provides a substantial open-source ERP codebase under GPL-3.0 and is a useful reference or potential integration target for broader operations. Adopting it would be an architecture and licence decision, not a drop-in frontend library. OSPOS offers an existing POS with inventory and operational capabilities, but its repository specifies MIT terms with an additional visible attribution requirement. It must not be relabelled as proprietary Jawa code without satisfying those terms. Neither codebase has been silently merged into this release. [ERPNext repository](https://github.com/frappe/erpnext), [OSPOS repository and licence notice](https://github.com/opensourcepos/opensourcepos).

## Reports, opening hours and Canadian deployment

Store settings include timezone, weekly closed days, opening and closing times, and a business-day cutoff. Overnight hours attribute the after-midnight interval to the opening weekday. Reporting follows the configured business date rather than assuming UTC midnight. Daylight-saving and overnight cases are included in deterministic tests.

Current reports cover paid sales, refunds by refund business date, net tax and net cash activity, plus closed-shift cash reconciliation. The operator can choose a date range and export CSV. A closing record captures counted cash, expected cash and variance. v0.2 removes the prefilled expected amount from the count input so the operator must enter a physical count.

Automatic background report generation is not connected. The production specification is a per-store scheduled close snapshot keyed by store, business date and report version. Closing time must not silently settle unpaid checks. A scheduler should retry the same report key, flag unresolved payments, and publish a revised snapshot when late adjustments arrive. Optional email delivery would require a separate destination and delivery configuration; no report is automatically sent to another person by this build.

Canadian tax is not one universal percentage. CRA’s Ontario prepared-food guidance describes a provincial point-of-sale rebate for qualifying purchases at or below a defined threshold, with qualifying-product and combination rules. Therefore a blanket Ontario rate on every menu item is insufficient for production. Jawa’s sample 13% rate is training configuration; basket-level rebates, zero-rated categories, exemptions and other provincial rules require a tested tax policy. [CRA Ontario prepared-food rebate](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/gi-064/harmonized-sales-tax-ontario-point-sale-rebate-on-prepared-food-beverages.html).

CRA’s records guidance generally requires records for six years from the end of the relevant last tax year, with exceptions, and explains requirements concerning records kept outside Canada. An export button is not a complete retention or residency policy. Before live operation, confirm the deployment’s storage arrangements, accessible backups, retention rules and restoration procedure for the merchant’s situation. [CRA records guidance](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/keeping-records/where-keep-your-records-long-request-permission-destroy-them-early.html).

The Canadian privacy regulator’s call-recording guidance addresses notice, purpose, consent, safeguards and retention for businesses within its scope. Jawa does not configure audio recording. Adding recording later requires a real policy, alternative handling for objections, restricted access and provider configuration review; absence of an application recording switch alone does not establish what a telephone or model provider retains. [Office of the Privacy Commissioner: customer calls](https://www.priv.gc.ca/en/privacy-topics/surveillance/02_05_d_14/).

## Offline operation and payments

A cloud-connected register and an offline-capable register are different products operationally. The current app requires the server for acceptance. It provides submission recovery, not a complete local checkout database or offline inventory synchronization. A service worker that caches the screen would not solve multi-register stock conflicts or payment uncertainty.

Stripe Terminal documents local storage and later forwarding of eligible offline payments, with support depending on payment method, reader and SDK. Its current table lists Interac as unsupported offline and lists specific device and integration restrictions. This is why Jawa must choose the intended Canadian hardware before promising offline card acceptance. No Stripe Terminal integration is included in this release. [Stripe offline Terminal documentation](https://docs.stripe.com/terminal/features/operate-offline/overview?reader-type=internet).

The proposed production design uses a durable local device or store gateway for offline cash events, a monotonically increasing device sequence, server idempotency keys and explicit reconciliation. Scarce inventory needs either store-level coordination or a documented conflict policy. Customer-visible payment status must distinguish authorization, capture, offline collection, later failure and refund. Those states cannot be safely represented by one “paid” checkbox.

The first live payment release should use a supported provider and terminal combination, never raw card collection in Jawa. Card testing needs sandbox transactions, declined and cancelled payments, lost callbacks, duplicate callbacks, device reconnects, refunds and a match between provider settlements and POS records. Staff roles and manager approval for sensitive actions must precede general employee rollout.

## Complete package requirements and release sequence

The following is a completion map, not a claim that all rows are delivered. “Implemented” means present in this source build and covered where stated by code-level tests. “Adapter” means integration code exists but external activation and device tests remain. “Planned” means a product requirement has been specified but is not implemented here.

| Capability | Restaurant | Retail | Release state |
|---|---|---|---|
| Dedicated selling interface | Menu, takeaway, dine-in | Product grid, SKU search | Implemented |
| Cash sale and later settlement | Unpaid checks and cash payment | Cash checkout | Implemented; exact cents |
| Tables and seat counts | One unpaid check per table | Not applicable | Implemented; no floor-plan geometry |
| Add to an open check | Version validation and addition ticket | Not applicable | Implemented with line-combination limits |
| Preparation notes | Per item and whole order | Not primary | Implemented; no priced modifiers |
| Kitchen display | New, Preparing, Ready, Served | Not applicable | Implemented; polling |
| Held carts | Shared engine supports holds | Hold and recall screen | Implemented; no stock reservation |
| Product creation and editing | Menu products | Store products | Implemented |
| Stock movement history | Sellable portions | Whole units | Implemented |
| Reviewed image OCR receiving | Known SKU quantities | Known SKU quantities | Implemented; browser OCR |
| Partial cash refunds | Original values, optional restock | Original values, optional restock | Implemented |
| Cancellation records | Preparation-aware stock handling | Unpaid restaurant scope | Implemented |
| Shift open and close | Shared cash drawer | Shared cash drawer | Implemented; one active shift |
| Custom business dates | Timezone, hours, overnight cutoff | Same | Implemented |
| Range reports and exports | Cash activity and closing records | Same | Implemented |
| Operation retry recovery | Original operation reused | Same | Implemented; browser session scope |
| Immutable printer tickets | Orders, additions, cancellations, copies | Receipts and copies | Implemented queue |
| Automatic physical printing | Local ESC/POS bridge | Same bridge | Adapter; hardware not tested |
| Live phone ordering | Pickup agent and signed API | Not a retail sales agent | Adapter; no account connected |
| Staff phone transfer | Fixed destination cold transfer | Not primary | Adapter; carrier not tested |
| Ingredient recipe and waste ledger | Required | Optional bundles | Planned |
| Priced modifiers and course firing | Required | Optional extras | Planned |
| Split checks and mixed tender | Required | Split tender | Planned |
| Discounts, promotions, exchanges | Required allocation rules | Required | Planned |
| Cash rounding and tax rebates | Canadian policy rules | Canadian policy rules | Planned |
| Integrated card terminals | Provider-specific | Provider-specific | Planned |
| Offline register and sync | Store/device coordination | Store/device coordination | Planned |
| Suppliers and purchasing | Ingredients and packs | Products and variants | Planned |
| Multiple stores and transfers | Shared management | Shared management | Planned |
| Staff roles, PINs and approvals | Server-authorized | Server-authorized | Planned; current owner-only build |
| Loyalty, gift cards, CRM | Optional modules | Optional modules | Planned |
| Scheduled background reports | Store close snapshots | Store close snapshots | Planned; manual close exists |
| Owner mobile app and staff handheld | Dedicated workflows | Stock and owner tools | Planned; responsive web exists |
| Kiosk, online ordering and delivery | Capacity and fulfilment | Ecommerce reservations | Planned |
| Native Android/iOS/desktop installers | Separate builds and signing | Separate builds and signing | Not produced in this release |
| Backup restore and long-term archive | Mandatory operational gate | Mandatory operational gate | Export exists; restoration not implemented |

The next engineering release should normalize the database, add role enforcement, complete tax and cash-tender allocation, and build backup restoration. In parallel with product work—but without claiming integration readiness prematurely—the owner can select a printer and payment terminal and provision the voice environment. This gives a concrete set of devices and providers against which acceptance tests can run.

After those foundations, a controlled restaurant pilot should validate staff ordering, check changes, kitchen handoff, payment and refunds across actual opening and closing cycles. A separate retail pilot should exercise barcode entry, held carts, receiving, count corrections and returns. Native apps, kiosks, customer displays and online sales should follow proven shared APIs rather than copying business rules into each frontend.

## Acceptance evidence and remaining uncertainty

The delivered validation record lists the exact commands, pass counts and untested areas. The core suite checks money, inventory, returns, hours, idempotency, concurrency, tables, held carts, amendments, quote recovery and request limits. Python tests cover durable confirmation recovery, handoff blocking, separate access headers, redirect rejection and printer text sanitization. The frontend is type-checked and the deployable worker is built.

No live payment, telephone call, staff transfer, physical printer, cold-start conversation latency or production load is verified by those tests. Browser interaction and real-device accessibility checks are also separate from compilation. A zero-defect guarantee would be misleading. Release acceptance should require no unresolved critical defects in a documented pilot matrix, with an operator fallback and a rollback procedure.

For a phone pilot, the test set should include ordinary pickup orders; multiple item quantities; similar menu names; corrections during readback; refusal to confirm; silence; interruption; an unavailable item; a closed store; a dietary question; requests for staff; transfer failure; an expired quote; timeout after acceptance; and a restart during confirmation. Each successful case must resolve to one intended order, the correct amount and stock movement, and the correct kitchen ticket. Each failed case must leave a truthful status and an actionable staff path.

For printers, test paper-out, disconnected power, network interruption before and after transmission, restart during a claim, delayed acknowledgements, cancellation during output, multiple additions and deliberate reprints. For reports, test store timezones, daylight-saving transitions, after-midnight service, a late refund and a shift that cannot close because payment is still due.

The commercial objective should be measured in merchant outcomes: time to complete a normal sale, time to train a cashier, unresolved order errors, missed-call recovery, inventory discrepancies and support interventions per trading day. Subscription pricing and revenue projections should wait for pilot evidence and actual hardware, payment, model and support costs. Open-source code can reduce development work; it does not eliminate telephone charges, hosting, payment fees or operational support.

## Source register

All links above point to original vendors, maintainers, standards or public authorities. Product pages support feature descriptions, not independently measured quality. Repository licences must be rechecked at the exact dependency version before distribution. Unavailable repository or pricing pages were not used as evidence. The earlier research plan is retained separately for continuity; this review supersedes its statements about the v0.2 changes and current completion status.
