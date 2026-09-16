#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 24 LTS from https://nodejs.org/en/download then reopen this file.'
  read -r -p 'Press Enter to close. ' _jawa_reply
  exit 1
fi
node scripts/start-local.mjs
_jawa_status=$?
if [ "$_jawa_status" -ne 0 ]; then
  read -r -p 'Press Enter to close. ' _jawa_reply
fi
exit "$_jawa_status"
