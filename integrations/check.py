"""Check configuration and SDK imports without making calls or printing.
--probe performs a read-only authenticated API GET; it never claims print jobs.
"""
import importlib
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit
sys.path.insert(0, str(Path(__file__).resolve().parent))
from shared_http import service_request


class ConfigError(Exception):
    pass


def check(scope, sdk_only=False):
    if scope not in ('voice', 'printer'):
        raise ConfigError('Choose voice or printer.')
    if not sdk_only:
        prefix = 'JAWA_' + scope.upper()
        names = [prefix + '_ENDPOINT', prefix + '_TOKEN']
        names += (['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'JAWA_STT_MODEL', 'JAWA_LLM_MODEL', 'JAWA_TTS_MODEL', 'JAWA_STAFF_PHONE', 'JAWA_VOICE_JOURNAL'] if scope == 'voice' else ['JAWA_PRINTER_HOST', 'JAWA_PRINTER_PROFILE', 'JAWA_PRINT_JOURNAL'])
        missing = [name for name in names if not os.environ.get(name, '').strip()]
        if missing:
            raise ConfigError('Fill these settings: ' + ', '.join(missing))
        url = urlsplit(os.environ[prefix + '_ENDPOINT'])
        if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment or url.path != '/api/' + scope:
            raise ConfigError('Configure an exact HTTPS endpoint ending in /api/' + scope)
        if len(os.environ[prefix + '_TOKEN']) < 32:
            raise ConfigError(prefix + '_TOKEN needs at least 32 characters.')
        if scope == 'voice' and not re.fullmatch(r'\+[1-9][0-9]{7,14}', os.environ['JAWA_STAFF_PHONE']):
            raise ConfigError('JAWA_STAFF_PHONE must be an E.164 number such as +14165550123.')
    if scope == 'voice':
        sys.path.insert(0, str(Path(__file__).resolve().parent / 'voice'))
        importlib.import_module('agent')
        from livekit.agents import inference
        inference.VAD()
    else:
        from escpos.printer import Network
        if not sdk_only:
            from escpos.capabilities import get_profile
            get_profile(os.environ['JAWA_PRINTER_PROFILE'])
    print(scope.title() + ' SDK check passed.' if sdk_only else scope.title() + ' configuration and SDK check passed. Live operation is not yet verified.')


if __name__ == '__main__':
    try:
        if len(sys.argv) != 3 or sys.argv[2] not in ('--check', '--probe', '--sdk-only'):
            raise ConfigError('Usage: python integrations/check.py voice|printer --check|--probe|--sdk-only')
        scope, option = sys.argv[1:]
        check(scope, option == '--sdk-only')
        if option == '--probe':
            service_request(scope.upper(), 'GET')
            print('Authenticated API GET passed. No order was placed and no print job was claimed.')
    except Exception as error:
        # Configuration errors contain variable names only; SDK/provider exceptions may contain secrets.
        print(str(error) if isinstance(error, ConfigError) else 'Check failed (' + type(error).__name__ + '). Review settings, dependencies, HTTPS and server credentials.', file=sys.stderr)
        sys.exit(1)
