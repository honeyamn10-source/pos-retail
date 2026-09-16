"""Durable per-call confirmation state, independent of the speech model."""
import json
import os
import sqlite3
import threading


class OrderSession:
    def __init__(self, call_id, path, request):
        self.call_id = call_id
        self.request = request
        self.lock = threading.Lock()
        self.db = sqlite3.connect(path, check_same_thread=False)
        if path != ":memory:":
            os.chmod(path, 0o600)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.execute("CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY, payload TEXT NOT NULL)")
        row = self.db.execute("SELECT payload FROM calls WHERE id=?", (call_id,)).fetchone()
        self.state = json.loads(row[0]) if row else {"phase": "draft", "quoteToken": None}

    def save(self, **changes):
        self.state.update(changes)
        self.db.execute("INSERT INTO calls VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", (self.call_id, json.dumps(self.state)))
        self.db.commit()

    def status(self):
        with self.lock:
            result = self.request("POST", {"action": "status", "callId": self.call_id})
            if result.get("status") == "accepted":
                self.save(phase="accepted", result=result)
            return result

    def quote(self, draft):
        with self.lock:
            if self.state["phase"] in ("confirming", "unknown", "accepted", "handoff"):
                return {"error": "Resolve the existing confirmation or staff handoff before starting another order.", "phase": self.state["phase"]}
            self.save(phase="draft", quoteToken=None)
            result = self.request("POST", {"action": "quote", "draft": {**draft, "callId": self.call_id}})
            self.save(phase="quoted", quoteToken=result["quoteToken"])
            return {k: v for k, v in result.items() if k != "quoteToken"}

    def confirm(self, customer_said_yes):
        with self.lock:
            if not customer_said_yes or not self.state.get("quoteToken") or self.state["phase"] == "handoff":
                return {"error": "Read back a valid quote and obtain an explicit yes first."}
            if self.state["phase"] == "accepted":
                return self.request("POST", {"action": "status", "callId": self.call_id})
            self.save(phase="confirming")  # Commit before the network side effect.
            try:
                result = self.request("POST", {"action": "confirm", "quoteToken": self.state["quoteToken"], "confirmed": True})
            except Exception as error:
                # A crash in 'confirming' is recovered exactly like 'unknown'.
                self.save(phase="quoted" if getattr(error, "definitive", False) else "unknown")
                raise
            if result.get("status") != "accepted":
                self.save(phase="unknown")
                raise RuntimeError("No accepted order acknowledgement received")
            self.save(phase="accepted", result=result)
            return result

    def pause_for_handoff(self):
        with self.lock:
            self.save(phase="handoff")

    def close(self):
        self.db.close()
