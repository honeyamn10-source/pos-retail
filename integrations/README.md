# Phone and printer integration kit

These adapters are included as source, but no live service is activated. Complete
the account, SDK and device acceptance steps before accepting customer traffic.

## Access boundary

The private Site uses platform-managed sign-in. An application bearer token alone
does not open that gate. An owner-provisioned, platform-issued service access token
can be supplied as `JAWA_SITES_GATE_TOKEN`; the adapter sends the supported
`OAI-Sites-Authorization` header separately from its scoped application token.
No token is generated or rotated by this kit. Never use a browser session cookie
or make the Site public to work around configuration. If supported service access
is unavailable, use an approved merchant backend with equivalent authentication.

The transport requires a direct HTTPS URL, rejects redirects, limits response
size and expects JSON. It never forwards credentials to a redirect target.

## Server configuration

Set through the deployment's secret manager:

- `JAWA_SERVICE_OWNER`: authenticated store-owner ID, not an email or a caller ID.
- `JAWA_VOICE_TOKEN`: distinct random secret of at least 32 characters.
- `JAWA_PRINTER_TOKEN`: another distinct random secret of at least 32 characters.

All integrations access the configured owner's records. These are not per-employee
roles, and they should not be shared with customer browsers.

## Voice service

Candidate direct versions are in `requirements.txt`; their full runtime installation
was not completed in this environment. Install and pin LiveKit Agents and its chosen
speech/model dependencies in the
voice service environment after compatibility testing. The repository and API
references are linked in the research report. `voice/agent.py` requires:

- `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.
- `JAWA_STT_MODEL`, `JAWA_LLM_MODEL`, `JAWA_TTS_MODEL` with tested account-supported IDs.
- `JAWA_VOICE_ENDPOINT`: direct HTTPS URL ending in `/api/voice`.
- `JAWA_VOICE_TOKEN`: same voice scope secret as the server.
- `JAWA_SITES_GATE_TOKEN` if required by the private host.
- `JAWA_STAFF_PHONE`: fixed staff transfer destination in E.164 form.
- `JAWA_VOICE_JOURNAL`: persistent local SQLite path; never ephemeral container storage.

Configure a SIP carrier, an inbound number and LiveKit inbound dispatch to this
agent. The entrypoint accepts SIP participants. One active worker should own each
SIP call. A local journal survives a process restart on the same persistent volume;
it does not provide distributed ownership across multiple independent volumes.
The journal may contain pickup details inside signed quotes. Restrict access,
protect the volume and set a reviewed retention policy. No automatic cleanup is
implemented, because active/unknown confirmation records must not be lost.

The agent has menu, quote, confirm, status and fixed-destination transfer tools.
Quotes expire for new orders after two minutes. A replacement quote invalidates
an older unaccepted quote. Unknown confirmations block new quotes, and retries
reuse the same signed operation. Exact accepted requests can be recovered after
expiry. Status returns the current order and kitchen state.

A transfer pauses automatic ordering. Failed or unconfigured transfers return an
honest failure. Warm/attended handoff, pickup-capacity slots, multilingual quality,
call-rate limits, provider spending limits and distributed failover remain release
gates. The model's confirmation boolean is not independent proof of customer
consent; evaluate complete readback and interruption cases with actual calls.

Command after configuration and compatibility verification:

```
python integrations/voice/agent.py start
```

## Voice API contract

Authenticated `GET /api/voice` returns menu, store hours and order availability.

POST bodies:

```
{"action":"quote","draft":{"callId":"stable-call-id","customer":"Pickup name","items":[{"productId":"catalogue-id","qty":1}],"notes":""}}
{"action":"confirm","quoteToken":"returned-signed-token","confirmed":true}
{"action":"status","callId":"stable-call-id"}
```

The quote result contains names, quantities, notes, customer and total in CAD cents.
Acceptance creates an unpaid restaurant order, stock movements, a kitchen batch
and a ticket atomically. Do not invent preparation times or mark a queued ticket
as physically printed. Never collect payment-card numbers through this API.

## Printer service

Install and pin python-escpos for a verified model/profile. Set:

- `JAWA_PRINTER_ENDPOINT`: direct HTTPS URL ending in `/api/printer`.
- `JAWA_PRINTER_TOKEN` and optional `JAWA_SITES_GATE_TOKEN`.
- `JAWA_PRINTER_HOST`: the configured store LAN printer address.
- `JAWA_PRINTER_PROFILE`: a tested python-escpos profile.
- `JAWA_PRINT_JOURNAL`: persistent local SQLite journal path.

```
python integrations/printer/bridge.py
```

GET retrieves a candidate job. The bridge writes its local attempt record before
claiming it. The POST claim response returns the frozen ticket snapshot; print
that response rather than a prior order fetch. Original, addition, cancellation
and copy events are distinctly labelled. Text is ASCII-sanitized; multilingual
paper output is not supported until device encoding tests pass.

The journal prevents blindly retrying attempted output. If an attempt is interrupted,
stop the worker and inspect the printer. Use the POS queue to confirm actual paper,
or record a reason and mark an unresolved claim uncertain. Queue a labelled copy
only after that review. A claimed or submitted job is not proof that paper emerged.
A bridge may still print an original before a racing cancellation; the subsequent
cancellation ticket communicates that change. This is not a guarantee of physically
exactly-once delivery.

## What has been tested

Standard-library tests exercise confirmation-state restart recovery, repeat-token
behaviour, handoff blocking, structured rejection, status lookup, separate service
headers, endpoint validation, redirect refusal and printable text sanitization.
TypeScript tests exercise signed quotes, replaced quotes, expiry recovery, duplicate
orders, queue ownership, snapshots and reconciliation. Python syntax is checked.
Actual LiveKit SDK imports, speech/model quality, SIP routing, human transfers and
physical hardware operation have not been verified in this environment.
