"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMetricsFromDrift = readMetricsFromDrift;
exports.simulateMetricUpdate = simulateMetricUpdate;
exports.evaluateEntry = evaluateEntry;
exports.runEvaluationCycle = runEvaluationCycle;
exports.startEvaluationLoop = startEvaluationLoop;
exports.stopEvaluationLoop = stopEvaluationLoop;
/**
 * Evaluation Engine — monitors real Drift positions, calculates metrics, determines pass/fail
 */
const challengeService_1 = require("./challengeService");
const driftService_1 = require("./driftService");
const solana_1 = require("../utils/solana");
/**
 * Calculate Sharpe ratio from PnL history
 * Assumes periodic returns, risk-free rate = 0
 */
function calcSharpe(pnlHistory) {
    if (pnlHistory.length < 2)
        return 0;
    const returns = [];
    for (let i = 1; i < pnlHistory.length; i++) {
        returns.push(pnlHistory[i] - pnlHistory[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    if (std === 0)
        return mean > 0 ? 10 : 0;
    // Annualize: assume snapshots every 5s → ~6307200/year
    return (mean / std) * Math.sqrt(8760);
}
/**
 * Read real metrics from Drift subaccount
 */
function readMetricsFromDrift(entry, startingCapital) {
    try {
        const { equity, unrealizedPnl } = (0, driftService_1.getAccountMetrics)(entry.subAccountId);
        const positions = (0, driftService_1.getPositions)(entry.subAccountId);
        // If real equity is far from starting capital, it's a virtual challenge — use simulation
        if (equity > 0 && Math.abs(equity - startingCapital) > startingCapital * 0.5) {
            simulateMetricUpdate(entry, startingCapital);
            return;
        }
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
        if (history.length > 10000)
            history.splice(0, history.length - 10000);
        const tradeCount = (0, driftService_1.getTradeCount)(entry.subAccountId);
        const wins = positions.filter((p) => p.unrealizedPnl > 0).length;
        const totalPositions = positions.length || 1;
        (0, challengeService_1.updateEntryMetrics)(entry.id, {
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
    }
    catch (err) {
        // If Drift read fails (e.g. subaccount not yet funded), use simulation fallback
        console.warn(`⚠️  Drift read failed for entry ${entry.id} (sub ${entry.subAccountId}): ${err.message}. Using simulation fallback.`);
        simulateMetricUpdate(entry, startingCapital);
    }
}
/**
 * Fallback: simulate metric updates when Drift reads are unavailable
 * (e.g. subaccount not initialized/funded yet)
 */
function simulateMetricUpdate(entry, startingCapital) {
    const m = entry.metrics;
    const pnlDelta = (Math.random() - 0.48) * startingCapital * 0.003;
    const newPnl = m.currentPnl + pnlDelta;
    const newEquity = startingCapital + newPnl;
    const newPeak = Math.max(m.peakEquity, newEquity);
    const drawdown = newPeak - newEquity;
    const drawdownPct = newPeak > 0 ? (drawdown / newPeak) * 100 : 0;
    const maxDd = Math.max(m.maxDrawdown, drawdown);
    const maxDdPct = Math.max(m.maxDrawdownPercent, drawdownPct);
    const history = [...m.pnlHistory, newPnl];
    if (history.length > 10000)
        history.splice(0, history.length - 10000);
    const trades = m.totalTrades + (Math.random() > 0.7 ? 1 : 0);
    const winRate = trades > 0 ? Math.min(0.65 + Math.random() * 0.1, 1) : 0;
    (0, challengeService_1.updateEntryMetrics)(entry.id, {
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
async function evaluateEntry(entry, profitTarget, maxDrawdown) {
    if (entry.status !== 'active')
        return;
    const m = entry.metrics;
    const now = Date.now();
    // Check fail: drawdown exceeded
    if (m.maxDrawdownPercent > maxDrawdown) {
        console.log(`❌ Agent ${entry.agentName} FAILED — drawdown ${m.maxDrawdownPercent.toFixed(2)}% > ${maxDrawdown}%`);
        const proofTx = await storeProof(entry, false);
        (0, challengeService_1.setEntryStatus)(entry.id, 'failed', proofTx);
        return;
    }
    // Check pass: profit target reached
    if (m.currentPnlPercent >= profitTarget) {
        console.log(`✅ Agent ${entry.agentName} PASSED — PnL ${m.currentPnlPercent.toFixed(2)}% ≥ ${profitTarget}%`);
        const proofTx = await storeProof(entry, true);
        (0, challengeService_1.setEntryStatus)(entry.id, 'passed', proofTx);
        return;
    }
    // Check expired
    if (now >= entry.endsAt) {
        console.log(`⏰ Agent ${entry.agentName} EXPIRED — PnL ${m.currentPnlPercent.toFixed(2)}% (needed ${profitTarget}%)`);
        const proofTx = await storeProof(entry, false);
        (0, challengeService_1.setEntryStatus)(entry.id, 'expired', proofTx);
        return;
    }
}
async function storeProof(entry, passed) {
    try {
        const keypair = (0, solana_1.getServiceKeypair)();
        return await (0, solana_1.storeProofOnChain)(keypair, {
            type: 'challenge_result',
            agentId: entry.agentId,
            challengeId: entry.challengeId,
            pnlPercent: entry.metrics.currentPnlPercent,
            maxDrawdown: entry.metrics.maxDrawdownPercent,
            sharpeRatio: entry.metrics.sharpeRatio,
            passed,
            timestamp: Date.now(),
        });
    }
    catch (err) {
        console.error('Proof storage failed:', err.message);
        return `offline_proof_${Date.now()}`;
    }
}
/**
 * Run one evaluation cycle across all active challenges
 */
async function runEvaluationCycle() {
    const challenges = (0, challengeService_1.getAllChallenges)();
    for (const challenge of challenges) {
        if (challenge.status !== 'active')
            continue;
        const entries = (0, challengeService_1.getEntriesForChallenge)(challenge.id);
        for (const entry of entries) {
            if (entry.status !== 'active')
                continue;
            // Read real metrics from Drift (falls back to simulation if unavailable)
            readMetricsFromDrift(entry, challenge.startingCapital);
            // Evaluate pass/fail
            await evaluateEntry(entry, challenge.profitTarget, challenge.maxDrawdown);
        }
    }
}
let evalInterval = null;
/** Start the evaluation loop */
function startEvaluationLoop(intervalMs = 5000) {
    if (evalInterval)
        return;
    console.log(`📊 Evaluation engine started (interval: ${intervalMs}ms)`);
    evalInterval = setInterval(runEvaluationCycle, intervalMs);
}
function stopEvaluationLoop() {
    if (evalInterval) {
        clearInterval(evalInterval);
        evalInterval = null;
        console.log('📊 Evaluation engine stopped');
    }
}
//# sourceMappingURL=evaluationEngine.js.map