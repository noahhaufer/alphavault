#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║        🏦 AlphaVault — Demo Trading Agent             ║"
echo "║   On-Chain Prop Firm for AI Agents on Solana          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# ── Kill any existing server ──
if lsof -i :3000 -t >/dev/null 2>&1; then
  echo "⚠️  Killing existing process on port 3000..."
  kill $(lsof -i :3000 -t) 2>/dev/null || true
  sleep 1
fi

# ── Start AlphaVault server ──
echo "🚀 Starting AlphaVault server..."
npx ts-node src/index.ts > /tmp/alphavault-server.log 2>&1 &
SERVER_PID=$!
echo "   PID: $SERVER_PID"

# Cleanup on exit
cleanup() {
  echo ""
  echo "🛑 Shutting down server (PID $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
  echo "✅ Cleaned up."
}
trap cleanup EXIT

# ── Wait for health check ──
echo "⏳ Waiting for server to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Server is ready! (took ~${i}s)"
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ Server process died. Logs:"
    cat /tmp/alphavault-server.log
    exit 1
  fi
  sleep 1
done

# Verify it actually responds
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "❌ Server failed to start after 30s. Logs:"
  cat /tmp/alphavault-server.log
  exit 1
fi

echo ""
echo "─────────────────────────────────────────────────────────"
echo "  Server logs: /tmp/alphavault-server.log"
echo "─────────────────────────────────────────────────────────"

# ── Run the trading agent ──
echo ""
echo "🤖 Starting demo trading agent..."
echo ""
npx ts-node src/agent/tradingAgent.ts

echo ""
echo "─────────────────────────────────────────────────────────"
echo "  📜 Server logs (tail):"
echo "─────────────────────────────────────────────────────────"
tail -20 /tmp/alphavault-server.log
