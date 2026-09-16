# ADR-0002: Loopback-Only Serving

- Status: Accepted
- Date: 2026-09-16
- Deciders: Bittu Sharma, CI

## Context
The retail register handles real transactions and sensitive data. It must never
serve on public interfaces.

## Decision
All HTTP servers bind to 127.0.0.1 only. Interactive demos run on localhost.
No unauthenticated remote access permitted.

## Consequences
- Zero attack surface from external connections
- Honest demo screenshots (loopback-captured only)
- Matches portfolio-wide invariant (jawa-quant-computer ADR-0002, galaxy-mvp ADR-0002)
