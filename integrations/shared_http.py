"""Bounded HTTPS JSON transport for configured Jawa service endpoints."""
import json
import os
import urllib.error
import urllib.parse
import urllib.request


class ServiceError(RuntimeError):
    def __init__(self, message, definitive=False):
        super().__init__(message)
        self.definitive = definitive


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward either credential to a redirect target or sign-in page.
        raise ServiceError("Service endpoint redirected. Check the configured connection.")


def request_json(endpoint, token, method, payload=None, gate_token=None):
    parsed = urllib.parse.urlsplit(endpoint)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.fragment or parsed.query:
        raise ServiceError("Configure a direct HTTPS service endpoint without URL credentials or query parameters.", True)
    if len(token) < 32:
        raise ServiceError("Configure a service token of at least 32 characters.", True)
    headers = {"Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json"}
    if gate_token:
        # Optional platform-issued service access token supplied by the owner.
        headers["OAI-Sites-Authorization"] = "Bearer " + gate_token
    request = urllib.request.Request(endpoint, method=method, headers=headers,
                                     data=json.dumps(payload).encode() if payload is not None else None)
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=15) as response:
            if response.headers.get_content_type() != "application/json":
                raise ServiceError("Service did not return JSON. Check access configuration.")
            body = response.read(256001)
            if len(body) > 256000:
                raise ServiceError("Service response exceeds limit.")
            value = json.loads(body)
            if not isinstance(value, dict):
                raise ServiceError("Invalid service response.")
            return value
    except urllib.error.HTTPError as error:
        # Only a structured 4xx rejection is a definite non-commit. Login pages,
        # proxy failures and timeouts must leave confirmation outcomes unknown.
        definitive = 400 <= error.code < 500 and error.code not in (408, 429)
        message = "Service request failed. Check the connection or retry the same action."
        try:
            body = error.read(20001)
            value = json.loads(body) if len(body) <= 20000 else {}
            reason = value.get("error") if isinstance(value, dict) else None
            if isinstance(reason, str):
                message = reason[:300]
            else:
                definitive = False
        except (ValueError, OSError):
            definitive = False
        raise ServiceError(message, definitive) from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
        raise ServiceError("Connection interrupted; the submission outcome may be unknown.") from None


def service_request(scope, method, payload=None):
    return request_json(os.environ["JAWA_" + scope + "_ENDPOINT"], os.environ["JAWA_" + scope + "_TOKEN"], method, payload, os.environ.get("JAWA_SITES_GATE_TOKEN"))
