#!/usr/bin/env bash
# Simple helper to start a static server and verify it's reachable
set -euo pipefail
cd "$(dirname "$0")"

PORT=8000
BIND=127.0.0.1
LOGFILE=server.log

echo "Starting static server on ${BIND}:${PORT} (logs -> ${LOGFILE})"
# Start in background using nohup so it survives exiting the shell if needed
nohup python3 -m http.server "${PORT}" --bind "${BIND}" > "${LOGFILE}" 2>&1 &
PID=$!
sleep 0.6
echo "Server PID: ${PID}"

echo "Waiting a moment then checking..."
sleep 0.6

if ss -ltnp 2>/dev/null | grep -q ":${PORT} "; then
  echo "Port ${PORT} is listening"
else
  echo "Warning: port ${PORT} is not listening. See ${LOGFILE} for errors." >&2
  echo "Contents of ${LOGFILE}:"
  sed -n '1,200p' "${LOGFILE}" || true
  exit 2
fi

echo "Fetching headers from http://${BIND}:${PORT}/index.html"
curl -I --max-time 5 "http://${BIND}:${PORT}/index.html" || {
  echo "curl failed to connect. Check firewall, bindings, and server log: ${LOGFILE}" >&2
  echo "Server log (last 80 lines):"
  tail -n 80 "${LOGFILE}" || true
  exit 3
}

echo "OK: server is reachable at http://${BIND}:${PORT}/index.html"
echo "To stop the server: kill ${PID}"
