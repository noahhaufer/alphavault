/**
 * AlphaVault Demo Trading Agent
 *
 * Demonstrates the full lifecycle:
 *   1. List challenges
 *   2. Enter the Starter Challenge
 *   3. Run a momentum strategy on SOL-PERP
 *   4. Check status & leaderboard
 *   5. Print results
 */

import { MomentumStrategy, Signal } from './strategy';

const BASE = process.env.ALPHAVAULT_URL || 'http://localhost:3000';
const AGENT_ID = 'demo-agent-001';
const AGENT_NAME = 'MomentumBot v1';
const TRADE_SIZE = 0.1; // SOL
const TRADE_CYCLES = parseInt(process.env.TRADE_CYCLES || '5', 10);
const CYCLE_INTERVAL_MS = parseInt(process.env.CYCLE_INTERVAL_MS || '15000', 10);

// ─── Helpers ─────────────────────────────────────────────────────

async function api<T = any>(method: string, path: string, body?: any): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as { success: boolean; data?: T; error?: string };
  if (!json.success) {
    throw new Error(`API ${method} ${path} failed: ${json.error}`);
  }
  return json.data as T;
}

function banner(text: string): void {
  const line = '═'.repeat(56);
  console.log(`\n╔${line}╗`);
  console.log(`║  ${text.padEnd(54)}║`);
  console.log(`╚${line}╝`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Fetch SOL price from CoinGecko (free, no key)
async function fetchSolPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const json = await res.json() as { solana: { usd: number } };
    return json.solana.usd;
  } catch {
    // Fallback: random walk around ~$200
    return 195 + Math.random() * 10;
  }
}

// ─── Main Agent ──────────────────────────────────────────────────

