# Start your Jawa kit

This is the installable pilot. Cash checkout, inventory, kitchen and local reports
can be tried now. It is not the finished commercial package.

## First time: one computer

1. Install **Node.js 24 LTS** from https://nodejs.org/en/download.
2. Extract the entire Restaurant or Retail **Server Kit** ZIP to a permanent,
   writable folder, for example Documents/Jawa-Restaurant. Do not run inside the ZIP.
3. Start the matching file:

| Computer | Start file |
| --- | --- |
| Windows | Double-click `START_JAWA.cmd` |
| Mac | Open `START_JAWA.command`. If execution permission is missing, open Terminal in the kit folder and run `bash START_JAWA.command`. |
| Linux | Open a terminal in the kit folder and run `bash START_JAWA.sh`. |

4. Keep the launch window open. Your browser opens when the server is ready.
   Copy the **one-time installation token** shown in that window into the setup
   form. Choose your owner username and a password of at least 12 characters.
5. Add your products and prices in Inventory. Review store hours, timezone,
   reporting cutoff and tax settings. Open a cash shift before the first cash sale.
   Try a sale, receipt, refund, stock check and backup using test data first.

New restaurant kits open at http://localhost:8787; new retail kits use
http://localhost:8788. Follow the address in the launch window if you configure
another port. Keep the kits in separate folders: each has its own accounts/data.
Existing `.env.server` configuration takes precedence. No API key, npm install,
cloud database or paid hosting is needed for this local prebuilt core.

## Every day

Run the same start file, sign in and use your register. At closing, reconcile the
cash shift and download an encrypted backup from **Account & server**. Keep the
passphrase separately and copy the backup off this computer. Close Jawa with
Ctrl+C in the launch window after finishing work. Start it again after a reboot.
Closing the browser does not stop the server; closing the server stops access.

Keep your installation folder and its `data` folder. Do not delete them when
upgrading. Follow backup/recovery instructions before changing installations.
Automatic daily backups on the same computer do not protect against losing it.

## If something does not open

- **Node missing/too old:** install Node.js 24 LTS and reopen the launch window.
- **Built application missing:** use the prebuilt Server Kit. GitHub's green
  Code → Download ZIP is source and needs the build steps in SERVER_INSTALL.md.
- **Port already in use:** another server may already be open. Close the duplicate
  window; do not delete data. Custom ports need matching JAWA_PORT/JAWA_ORIGIN.
- **Browser stays closed:** paste the address printed in the launch window.
- **Permission denied:** extract to a folder your own account can write to.
- **Need a phone, second till or online customers to connect:** localhost works
  only on the server computer. Use the HTTPS server/domain steps in SERVER_INSTALL.md.
  Do not open the raw Node port publicly.

For a configuration check without starting anything:
`node scripts/start-local.mjs --check`.

## What still needs work

Card payments/terminals and native DoorDash, Uber Eats and Skip connections are
unfinished. Phone ordering requires provider accounts and a real-call test;
physical printing requires a configured bridge and printer tests. Long-term
storage, disconnected-terminal sales, multi-store operation and other commercial
features remain unfinished. The current limit is 1,000 orders and 2,000 products,
with a 1.8 MB store-data ceiling. See SERVER_INSTALL.md and
COMMERCIAL_LAUNCH_CHECKLIST.md before using this for live business.
