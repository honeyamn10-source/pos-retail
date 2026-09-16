# Validation record — v0.2

Updated 11 September 2026. This record describes evidence from the source build;
it is not a certification of live phones, payments, hardware or production readiness.

## Executed checks

| Check | Result |
|---|---|
| TypeScript `tsc --noEmit` | Passed |
| Node engine, integration and actual SQLite tests | 70 passed; 0 failed |
| Python adapter tests | 8 passed; 0 failed |
| Compiled Worker contract and route checks | 68 assertions passed in isolated Miniflare/D1 |
| Python syntax compilation | Passed for transport, journal, agent and printer bridge |
| Worker/client build | Passed; both POS routes, back office, research and all five APIs and customer ordering pages emitted |

Commands:

```
node node_modules/typescript/bin/tsc --noEmit
node --experimental-strip-types --test tests/*.test.ts
python -m unittest discover -s tests -p 'test_*.py' -v
python -m py_compile integrations/shared_http.py integrations/voice/order_session.py integrations/voice/agent.py integrations/printer/bridge.py
pnpm run build
node scripts/verify-api.mjs
```

## What the tests establish

Money tests cover integer-cent sales, tax rounding, partial refund limits and
cumulative refund tax. Stock tests cover atomic rejection, last-item contention,
whole-import rollback and case-insensitive duplicate SKU rejection. Time tests
cover timezones, after-midnight business dates, daylight-saving calendar handling,
closed weekdays and cash reconciliation.

New workflow tests cover held-cart persistence and single completion, conflicting
table checks, original price snapshots after product edits, versioned additions,
separate kitchen batches and cancellation after preparation. Six repository tests
use the published SQL migration with an actual in-memory SQLite database and
compare-and-swap calls; concurrency cases have exactly one accepted business result.

Voice tests cover HMAC integrity, owner binding, expiry, exact recovery after
acceptance, superseded quote rejection and duplicate-call protection. Python tests
simulate a timeout after confirmation, reopen the journal, and verify the same
signed token is reused. They also check explicit-confirmation gating, staff-handoff
blocking, current-status lookup and permission to requote a definitive rejection.

Printer tests cover claim ownership, frozen original/addition payloads, labelled
copies, unresolved-claim reconciliation, full-refund cancellation tickets and control
character removal. Transport tests cover direct HTTPS validation, redirect rejection,
bounded JSON parsing and separate service/access headers.

The compiled-Worker check exercises actual state, voice and printer HTTP handlers
with synthetic credentials and an isolated database. It verifies missing identity,
cross-origin rejection, owner isolation, cash acceptance and replay, separate
service scopes, phone quote/confirm/status and printer claim payloads. It also
renders the ten application routes server-side and checks their responses. This
does not verify the hosted identity gate. Separate browser evidence follows.

## Browser walkthrough checked in this update

The real Restaurant, Retail and Back office components were exercised through
explicit `/tour/` routes. These use a fresh sample store in memory and the same
transaction engine, without calling merchant state APIs. They reset on navigation
or reload. They demonstrate current UI behavior, not hosted persistence or services.

Observed in the browser: restaurant item selection and confirmation produced a
new kitchen ticket; SKU Enter added a retail item; a $38.42 retail sample sale
showed $11.58 change for $50 and completed; a confirmed $25 cash-in appeared once
in the drawer list; switching reports to Restaurant excluded the sample retail
sale. Desktop screenshots are included in `docs/screenshots/`. Mobile device
acceptance and live service testing remain outstanding.

An HTTP-preview UUID failure was corrected using Web Crypto random bytes when
`randomUUID` is unavailable; no non-cryptographic randomness was introduced.
The missing-sign-in register state now offers sign-in and stops describing the
failure as loading. Cash movements are validated and retried with the existing
transaction ID protections; register-filtered reports attribute returns using the
original order, including returns on later dates.

## Online and marketplace checks in the latest update

Fifteen channel tests cover pending requests without reservation, idempotent
acceptance, source-scoped external references, changed price/item/stock rejection,
expiry, capacity recovery, closed/paused service, customer-safe projections,
platform tender separation and blocked cash refunds. Another real SQLite race
accepts the same request from two registers and verifies one order/ticket/stock effect.

The compiled Worker checks now include direct pickup submission, anonymous menu
projection under an explicitly configured test merchant, private receipt-key checks,
stock movement after staff acceptance, isolated channel credentials, location and
currency mismatch rejection, and normalized marketplace redelivery. These are Jawa
contract tests with synthetic data. They are not native-provider integration tests.

New online-order screens have passed type checking and server rendering. The earlier
browser evidence above covers the preceding register release; it does not establish
browser end-to-end acceptance for the newly added customer ordering workflow.

## Earlier evidence retained

The first release's local OCR smoke check recognized a synthetic printed SKU list
using the bundled English engine and language assets. OCR code/assets were retained.
That narrow check does not establish performance on actual inventory photographs,
handwriting, all languages, poorly lit shelves or supplier document layouts.

## Not executed or not connected

- Visual review on actual merchant devices, screen readers and complete keyboard-only task completion.
- LiveKit SDK runtime import, real model inference, SIP routing, inbound calls or human transfer.
- Physical printer output, printer code pages, paper-out and power-loss tests.
- Card terminals, payment provider settlement, offline card acceptance or chargebacks.
- Long-duration load tests, distributed voice ownership and multi-store deployment.
- Backup restoration, automated scheduled reporting or production Canadian tax certification.
- Native APK/AAB/IPA/desktop installers; this is web source with Python adapters.

Known product gaps include discounts, priced modifiers, split tender/checks,
ingredient recipes, purchasing, staff roles, cash rounding, tax rebates, offline
checkout, scheduled report delivery, loyalty and multi-location management. The
full completion matrix is in the deep research report.

## Pilot acceptance still required

Use a fresh test store. Run a restaurant service and retail checkout cycle through
acceptance, stock changes, kitchen progress, payment, refund and close. Test each
unknown network outcome by recovering the original action. Check actual paper and
phone behaviour separately. Do not import production records until authentication,
retention, backup restore and regional tax/payment rules are implemented and reviewed.

The optional external SDK installation was attempted but the network approval
was cancelled before completion. Runtime dependency candidates are listed in
`integrations/requirements.txt`; no SDK compatibility pass is claimed.
