# Support and release operating template

Use this template to establish an actual support service; no response-time promise
is active until a responsible team and coverage hours have been agreed.

## Incident intake

Record merchant/location, release, device, time and timezone, affected workflow,
order or job ID, expected result, observed result, reproducible steps and business
impact. Do not collect card numbers, access tokens or unnecessary customer details.

Severity 1: suspected data exposure, incorrect balances or inability to trade.
Severity 2: a critical workflow has a safe manual workaround.
Severity 3: a noncritical defect or improvement.

Assign owner, next update time, safe workaround and evidence location. Preserve
transaction records. For uncertain orders, inspect history before submitting again.
For uncertain print delivery, stop the responsible worker and reconcile physically
before authorizing a labelled reprint. Escalate suspected duplicate charges to the
processor workflow; never invent a payment outcome from a timeout.

## Release record

Version / commit: ____________________
Problem addressed / affected workflows: ____________________
Database migration and compatibility: ____________________
Automated checks / actual device checks / operator acceptance: ____________________
Backup and independently tested restoration evidence: ____________________
Rollback procedure / owner / monitoring period: ____________________
Remaining defects and merchant-facing restrictions: ____________________
Release decision / accountable owner / date: ____________________

A release is blocked by unresolved money, stock, access-control or data-loss defects.
After an incident, record cause, affected records, correction, communication owner
and a regression check that demonstrates the same failure is prevented.
