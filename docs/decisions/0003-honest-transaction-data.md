# ADR-0003: Honest Transaction Data

- Status: Accepted
- Date: 2026-09-16
- Deciders: Bittu Sharma, CI

## Context
POS systems handle real money. Reported numbers must be traceable to committed
data, not fabricated screenshots.

## Decision
All transaction reports, inventory counts, and back-office metrics derive from
the SQLite transaction journal. Demo data is generated from real code paths,
never fabricated.

## Consequences
- Zero fabricated metrics in README or docs
- SQLite journal provides audit trail for every transaction
- Matches portfolio-wide honest-data standard
