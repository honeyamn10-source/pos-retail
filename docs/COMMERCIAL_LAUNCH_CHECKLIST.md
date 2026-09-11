> **Server edition 0.3 update:** An independent Node server with owner/staff login, action permissions, encrypted backup/restore and daily summaries is now included. Start with [SERVER_INSTALL.md](SERVER_INSTALL.md). The older managed-host instructions below still describe that separate runtime. Commercial launch gaps remain.

# Commercial launch checklist

## Release decision

**Current decision: do not sell this version as a finished, production-ready POS.**
It is a tested development foundation with separate restaurant and retail workflows.
The source kits contain the current implementation, not a promise of universal
hardware support or error-free operation. The shared business goal is a saleable,
supportable POS product; that requires the work and evidence below.

## Minimum commercial product

| Area | Work required before general paid rollout | Evidence needed |
|---|---|---|
| Merchant identity | Tenant/store model, merchant onboarding, server-enforced staff roles, individual sessions and revocation | Cross-tenant and role-denial tests against real routes |
| Data durability | Normalize the bounded store aggregate, migrations, export/import, encrypted backup storage, restoration and retention | Restore a separate installation and reconcile balances |
| Canadian tax | Product tax categories, relevant rebates/exemptions, receipt fields, exact allocation and cash rounding | Accountant-reviewed examples for the launch jurisdiction |
| Payments | Selected processor and supported terminals, verified event handling, reconciliation, refunds and decline/retry paths | Provider sandbox tests plus controlled real-device acceptance |
| Restaurant | Priced modifiers, split checks/tender, clear table lifecycle and recipe/waste stock if sold as ingredient inventory | A complete shift with actual restaurant staff |
| Retail | Discounts, variants/bundles, purchasing/receiving, exchanges and applicable barcode/scale support | A complete retail trading and receiving cycle |
| Phones | Number/carrier, agent hosting, pinned SDK/model configuration, spending controls, staff fallback and privacy settings | Real-call test scripts, interrupted confirmations and failed transfers |
| Printers | Supported device profiles, paper-out/power-loss handling and operator recovery | Physical receipts and kitchen tickets from each supported model |
| Offline | Local durable transaction storage and explicit sync/stock conflict policy, if offered | Internet-outage and reconnect tests on supported devices |
| Reports | Background close snapshots, late adjustments and optional configured delivery | Timezone/DST and delayed-job tests, reconciliation with source transactions |
| Support | Installation runbook, diagnostics, incident severity, escalation and merchant fallback procedure | A rehearsed outage and recovery, with a named support owner |
| Commercial terms | Written service scope, fees, support hours, data responsibilities, privacy/retention and third-party terms | Appropriate business/legal review before contracting |

Not every merchant needs every optional module, but a feature sold to a merchant
must actually work for that merchant's operating model. If ingredient inventory,
offline use, loyalty, kiosks or online ordering are omitted from a first plan, that
scope must be clear in the offer and onboarding. No placeholder should be sold as
an activated integration.

## Two product packages

Jawa Retail should be offered around fast selling, product/variant control,
receiving, returns, cash reconciliation and optional online sales. Jawa Restaurant
should be offered around takeaway and table orders, accurate modifiers, kitchen
handoff, payment, food/portion stock and optional telephone ordering. Both should
share merchant administration and transaction rules.

Do not maintain independently changing copies of the tax, stock or refund engine.
The current two source distributions keep the common platform intentionally.
Native tablet, phone or Windows applications require their own packaging, signing,
update and device-support work; a ZIP of web source is not an app-store binary.

## Launch stages

1. Complete the commercial foundation: identity/roles, normalized storage, tax,
   payment lifecycle, backup restoration and device support boundaries.
2. Select a small restaurant and a small retailer as controlled pilot partners.
   Record their real workflow requirements and hardware before promising compatibility.
3. Run parallel reconciliation against their established process using test or
   controlled pilot transactions. Record defects with reproducible examples.
4. Admit paid pilot use only with explicit scope and a practiced fallback, after
   critical transaction/security defects are resolved and real integrations pass.
5. Expand general sales only after the support process and release rollback are
   proven through complete trading cycles. Re-test changes that affect money or stock.

These are release gates, not a guaranteed timetable. “No errors found in these
tests” and “no possible errors” are different statements. A mature product needs
monitoring, incident handling, updates and regression testing throughout its life.

## Business operating kit to prepare

The `docs/business/` folder includes merchant onboarding and acceptance, support
and release records, a defect log, and a pilot cost input sheet. Complete these
templates with real evidence; they are not executed acceptance records.

Create a customer qualification checklist, supported-hardware sheet, installation
checklist, migration mapping template, opening-stock reconciliation, cashier training
material, support intake form, incident log and change/release notes. The included
operator and developer guides provide the first technical pieces of that kit.

Create a cost sheet using actual quotations for hosting/storage, speech recognition,
model usage, speech output, telephone minutes/numbers, payment processing, hardware,
installation and support. Set a price only after measuring the cost to serve a pilot
merchant and the value they receive. Open-source components do not make those
ongoing services free. Revenue and profit are separate; no sales target is guaranteed.

Marketing should state supported capabilities, device compatibility and limitations
plainly. Avoid claims such as “number one,” “all problems solved,” “error-free,” or
“fully automatic” without appropriate evidence. The initial differentiator to test
is easy onboarding and a trustworthy connection from confirmed calls through stock,
kitchen and reconciled records.

## What the owner must eventually provide

- Merchant business details and tax configuration for the intended launch market.
- Selected supported register devices, printer model and payment terminal/provider.
- Phone carrier/number, voice service and model accounts for activation.
- A staff transfer destination and actual store operating hours.
- Pilot operators who can perform and sign off complete trading workflows.
- A decision on paid-plan scope, support coverage and data retention.

No customer is contacted, no account is provisioned and no subscription is sold by
this source-kit delivery. These inputs become necessary when configuring real
operations; they are not needed to inspect the delivered code and tests.


## Online/channel update

Direct pickup requests and a normalized marketplace inbox contract are now built.
They do not remove the public-deployment, provider-access, native connector,
settlement, abuse-control and integration-testing gates. See
`integrations/channels/README.md` for the current supported scope.
