/**
 * Evaluation Engine — monitors positions, calculates metrics, determines pass/fail
 */
import {
  getEntriesForChallenge,
  getAllChallenges,
  updateEntryMetrics,
  setEntryStatus,
  getEntry,
} from './challengeService';
import { storeProofOnChain, getServiceKeypair } from '../utils/solana';
import { ChallengeEntry, PerformanceMetrics } from '../types';

/**
 * Calculate Sharpe ratio from PnL history
 * Assumes daily returns, risk-free rate = 0
 */
function calcSharpe(pnlHistory: number[]): number {
  if (pnlHistory.length < 2) return 0;

  // Convert cumulative PnL to period returns
  const returns: number[] = [];
  for (let i = 1; i < pnlHistory.length; i++) {
    returns.push(pnlHistory[i] - pnlHistory[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
  const std = Math.sqrt(variance);

  if (std === 0) return mean > 0 ? 10 : 0;
  // Annualize: assume hourly snapshots → sqrt(8760)
  return (mean / std) * Math.sqrt(8760);
}

/**
 * Simulate metric updates for demo purposes.
 * In production, this would read from Drift SDK subaccount positions.
 */
export function simulateMetricUpdate(entry: ChallengeEntry, startingCapital: number): void {
  const elapsed = (Date.now() - entry.startedAt) / 3600_000; // hours
  const m = entry.metrics;

  // Random walk with slight positive drift (simulates a decent agent)
  const pnlDelta = (Math.random() - 0.42) * startingCapital * 0.005;
  const newPnl = m.currentPnl + pnlDelta;
  const newEquity = startingCapital + newPnl;

  const newPeak = Math.max(m.peakEquity, newEquity);
  const drawdown = newPeak - newEquity;
  const drawdownPct = (drawdown / newPeak) * 100;
  const maxDd = Math.max(m.maxDrawdown, drawdown);
  const maxDdPct = Math.max(m.maxDrawdownPercent, drawdownPct);

  const history = [...m.pnlHistory, newPnl];
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
    console.log(`❌ Agent ${entry.agentName} FAILED — drawdown ${m.maxDrawdownPercent.toFixed(2)}% > ${maxDrawdown}%`);
    const proofTx = await storeProof(entry, false);
    setEntryStatus(entry.id, 'failed', proofTx);
    return;
  }

  // Check pass: profit target reached
  if (m.currentPnlPercent >= profitTarget) {
    console.log(`✅ Agent ${entry.agentName} PASSED — PnL ${m.currentPnlPercent.toFixed(2)}% ≥ ${profitTarget}%`);
    const proofTx = await storeProof(entry, true);
    setEntryStatus(entry.id, 'passed', proofTx);
    return;
  }

  // Check expired
  if (now >= entry.endsAt) {
    console.log(`⏰ Agent ${entry.agentName} EXPIRED — PnL ${m.currentPnlPercent.toFixed(2)}% (needed ${profitTarget}%)`);
    const proofTx = await storeProof(entry, false);
    setEntryStatus(entry.id, 'expired', proofTx);
    return;
  }
}

async function storeProof(entry: ChallengeEntry, passed: boolean): Promise<string> {
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

      // Simulate metric updates (replace with Drift SDK reads in production)
      simulateMetricUpdate(entry, challenge.startingCapital);

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
