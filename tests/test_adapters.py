import io
import json
from pathlib import Path
import sqlite3
import sys
import tempfile
import unittest
import urllib.request
from unittest.mock import patch
from email.message import Message
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations' / 'voice'))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'integrations' / 'printer'))
from shared_http import NoRedirect, ServiceError, request_json
from order_session import OrderSession
from bridge import render, safe_text


class AdapterTests(unittest.TestCase):
    def test_unknown_confirmation_survives_restart_and_reuses_identical_token(self):
        calls = []
        def api(method, body=None):
            calls.append(body)
            if body['action'] == 'quote':
                return {'quoteToken': 'signed-quote', 'totalCents': 100}
            if len([c for c in calls if c['action'] == 'confirm']) == 1:
                raise TimeoutError()
            return {'status': 'accepted', 'orderNumber': '1001'}
        with tempfile.TemporaryDirectory() as directory:
            path = str(Path(directory) / 'calls.sqlite')
            session = OrderSession('call-1', path, api)
            self.assertNotIn('quoteToken', session.quote({'items': []}))
            with self.assertRaises(TimeoutError):
                session.confirm(True)
            self.assertEqual(session.state['phase'], 'unknown')
            self.assertIn('error', session.quote({'items': []}))
            session.close()
            resumed = OrderSession('call-1', path, api)
            self.assertEqual(resumed.confirm(True)['status'], 'accepted')
            confirmations = [c for c in calls if c['action'] == 'confirm']
            self.assertEqual(confirmations[0], confirmations[1])
            resumed.close()

    def test_no_confirmation_without_yes_or_after_staff_handoff(self):
        calls = []
        def api(method, body):
            calls.append(body)
            return {'quoteToken': 'signed', 'totalCents': 100}
        session = OrderSession('call', ':memory:', api)
        self.assertIn('error', session.confirm(True))
        session.quote({'items': []})
        self.assertIn('error', session.confirm(False))
        session.pause_for_handoff()
        self.assertIn('error', session.confirm(True))
        self.assertIn('error', session.quote({'items': []}))
        self.assertEqual(len(calls), 1)
        session.close()

    def test_current_status_recovers_accepted_order_without_resubmitting(self):
        calls = []
        def api(method, body):
            calls.append(body)
            return {'status': 'accepted', 'orderNumber': '1001', 'kitchen': 'ready'}
        session = OrderSession('call', ':memory:', api)
        session.save(phase='unknown', quoteToken='signed')
        self.assertEqual(session.status()['kitchen'], 'ready')
        self.assertEqual(session.state['phase'], 'accepted')
        session.confirm(True)
        self.assertEqual([c['action'] for c in calls], ['status', 'status'])
        session.close()

    def test_definitive_rejection_permits_a_requote(self):
        def api(method, body):
            if body['action'] == 'quote':
                return {'quoteToken': 'signed'}
            raise ServiceError('Stock unavailable', definitive=True)
        session = OrderSession('call', ':memory:', api)
        session.quote({'items': []})
        with self.assertRaises(ServiceError):
            session.confirm(True)
        self.assertEqual(session.state['phase'], 'quoted')
        self.assertNotIn('error', session.quote({'items': []}))
        session.close()

    def test_redirect_is_blocked_without_forwarding_credentials(self):
        request = urllib.request.Request('https://service.example', headers={'Authorization': 'Bearer secret'})
        with self.assertRaises(ServiceError):
            NoRedirect().redirect_request(request, None, 302, '', {}, 'https://other.example')

    def test_bad_endpoint_and_short_token_fail_before_network(self):
        for endpoint in ['http://example.com', 'https://user:password@example.com', 'https://example.com?secret=1', 'https://example.com#x']:
            with self.assertRaises(ServiceError):
                request_json(endpoint, 'x' * 32, 'GET')
        with self.assertRaises(ServiceError):
            request_json('https://example.com', 'short', 'GET')

    def test_supported_gate_header_and_service_token_are_separate(self):
        headers = Message(); headers['Content-Type'] = 'application/json'
        response = unittest.mock.MagicMock()
        response.__enter__.return_value = response
        response.headers = headers
        response.read.return_value = b'{"status":"accepted"}'
        with patch('urllib.request.build_opener') as opener:
            opener.return_value.open.return_value = response
            request_json('https://service.example/api/voice', 'x' * 32, 'POST', {'action': 'status'}, gate_token='platform-issued')
            request = opener.return_value.open.call_args.args[0]
            self.assertEqual(request.get_header('Authorization'), 'Bearer ' + 'x' * 32)
            self.assertEqual(request.get_header('Oai-sites-authorization'), 'Bearer platform-issued')

    def test_printer_labels_event_and_strips_control_commands(self):
        order = {'number': 1001, 'reference': 'Table 1', 'lines': [{'qty': 1, 'name': 'Fries', 'note': 'Crispy\x1b\x00'}], 'notes': '', 'total': 622, 'status': 'unpaid'}
        output = render(order, 'kitchen', 'addition')
        self.assertIn('ADDITION', output)
        self.assertIn('Crispy', output)
        self.assertNotIn('\x1b', output)
        self.assertNotIn('\x00', output)
        self.assertIn('REPRINT', render(order, 'receipt', 'reprint'))
        self.assertEqual(safe_text('a\x1bb'), 'ab')


if __name__ == '__main__':
    unittest.main()
