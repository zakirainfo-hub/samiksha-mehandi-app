#!/bin/bash
# Double-click this file to start the website.
# Keep the Terminal window open while you use the site.
# Press Control + C in that window to stop it.

cd "$(dirname "$0")" || exit 1

# macOS marks downloaded files as "quarantined"; clear it for this folder
xattr -dr com.apple.quarantine . 2>/dev/null

clear
echo ""
echo "  Samiksha's Mehendi Art"
echo "  ------------------------------------------------"

# --- find node, including the usual install spots that a double-clicked
#     Terminal sometimes doesn't have on its PATH ---
if ! command -v node >/dev/null 2>&1; then
  for p in /usr/local/bin /opt/homebrew/bin /usr/bin "$HOME/.nvm/versions/node"/*/bin; do
    [ -x "$p/node" ] && export PATH="$p:$PATH" && break
  done
fi

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js is not installed on this Mac yet."
  echo ""
  echo "    1. Go to   https://nodejs.org"
  echo "    2. Click the big green LTS button and install it"
  echo "    3. Double-click this file again"
  echo ""
  read -r -p "  Press Return to close. "
  exit 1
fi

echo "  Using Node $(node -v)"
echo "  Starting…"
echo ""

rm -f .port

# wait for the server to report its port, then open the browser
(
  for _ in $(seq 1 40); do
    if [ -s .port ]; then
      sleep 0.4
      open "http://localhost:$(cat .port)" 2>/dev/null
      exit 0
    fi
    sleep 0.25
  done
) &

node server.js
STATUS=$?

echo ""
if [ $STATUS -ne 0 ]; then
  echo "  The server stopped with an error (code $STATUS)."
  echo "  Copy the message above and send it over — it says what went wrong."
else
  echo "  The website has stopped."
fi
echo ""
read -r -p "  Press Return to close this window. "
