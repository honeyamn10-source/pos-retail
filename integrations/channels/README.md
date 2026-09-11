# Online ordering and marketplace bridge

## Exact implementation status

This release adds Jawa-owned pickup ordering and an operator inbox for `online`,
`doordash`, `ubereats` and `skip`. **No native DoorDash, Uber Eats, Skip or
Deliverect connector is activated or certified.** `POST /api/channel-orders`
is a Jawa-owned normalized contract for a future authorized bridge. Sending an
example payload to it proves Jawa behavior, not delivery-platform compatibility.

The hosted Site remains owner-private. No access policy has been changed and this
source update has not been deployed. Public customer access requires a separate
approved publishing/authentication design. Never expose staff `/api/state` routes
by removing authentication to make ordering public.

## Direct pickup flow

1. Add the store catalogue, configure hours and open a cash shift.
2. In either register, open **Online orders**, set the pickup estimate and enable
   online requests. This setting covers both registers; hours still apply.
3. Open `/order/restaurant` or `/order/retail`. Without `JAWA_ONLINE_OWNER`, a
   signed-in owner sees a private preview of their own store. With that server
   value configured, the customer API uses that owner as its merchant. The hosted
   access gate still applies.
4. A customer chooses items, reviews the total, enters a pickup name and confirms.
   Payment is due at collection. No card details or payment API is used.
5. The request is saved without reserving stock. The customer receives a private
   status receipt. The page polls status and retains an uncertain submission in a
   store-specific session journal for retry with the same ID.
6. The operator accepts or declines from **Online orders**. Acceptance rechecks
   stock, item identity, price and tax, then saves the POS order, stock movements
   and print job together. Restaurant orders enter the kitchen; retail orders
   enter the unpaid pickup workflow.
7. Collect cash through the normal order record. A cancelled, unprepared retail
   pickup restores its stock. Restaurant cancellation follows preparation rules.

Pending online requests expire after 30 minutes. The estimate is informational,
not a reserved pickup slot. Requests that cannot be accepted must be resolved;
there is no automatic substitution. The dietary-keyword check only routes detected
requests to staff; it is not a complete allergen or dietary-safety system.

No outbound SMS/email, delivery dispatch, online payment, reservations, address
collection or loyalty is implemented in this slice. A customer status receipt
requires its unguessable private key; the API does not expose costs, stock counts,
other customers, audit history or that key in its response.

## Marketplace bridge contract

Server configuration:

- `JAWA_SERVICE_OWNER`: existing authoritative owner of the POS store.
- `JAWA_CHANNEL_TOKEN`: separate, strong bridge credential (minimum 32 characters).
- `JAWA_DOORDASH_STORE_ID`, `JAWA_UBEREATS_STORE_ID`, `JAWA_SKIP_STORE_ID`:
  exact allowed external location IDs. An absent or mismatched ID rejects ingestion.
- Optional hosted access must use the platform's supported, owner-issued service
  mechanism. Do not copy a browser session, fabricate auth headers or change the
  access audience as an integration shortcut.

`Authorization: Bearer <JAWA_CHANNEL_TOKEN>` authenticates the bridge to Jawa.
It is **not** a DoorDash, Uber or Skip webhook signature. The future bridge must
verify the provider's real signature/authentication, fetch authoritative order data
where required, map the location and product identifiers, and retain durable events
before calling this contract.

POST `/api/channel-orders` with `Content-Type: application/json`:

```json
{
  "action": "receive",
  "currency": "CAD",
  "id": "durable-delivery-attempt-001",
  "source": "doordash",
  "storeId": "YOUR-APPROVED-LOCATION-ID",
  "externalId": "PROVIDER-ORDER-ID",
  "providerAccepted": true,
  "payment": "platform_collected",
  "fulfillment": "delivery",
  "customer": "Pickup reference",
  "notes": "",
  "items": [{"productId": "YOUR-JAWA-PRODUCT-ID", "qty": 1}],
  "expectedTotal": 1639
}
```

Amounts are integer CAD cents. Replace the example product and total with the
mapped, confirmed catalogue amounts. This narrow contract supports already
accepted restaurant orders for which the provider collected payment. Product,
quantity or price mismatches reject the entire ingestion; it does not silently
reprice marketplace orders. Promotions, delivery/service fees, tips, bag fees,
channel-specific price lists, modifiers and differing tax allocation require an
expanded, reconciled amount model before live integration.

The response contains `requestId`, local `status` and `providerUpdateSent: false`.
A retry with the same source/externalId and identical contents yields the original
request even if the transport operation ID changes. Conflicting contents are rejected.
Use the same operation ID for unknown outcomes. Do not mutate a saved delivery
payload to make a failed validation pass.

For local status, send:

```json
{"action":"status","source":"doordash","storeId":"YOUR-APPROVED-LOCATION-ID","externalId":"PROVIDER-ORDER-ID"}
```

The operator must verify the original platform order and payment before accepting
it locally. Local rejection requires confirmation that the platform order has been
handled there. **No local action sends an acceptance, rejection, ready event,
cancellation or refund to the provider.** Do not operate without the provider's
own tablet/control surface until reliable bidirectional connector behavior is built.

Accepted platform-collected orders use `paymentMethod: external`. They contribute
to gross sales and a separate platform-collected total, not drawer cash. Cash refunds
are blocked for these orders. Commission settlement, external refunds and payout
reconciliation are not implemented; current reports must not be treated as provider
settlement statements.

## Production gates specific to these channels

- Approved API/partner access, merchant account authorization and location mapping.
- Real webhook verification, delivery acknowledgment, durable inbox/outbox, outage
  recovery, duplicates, out-of-order events and cancellation races.
- Menu/modifier/availability synchronization and precise platform amount mapping.
- Bidirectional acceptance/denial, ready/collection, refunds and settlement records.
- Public-order abuse controls, rate limits, persistent customer/session design,
  request monitoring, privacy/retention controls and merchant contact details.
- Real devices and staff testing; original-provider device fallback until accepted.

Current storage retains at most 500 channel requests and 100 active pending
requests, subject also to the existing bounded store payload. Old expired requests
do not occupy the active pending allowance, but do count toward the historical cap.
This is a development limit, not a scalable merchant service.

## Verified official research

- DoorDash Marketplace supports menu/store/order integration, and API access is
  limited with an application process:
  https://developer.doordash.com/en-US/docs/marketplace/overview/
- Uber Eats documents Marketplace APIs, partner onboarding, API agreements,
  sandbox testing and production requirements:
  https://developer.uber.com/docs/eats/guides/getting-started
- Deliverect's official integration catalogue includes Skip, DoorDash and Uber Eats:
  https://help.deliverect.com/en/

Recommendation: pursue an authorized aggregator/partner route for launch while
building Jawa's own customer ordering channel. Confirm current Canadian coverage,
Jawa POS partner eligibility, scope and commercial terms with the provider. None of
these integrations is guaranteed or free merely because documentation is public.
