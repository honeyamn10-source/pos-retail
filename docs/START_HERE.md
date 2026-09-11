> **Server edition 0.3 update:** An independent Node server with owner/staff login, action permissions, encrypted backup/restore and daily summaries is now included. Start with [SERVER_INSTALL.md](SERVER_INSTALL.md). The older managed-host instructions below still describe that separate runtime. Commercial launch gaps remain.

# Start here: Jawa Restaurant and Jawa Retail

This is a development/training release. Use sample transactions while validating
workflows. Live calls, physical printing and card payments are not connected.

## First setup

Open the application chooser. Pick Restaurant or Retail. In an empty store you
can load the sample catalogue; it creates products and six sample tables, not
invented historical sales. Alternatively, open Back office → Inventory and add
your own products. Set the correct type, SKU, price, tax rate and opening stock.

While no shift is open, use Store settings to configure the name, timezone,
opening/closing times, weekly closed days and business-day cutoff. Sample tax
rates are not a Canadian tax policy. Open a cash shift and enter the float.

## Restaurant daily workflow

For takeaway, choose New order, enter a pickup name, tap items, set quantities and
add any preparation notes. Review the full order. Send it unpaid, or select cash
payment now and record the cash received. Accepted items reduce sellable portions
and create a kitchen batch plus an original ticket.

For dine-in, open Tables. Choose an available table. An occupied table opens its
unpaid check. Add items through that check; only the additions become a new
preparation batch and ticket. The earlier batch retains its kitchen progress.
Different prices or notes for the same existing product require a separate check
in this release. Priced modifier groups and split bills are not implemented.

In Kitchen, move each preparation batch from New to Preparing to Ready to Served.
Adding to an open check does not restart earlier items. Take payment from Open
checks. A paid table is released from the unpaid-check list; seat occupancy,
cleaning and reservations are not separately tracked.

Cancel an unpaid check with a reason. Before preparation starts, quantities return
to stock. After preparation starts, cancellation conservatively keeps all quantities
consumed. A cancellation ticket is queued. Refund a paid order from Back office →
Orders & returns; choose quantities and decide whether to restock.

## Retail daily workflow

Scan an exact SKU ending with Enter, or select a product. The current bill shows
quantity, subtotal, configured tax and total. Charge opens cash entry. Confirm
only after receiving the cash. No card payment is made by this interface.

To serve another customer first, use Hold cart and give it a name. Held carts are
saved on the server; they do not reserve stock. Recall one from Held carts. Current
prices and stock apply, and completing the sale removes that held cart atomically.
Use Clear to discard an unsaved selection. Clearing a recalled selection leaves
the saved held cart available until it is explicitly removed or completed.

Use Products to edit names, SKU, categories, prices, cost and thresholds. Historical
receipts retain the original values. Use Back office for stock changes and new items.

## Photos and inventory

In Back office → Inventory, upload a clear JPG, PNG or WebP of printed SKU and
quantity rows, or paste the text. OCR runs in the browser with bundled English
assets. Review the text, parse it and check every row. Unknown SKUs and duplicate
rows are rejected. Confirm receipt only after verifying physical quantities.

Example input for the sample catalogue:

```
RET-001, 5
RET-002, 8
```

A shelf photograph is not a trustworthy automatic count. Images are transient;
keep supplier documents separately. Restaurant stock is sellable portions, not a
recipe/ingredient ledger. Decimal units and scales are not supported.

## Printer queue

Open Printers in either POS. Review the specific original, addition, cancellation
or copy ticket. For browser printing, reserve it for manual output first, open the
print dialog and confirm only after checking actual paper. A hardware bridge claim
cannot be used as a manual print instruction.

If a claimed attempt is unresolved, stop the printing worker, inspect the printer,
and record a reconciliation reason. Mark the outcome uncertain if you cannot
prove output. A separate copy requires a reason and is labelled REPRINT. Never
assume “submitted” means paper emerged. A historical check summary is not a new
kitchen preparation ticket.

## Phone orders

The Phone order inbox shows orders accepted through the phone API. Live service
needs the separate setup in `integrations/README.md`. There is no connected phone
number in this delivery. Staff can still use Back office → Call desk to transcribe
an order, review it against the catalogue and confirm it manually.

The automated adapter is for restaurant pickup only. It reads back a signed quote,
requires an explicit yes, and leaves payment due at pickup. It pauses for staff
handoff on ambiguity or dietary safety. Do not collect card numbers in notes.

## Reports and end of day

Settle or cancel all unpaid checks. Count the physical drawer independently and
close the cash shift. The saved close record contains counted cash, expected cash
and variance. Reports support a business-date range and CSV export; refunds appear
on their action date. Exact cents are used; five-cent cash rounding is not yet added.

Opening/closing hours and business-day cutoff control grouping and phone
availability. Closing time does not automatically settle checks or generate a
background report. Scheduled reporting remains an expansion requirement.

Export the full records regularly from the back office. Export is not a verified
backup-restore system and does not reset pilot capacity limits.

## If the connection fails

Do not start a replacement sale when the submission outcome is unknown. Use
Recover pending action; it resends the same operation safely. The session journal
can survive a reload in the same tab. If the tab or journal is lost, inspect server
history before entering another sale. A loaded screen is not an offline register.


## Try the current interface safely

Use `/tour/restaurant`, `/tour/retail` or `/tour/manage` for a sample walkthrough.
It uses the same screens and transaction engine with clearly labelled sample data.
Changes reset when leaving or reloading. It never sends orders to merchant APIs,
phone providers or automatic printer bridges. Use the regular register routes
for authenticated, saved training records.

## Cash drawer and separate reports

In either register, open **Cash drawer**, choose cash in/out, enter the amount and
reason, and confirm the physical movement. A payout cannot exceed expected drawer
cash. Movements affect closing reconciliation, not sales or tax. Both registers
currently share one active shift. Close the shift only after counting independently.

Back office → Reports → Register filters sales and refunds to Restaurant, Retail
or Both. Closing reports still represent the shared drawer and are labelled so.


## Online and delivery orders

Open **Online orders** in either register. Enable pickup requests, then open the
ordering page to try an order. Requests are pending until staff accept; accepting
rechecks stock and quoted prices and sends restaurant orders to the kitchen.
The customer page is currently a private preview unless merchant access is configured.

DoorDash, Uber Eats and Skip cards are marked **Not connected**. The included bridge
contract does not connect to those companies. Platform-paid orders must never be
charged again or refunded from the cash drawer. Read the channel integration guide
before any account activation.