async function main(): Promise<void> {
  banner('🏦 AlphaVault Demo Trading Agent');
  console.log(`\n  Agent:    ${AGENT_NAME} (${AGENT_ID})`);
  console.log(`  Server:   ${BASE}`);
  console.log(`  Strategy: Momentum (SMA crossover)`);
  console.log(`  Size:     ${TRADE_SIZE} SOL per trade`);
  console.log(`  Cycles:   ${TRADE_CYCLES}`);

  // ── Step 1: Health check ──
  console.log('\n⏳ Checking server health...');
  const healthRes = await fetch(`${BASE}/health`);
  const health = await healthRes.json() as any;
  console.log(`✅ Server: ${health.service} v${health.version} (${health.network})`);

  // ── Step 2: List challenges ──
  banner('📋 Available Challenges');
  const challenges = await api<any[]>('GET', '/challenges');
  for (const c of challenges) {
    console.log(`\n  📌 ${c.name}`);
    console.log(`     ${c.description}`);
    console.log(`     Capital: $${c.startingCapital.toLocaleString()} | Phase ${c.phase} | Target: ${c.profitTarget}% | Daily Loss: ${c.maxDailyLoss}% | Total Loss: ${c.maxTotalLoss}% | Fee: $${c.challengeFee}`);
  }

  // ── Step 3: Enter Starter Challenge ──
  const starter = challenges.find((c: any) => c.startingCapital === 10000 && c.phase === 1);
  if (!starter) throw new Error('$10k Challenge Phase 1 not found!');

  banner('🚀 Entering Starter Challenge');
  const enterResult = await api('POST', `/challenges/${starter.id}/enter`, {
    agentId: AGENT_ID,
    agentName: AGENT_NAME,
  });
  const entry = enterResult.entry;
  const entryId = entry.id;
  console.log(`\n  ✅ Entry ID:       ${entryId}`);
  console.log(`  📂 SubAccount:    ${entry.subAccountId}`);
  console.log(`  🔑 Authority:     ${entry.authority}`);
  console.log(`  ⏰ Ends:          ${new Date(entry.endsAt).toISOString()}`);
  console.log(`  💰 Start Capital: $${enterResult.driftConfig.startingCapital.toLocaleString()}`);

  // ── Step 4: Run momentum strategy ──
  banner('📈 Trading — Momentum Strategy');
  const strategy = new MomentumStrategy(3, 5);

  // Pre-seed some prices for the strategy to have context
  console.log('\n  🔍 Gathering initial price data...');
  for (let i = 0; i < 5; i++) {
    const price = await fetchSolPrice();
    strategy.addPrice(price);
    console.log(`     Price #${i + 1}: $${price.toFixed(2)}`);
    if (i < 4) await sleep(2000);
  }

  let tradesPlaced = 0;
  for (let cycle = 1; cycle <= TRADE_CYCLES; cycle++) {
    console.log(`\n  ── Cycle ${cycle}/${TRADE_CYCLES} ──`);

    const price = await fetchSolPrice();
    strategy.addPrice(price);
    const state = strategy.getState();
    const signal = state.signal;

    console.log(`  💲 SOL Price:  $${price.toFixed(2)}`);
    console.log(`  📊 Short SMA:  $${state.shortSMA.toFixed(2)}`);
    console.log(`  📊 Long SMA:   $${state.longSMA.toFixed(2)}`);
    console.log(`  🎯 Signal:     ${signal.toUpperCase()}`);

    if (signal === 'neutral') {
      console.log(`  ⏸️  No trade — signal neutral`);
    } else {
      try {
        const orderResult = await api('POST', '/trading/order', {
          agentId: AGENT_ID,
          entryId,
          side: signal,
          size: TRADE_SIZE,
          orderType: 'market',
        });
        tradesPlaced++;
        console.log(`  ✅ Order placed: ${signal.toUpperCase()} ${TRADE_SIZE} SOL-PERP`);
        console.log(`     TX: ${orderResult.txSignature?.slice(0, 20) || 'simulated'}...`);
      } catch (err: any) {
        console.log(`  ⚠️  Order failed: ${err.message}`);
      }
    }

    // Check positions
    try {
      const posData = await api('GET', `/trading/positions/${entryId}`);
      if (posData.positions?.length > 0) {
        for (const p of posData.positions) {
          console.log(`  📊 Position: ${p.direction} ${p.baseAssetAmount} SOL (PnL: $${p.unrealizedPnl?.toFixed(2) || '0.00'})`);
        }
      }
    } catch {
      // Positions may not be available without full Drift init
    }

    if (cycle < TRADE_CYCLES) {
      console.log(`  ⏳ Waiting ${CYCLE_INTERVAL_MS / 1000}s...`);
      await sleep(CYCLE_INTERVAL_MS);
    }
  }

  // ── Step 5: Check status ──
  banner('📊 Challenge Status');
  try {
    const status = await api('GET', `/challenges/${starter.id}/status/${AGENT_ID}`);
    console.log(`\n  Agent:        ${status.agentName}`);
    console.log(`  Status:       ${status.status}`);
    console.log(`  PnL:          ${status.metrics.currentPnlPercent.toFixed(2)}%`);
    console.log(`  Max Drawdown: ${status.metrics.maxDrawdownPercent.toFixed(2)}%`);
    console.log(`  Equity:       $${status.metrics.currentEquity.toLocaleString()}`);
    console.log(`  Trades:       ${tradesPlaced} placed`);
  } catch (err: any) {
    console.log(`  ⚠️  ${err.message}`);
  }

  // ── Step 6: Leaderboard ──
  banner('🏆 Leaderboard');
  try {
    const lb = await api('GET', `/challenges/${starter.id}/leaderboard`);
    console.log(`\n  Challenge: ${lb.challenge}`);
    if (lb.leaderboard.length === 0) {
      console.log('  (No entries yet)');
    }
    for (const entry of lb.leaderboard) {
      const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '  ';
      console.log(`  ${medal} #${entry.rank} ${entry.agentName.padEnd(20)} PnL: ${entry.pnlPercent.toFixed(2)}% | DD: ${entry.maxDrawdown.toFixed(2)}% | Status: ${entry.status}`);
    }
  } catch (err: any) {
    console.log(`  ⚠️  ${err.message}`);
  }

  // ── Extended Results ──
  banner('📊 Extended Results');
  try {
    const status = await api('GET', `/challenges/${starter.id}/status/${AGENT_ID}`);
    const m = status.metrics;
    const pnl = m.currentPnlPercent;
    const maxDD = m.maxDrawdownPercent;
    const sharpe = m.sharpeRatio;
    const equity = m.currentEquity;

    console.log(`\n  ┌─────────────────────────────────────┐`);
    console.log(`  │  FINAL TRADING REPORT                │`);
    console.log(`  ├─────────────────────────────────────┤`);
    console.log(`  │  Cycles:        ${String(TRADE_CYCLES).padEnd(20)}│`);
    console.log(`  │  Trades Placed: ${String(tradesPlaced).padEnd(20)}│`);
    console.log(`  │  Final PnL:     ${(pnl.toFixed(2) + '%').padEnd(20)}│`);
    console.log(`  │  Max Drawdown:  ${(maxDD.toFixed(2) + '%').padEnd(20)}│`);
    console.log(`  │  Sharpe Ratio:  ${sharpe.toFixed(4).padEnd(20)}│`);
    console.log(`  │  Final Equity:  ${('$' + equity.toLocaleString()).padEnd(20)}│`);
    console.log(`  └─────────────────────────────────────┘`);
  } catch (err: any) {
    console.log(`  ⚠️  Could not fetch final metrics: ${err.message}`);
    console.log(`  Trades placed: ${tradesPlaced} across ${TRADE_CYCLES} cycles`);
  }

  // ── Done ──
  banner('✅ Demo Complete!');
  console.log(`\n  AlphaVault demo agent ran ${TRADE_CYCLES} cycles with ${tradesPlaced} trades.`);
  console.log('  This demonstrates the full challenge lifecycle:');
  console.log('    1. Browse challenges → 2. Enter → 3. Trade → 4. Evaluate → 5. Rank');
  console.log('\n  In production, agents trade with real Drift subaccounts on Solana devnet/mainnet.');
  console.log('  Top performers earn funded accounts managed via Drift Vaults.\n');
}

main().catch((err) => {
  console.error('❌ Agent failed:', err.message);
  process.exit(1);
});
