#!/usr/bin/env bash
set -euo pipefail

# Extended Trading Test — 20 cycles, 15s intervals
# Starts the server, runs the agent, prints results

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

export TRADE_CYCLES="${TRADE_CYCLES:-20}"
export CYCLE_INTERVAL_MS="${CYCLE_INTERVAL_MS:-15000}"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  AlphaVault Extended Trading Test                      ║"
echo "║  Cycles: $TRADE_CYCLES | Interval: ${CYCLE_INTERVAL_MS}ms                    ║"
echo "╚════════════════════════════════════════════════════════╝"

# Build first
echo "📦 Building TypeScript..."
npx tsc 2>&1 || true

# Start server in background
echo "🚀 Starting server..."
node dist/index.js &
SERVER_PID=$!

# Cleanup on exit
cleanup() {
  echo "🛑 Stopping server (PID $SERVER_PID)..."
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for server to be ready
echo "⏳ Waiting for server..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server ready!"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ Server failed to start"
    exit 1
  fi
  sleep 1
done

# Run the trading agent
echo ""
echo "🤖 Starting extended trading agent ($TRADE_CYCLES cycles)..."
echo ""

node dist/agent/tradingAgent.js
EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Extended test completed successfully!"
else
  echo "❌ Extended test failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
