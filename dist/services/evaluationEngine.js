"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readMetricsFromDrift = readMetricsFromDrift;
exports.simulateMetricUpdate = simulateMetricUpdate;
exports.evaluateEntry = evaluateEntry;
exports.runEvaluationCycle = runEvaluationCycle;
exports.startEvaluationLoop = startEvaluationLoop;
exports.stopEvaluationLoop = stopEvaluationLoop;
/**
 * Evaluation Engine — two-phase FTMO-style evaluation
 */
const challengeService_1 = require("./challengeService");
const driftService_1 = require("./driftService");
const solana_1 = require("../utils/solana");
function calcSharpe(pnlHistory) {
    if (pnlHistory.length < 2)
        return 0;
    const returns = [];
    for (let i = 1; i < pnlHistory.length; i++)
        returns.push(pnlHistory[i] - pnlHistory[i - 1]);
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    if (std === 0)
        return mean > 0 ? 10 : 0;
    return (mean / std) * Math.sqrt(8760);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function readMetricsFromDrift(entry, startingCapital) {
    try {
        const { equity, unrealizedPnl } = (0, driftService_1.getAccountMetrics)(entry.subAccountId);
        const positions = (0, driftService_1.getPositions)(entry.subAccountId);
        if (equity > 0 && Math.abs(equity - startingCapital) > startingCapital * 0.5) {
            simulateMetricUpdate(entry, startingCapital);
            return;
        }
        const currentEquity = equity > 0 ? equity : startingCapital + unrealizedPnl;
        const currentPnl = currentEquity - startingCapital;
        const m = entry.metrics;
        const newPeak = Math.max(m.peakEquity, currentEquity);
        const drawdown = newPeak - currentEquity;
        const drawdownPct = newPeak > 0 ? (drawdown / newPeak) * 100 : 0;
        const maxDd = Math.max(m.maxDrawdown, drawdown);
        const maxDdPct = Math.max(m.maxDrawdownPercent, drawdownPct);
        const dailyLoss = Math.max(0, m.peakEquity - currentEquity);
        const dailyLossPct = startingCapital > 0 ? (dailyLoss / startingCapital) * 100 : 0;
        const maxDailyLoss = Math.max(m.maxDailyLoss, dailyLoss);
        const maxDailyLossPct = Math.max(m.maxDailyLossPercent, dailyLossPct);
        const history = [...m.pnlHistory, currentPnl];
        if (history.length > 10000)
            history.splice(0, history.length - 10000);
        const tradeCount = (0, driftService_1.getTradeCount)(entry.subAccountId);
        const wins = positions.filter((p) => p.unrealizedPnl > 0).length;
        const totalPositions = positions.length || 1;
        const tradingDays = [...m.tradingDays];
        const today = todayStr();
        if (tradeCount > m.totalTrades && !tradingDays.includes(today))
            tradingDays.push(today);
        (0, challengeService_1.updateEntryMetrics)(entry.id, {
            currentPnl, currentPnlPercent: startingCapital > 0 ? (currentPnl / startingCapital) * 100 : 0,
            maxDrawdown: maxDd, maxDrawdownPercent: maxDdPct,
            maxDailyLoss, maxDailyLossPercent: maxDailyLossPct,
            peakEquity: newPeak, currentEquity,
            sharpeRatio: calcSharpe(history),
            totalTrades: tradeCount > m.totalTrades ? tradeCount : m.totalTrades,
            winRate: totalPositions > 0 ? wins / totalPositions : 0,
            pnlHistory: history, tradingDays,
        });
    }
    catch (err) {
        console.warn(`⚠️  Drift read failed for entry ${entry.id}: ${err.message}. Using simulation.`);
        simulateMetricUpdate(entry, startingCapital);
    }
}
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
    const dailyLoss = Math.max(0, newPeak - newEquity);
    const dailyLossPct = startingCapital > 0 ? (dailyLoss / startingCapital) * 100 : 0;
    const maxDailyLoss = Math.max(m.maxDailyLoss, dailyLoss);
    const maxDailyLossPct = Math.max(m.maxDailyLossPercent, dailyLossPct);
    const history = [...m.pnlHistory, newPnl];
    if (history.length > 10000)
        history.splice(0, history.length - 10000);
    const trades = m.totalTrades + (Math.random() > 0.7 ? 1 : 0);
    const winRate = trades > 0 ? Math.min(0.65 + Math.random() * 0.1, 1) : 0;
    const tradingDays = [...m.tradingDays];
    const today = todayStr();
    if (trades > m.totalTrades && !tradingDays.includes(today))
        tradingDays.push(today);
    (0, challengeService_1.updateEntryMetrics)(entry.id, {
        currentPnl: newPnl, currentPnlPercent: (newPnl / startingCapital) * 100,
        maxDrawdown: maxDd, maxDrawdownPercent: maxDdPct,
        maxDailyLoss, maxDailyLossPercent: maxDailyLossPct,
        peakEquity: newPeak, currentEquity: newEquity,
        sharpeRatio: calcSharpe(history), totalTrades: trades, winRate,
        pnlHistory: history, tradingDays,
    });
}
async function evaluateEntry(entry, challenge) {
    if (entry.status !== 'active')
        return;
    const m = entry.metrics;
    const now = Date.now();
    if (m.maxDailyLossPercent > challenge.maxDailyLoss) {
        console.log(`❌ ${entry.agentName} FAILED — daily loss ${m.maxDailyLossPercent.toFixed(2)}% > ${challenge.maxDailyLoss}%`);
        (0, challengeService_1.setEntryStatus)(entry.id, 'failed', await storeProof(entry, false));
        return;
    }
    if (m.maxDrawdownPercent > challenge.maxTotalLoss) {
        console.log(`❌ ${entry.agentName} FAILED — total loss ${m.maxDrawdownPercent.toFixed(2)}% > ${challenge.maxTotalLoss}%`);
        (0, challengeService_1.setEntryStatus)(entry.id, 'failed', await storeProof(entry, false));
        return;
    }
    if (m.currentPnlPercent >= challenge.profitTarget && m.tradingDays.length >= challenge.minTradingDays) {
        console.log(`✅ ${entry.agentName} PASSED Phase ${challenge.phase} — PnL ${m.currentPnlPercent.toFixed(2)}% ≥ ${challenge.profitTarget}%, ${m.tradingDays.length} trading days`);
        (0, challengeService_1.setEntryStatus)(entry.id, 'passed', await storeProof(entry, true));
        return;
    }
    if (now >= entry.endsAt) {
        console.log(`⏰ ${entry.agentName} EXPIRED Phase ${challenge.phase} — PnL ${m.currentPnlPercent.toFixed(2)}% (needed ${challenge.profitTarget}%)`);
        (0, challengeService_1.setEntryStatus)(entry.id, 'expired', await storeProof(entry, false));
        return;
    }
}
async function storeProof(entry, passed) {
    try {
        const keypair = (0, solana_1.getServiceKeypair)();
        return await (0, solana_1.storeProofOnChain)(keypair, {
            type: 'challenge_result', agentId: entry.agentId, challengeId: entry.challengeId,
            phase: entry.phase, pnlPercent: entry.metrics.currentPnlPercent,
            maxDrawdown: entry.metrics.maxDrawdownPercent, maxDailyLoss: entry.metrics.maxDailyLossPercent,
            tradingDays: entry.metrics.tradingDays.length, sharpeRatio: entry.metrics.sharpeRatio,
            passed, timestamp: Date.now(),
        });
    }
    catch (err) {
        console.error('Proof storage failed:', err.message);
        return `offline_proof_${Date.now()}`;
    }
}
async function runEvaluationCycle() {
    const allChallenges = (0, challengeService_1.getAllChallenges)();
    for (const challenge of allChallenges) {
        if (challenge.status !== 'active')
            continue;
        const challengeEntries = (0, challengeService_1.getEntriesForChallenge)(challenge.id);
        for (const entry of challengeEntries) {
            if (entry.status !== 'active')
                continue;
            readMetricsFromDrift(entry, challenge.startingCapital);
            await evaluateEntry(entry, challenge);
        }
    }
}
let evalInterval = null;
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