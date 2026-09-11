"""Local ESC/POS bridge foundation. No automatic retries of uncertain output.

Requires approved service ingress, a configured supported network printer,
and python-escpos. The hosted private pilot does not enable this service.
"""
import json
import os
import sqlite3
import time
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from shared_http import service_request
import uuid


def safe_text(value):
    # Never allow an order note to inject ESC/POS control commands.
    return "".join(c for c in str(value) if c == "\n" or (32 <= ord(c) <= 126))[:2000]


def render(order, kind, event="order"):
    lines = ["JAWA POS - " + kind.upper(), event.upper(), "#" + str(order["number"]), safe_text(order["reference"])]
    if order.get("externalId"):
        lines.append(safe_text(order.get("channel", "")) + " / " + safe_text(order["externalId"]))
    if order.get("paymentMethod") == "external":
        lines.append("PLATFORM COLLECTED - DO NOT COLLECT CASH")
    for line in order["lines"]:
        lines.append(f'{line["qty"]} x {safe_text(line["name"])}')
        if line.get("note"):
            lines.append("  " + safe_text(line["note"]))
    if order.get("notes"):
        lines += ["STAFF NOTES", safe_text(order["notes"])]
    if kind == "receipt":
        lines += [f'CAD {order["total"] / 100:.2f}', order["status"].upper(), "TRAINING RECEIPT"]
    return "\n".join(lines) + "\n\n"


def api(method, payload=None):
    return service_request("PRINTER", method, payload)


def main():
    from escpos.printer import Network
    for name in ("JAWA_PRINTER_ENDPOINT", "JAWA_PRINTER_TOKEN", "JAWA_PRINTER_HOST", "JAWA_PRINTER_PROFILE"):
        if not os.environ.get(name):
            raise RuntimeError("Configure " + name)
    journal = sqlite3.connect(os.environ.get("JAWA_PRINT_JOURNAL", "jawa-print-journal.sqlite"))
    journal.execute("PRAGMA journal_mode=WAL")
    journal.execute("PRAGMA synchronous=FULL")
    journal.execute("CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, claim_id TEXT NOT NULL, status TEXT NOT NULL)")
    while True:
        try:
            candidate = api("GET")
            job = candidate.get("job")
            if not job:
                time.sleep(2)
                continue
            # A prior attempt requires operator reconciliation, never a blind retry.
            if journal.execute("SELECT 1 FROM jobs WHERE id=?", (job["id"],)).fetchone():
                print("Queue job needs operator review:", job["id"], flush=True)
                time.sleep(5)
                continue
            claim_id = str(uuid.uuid4())
            journal.execute("INSERT INTO jobs VALUES(?,?,'uncertain')", (job["id"], claim_id))
            journal.commit()
            claimed = api("POST", {"action": "claim", "id": claim_id, "jobId": job["id"]})
            status = "uncertain"
            printer = None
            try:
                printer = Network(os.environ["JAWA_PRINTER_HOST"], profile=os.environ["JAWA_PRINTER_PROFILE"], timeout=5)
                printer.text(render(claimed["order"], job["kind"], claimed["job"].get("event", "order")))
                printer.cut()
                status = "submitted"  # Transport returned; actual paper is not proven.
            finally:
                if printer:
                    printer.close()
                journal.execute("UPDATE jobs SET status=? WHERE id=?", (status, job["id"]))
                journal.commit()
                api("POST", {"action": "result", "id": claim_id + "-result", "jobId": job["id"], "claimId": claim_id, "status": status})
        except Exception as error:
            # Exclude requests, tokens, customer details, and full exception text.
            print("Printer bridge needs attention:", type(error).__name__, flush=True)
            time.sleep(5)


if __name__ == "__main__":
    main()
