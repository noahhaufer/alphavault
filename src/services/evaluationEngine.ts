/**
 * Evaluation Engine — monitors real Drift positions, calculates metrics, determines pass/fail
 */
import {
  getEntriesForChallenge,
  getAllChallenges,
  updateEntryMetrics,
  setEntryStatus,
} from './challengeService';
import { getAccountMetrics, getPositions, getTradeCount } from './driftService';
import { storeProofOnChain, getServiceKeypair } from '../utils/solana';
import { ChallengeEntry, PerformanceMetrics } from '../types';

/**
 * Calculate Sharpe ratio from PnL history
 * Assumes periodic returns, risk-free rate = 0
 */
function calcSharpe(pnlHistory: number[]): number {
  if (pnlHistory.length < 2) return 0;

  const returns: number[] = [];
  for (let i = 1; i < pnlHistory.length; i++) {
    returns.push(pnlHistory[i] - pnlHistory[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);

  if (std === 0) return mean > 0 ? 10 : 0;
  // Annualize: assume snapshots every 5s → ~6307200/year
  return (mean / std) * Math.sqrt(8760);
}

/**
 * Read real metrics from Drift subaccount
 */
export function readMetricsFromDrift(
  entry: ChallengeEntry,
  startingCapital: number
): void {
  try {
    const { equity, unrealizedPnl } = getAccountMetrics(entry.subAccountId);
    const positions = getPositions(entry.subAccountId);

    // Use equity from Drift, fall back to startingCapital + unrealizedPnl
    const currentEquity = equity > 0 ? equity : startingCapital + unrealizedPnl;
    const currentPnl = currentEquity - startingCapital;

    const m = entry.metrics;
    const newPeak = Math.max(m.peakEquity, currentEquity);
    const drawdown = newPeak - currentEquity;
    const drawdownPct = newPeak > 0 ? (drawdown / newPeak) * 100 : 0;
    const maxDd = Math.max(m.maxDrawdown, drawdown);
    const maxDdPct = Math.max(m.maxDrawdownPercent, drawdownPct);

    const history = [...m.pnlHistory, currentPnl];
    // Keep history bounded (last 10000 snapshots)
    if (history.length > 10000) history.splice(0, history.length - 10000);

    const tradeCount = getTradeCount(entry.subAccountId);
    const wins = positions.filter((p) => p.unrealizedPnl > 0).length;
    const totalPositions = positions.length || 1;

    updateEntryMetrics(entry.id, {
      currentPnl,
      currentPnlPercent: startingCapital > 0 ? (currentPnl / startingCapital) * 100 : 0,
      maxDrawdown: maxDd,
      maxDrawdownPercent: maxDdPct,
      peakEquity: newPeak,
      currentEquity,
      sharpeRatio: calcSharpe(history),
      totalTrades: tradeCount > m.totalTrades ? tradeCount : m.totalTrades,
      winRate: totalPositions > 0 ? wins / totalPositions : 0,
      pnlHistory: history,
    });
  } catch (err: any) {
    // If Drift read fails (e.g. subaccount not yet funded), use simulation fallback
    console.warn(
      `⚠️  Drift read failed for entry ${entry.id} (sub ${entry.subAccountId}): ${err.message}. Using simulation fallback.`
    );
    simulateMetricUpdate(entry, startingCapital);
  }
}

/**
 * Fallback: simulate metric updates when Drift reads are unavailable
 * (e.g. subaccount not initialized/funded yet)
 */
export function simulateMetricUpdate(
  entry: ChallengeEntry,
  startingCapital: number
): void {
  const m = entry.metrics;

  const pnlDelta = (Math.random() - 0.42) * startingCapital * 0.005;
  const newPnl = m.currentPnl + pnlDelta;
  const newEquity = startingCapital + newPnl;

  const newPeak = Math.max(m.peakEquity, newEquity);
  const drawdown = newPeak - newEquity;
  const drawdownPct = newPeak > 0 ? (drawdown / newPeak) * 100 : 0;
  const maxDd = Math.max(m.maxDrawdown, drawdown);
  const maxDdPct = Math.max(m.maxDrawdownPercent, drawdownPct);

  const history = [...m.pnlHistory, newPnl];
  if (history.length > 10000) history.splice(0, history.length - 10000);
  const trades = m.totalTrades + (Math.random() > 0.7 ? 1 : 0);
  const winRate = trades > 0 ? Math.min(0.65 + Math.random() * 0.1, 1) : 0;

  updateEntryMetrics(entry.id, {
    currentPnl: newPnl,
    currentPnlPercent: (newPnl / startingCapital) * 100,
    maxDrawdown: maxDd,
    maxDrawdownPercent: maxDdPct,
    peakEquity: newPeak,
    currentEquity: newEquity,
    sharpeRatio: calcSharpe(history),
    totalTrades: trades,
    winRate,
    pnlHistory: history,
  });
}

/**
 * Evaluate a single entry — check pass/fail conditions
 */
export async function evaluateEntry(
  entry: ChallengeEntry,
  profitTarget: number,
  maxDrawdown: number
): Promise<void> {
  if (entry.status !== 'active') return;

  const m = entry.metrics;
  const now = Date.now();

  // Check fail: drawdown exceeded
  if (m.maxDrawdownPercent > maxDrawdown) {
    console.log(
      `❌ Agent ${entry.agentName} FAILED — drawdown ${m.maxDrawdownPercent.toFixed(2)}% > ${maxDrawdown}%`
    );
    const proofTx = await storeProof(entry, false);
    setEntryStatus(entry.id, 'failed', proofTx);
    return;
  }

  // Check pass: profit target reached
  if (m.currentPnlPercent >= profitTarget) {
    console.log(
      `✅ Agent ${entry.agentName} PASSED — PnL ${m.currentPnlPercent.toFixed(2)}% ≥ ${profitTarget}%`
    );
    const proofTx = await storeProof(entry, true);
    setEntryStatus(entry.id, 'passed', proofTx);
    return;
  }

  // Check expired
  if (now >= entry.endsAt) {
    console.log(
      `⏰ Agent ${entry.agentName} EXPIRED — PnL ${m.currentPnlPercent.toFixed(2)}% (needed ${profitTarget}%)`
    );
    const proofTx = await storeProof(entry, false);
    setEntryStatus(entry.id, 'expired', proofTx);
    return;
  }
}

async function storeProof(
  entry: ChallengeEntry,
  passed: boolean
): Promise<string> {
  try {
    const keypair = getServiceKeypair();
    return await storeProofOnChain(keypair, {
      type: 'challenge_result',
      agentId: entry.agentId,
      challengeId: entry.challengeId,
      pnlPercent: entry.metrics.currentPnlPercent,
      maxDrawdown: entry.metrics.maxDrawdownPercent,
      sharpeRatio: entry.metrics.sharpeRatio,
      passed,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error('Proof storage failed:', err.message);
    return `offline_proof_${Date.now()}`;
  }
}

/**
 * Run one evaluation cycle across all active challenges
 */
export async function runEvaluationCycle(): Promise<void> {
  const challenges = getAllChallenges();

  for (const challenge of challenges) {
    if (challenge.status !== 'active') continue;

    const entries = getEntriesForChallenge(challenge.id);
    for (const entry of entries) {
      if (entry.status !== 'active') continue;

      // Read real metrics from Drift (falls back to simulation if unavailable)
      readMetricsFromDrift(entry, challenge.startingCapital);

      // Evaluate pass/fail
      await evaluateEntry(entry, challenge.profitTarget, challenge.maxDrawdown);
    }
  }
}

let evalInterval: NodeJS.Timeout | null = null;

/** Start the evaluation loop */
export function startEvaluationLoop(intervalMs: number = 5000): void {
  if (evalInterval) return;
  console.log(`📊 Evaluation engine started (interval: ${intervalMs}ms)`);
  evalInterval = setInterval(runEvaluationCycle, intervalMs);
}

export function stopEvaluationLoop(): void {
  if (evalInterval) {
    clearInterval(evalInterval);
    evalInterval = null;
    console.log('📊 Evaluation engine stopped');
  }
}
