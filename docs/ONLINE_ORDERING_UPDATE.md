> **Server edition 0.3 update:** An independent Node server with owner/staff login, action permissions, encrypted backup/restore and daily summaries is now included. Start with [SERVER_INSTALL.md](SERVER_INSTALL.md). The older managed-host instructions below still describe that separate runtime. Commercial launch gaps remain.

# Jawa online and delivery-order update

## Included now

- Restaurant and retail pickup-order pages using the current catalogue.
- Explicit pay-at-collection flow, store hours, pause/resume and pickup estimates.
- Durable incoming requests, private status receipts and same-request retry.
- An Online orders inbox with source labels, review, accept and decline.
- A normalized partner bridge contract for DoorDash, Uber Eats and Skip.
- Stock/price revalidation before acceptance; a single POS/kitchen/print effect.
- Platform-collected payment classification, cash-refund blocking and separate
  cash/platform reporting. Printed tickets include external references and a
  warning not to collect cash again for platform-paid orders.

## Still requires implementation or activation

Native marketplace connectors, partner approval, real provider credentials,
menu/modifier sync, provider acceptance/status/cancellations/refunds, commission
and payout reconciliation, public customer deployment, online card checkout,
courier dispatch and production abuse controls. These features are not activated
by the presence of marketplace names in the inbox.

No external account was created, no provider contacted, no merchant data imported
and no real order, charge or delivery dispatched by this update.

See `integrations/channels/README.md` for setup, exact contracts, research sources,
known limits and the required production gates. Earlier screenshots in this kit
show the preceding register release; the source now includes the Online orders tab.
