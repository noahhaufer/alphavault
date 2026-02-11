"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedChallenges = seedChallenges;
exports.getAllChallenges = getAllChallenges;
exports.getChallenge = getChallenge;
exports.hasPassedPhase1 = hasPassedPhase1;
exports.hasPassedBothPhases = hasPassedBothPhases;
exports.enterChallenge = enterChallenge;
exports.getEntry = getEntry;
exports.getEntriesByAgent = getEntriesByAgent;
exports.getEntriesForChallenge = getEntriesForChallenge;
exports.updateEntryMetrics = updateEntryMetrics;
exports.setEntryStatus = setEntryStatus;
exports.getLeaderboard = getLeaderboard;
/**
 * Challenge Service — two-phase FTMO-style challenge system
 */
const uuid_1 = require("uuid");
const challenges = new Map();
const entries = new Map();
let subAccountCounter = -1;
function defaultMetrics(startingCapital) {
    return {
        currentPnl: 0, currentPnlPercent: 0,
        maxDrawdown: 0, maxDrawdownPercent: 0,
        maxDailyLoss: 0, maxDailyLossPercent: 0,
        peakEquity: startingCapital, currentEquity: startingCapital,
        sharpeRatio: 0, totalTrades: 0, winRate: 0,
        pnlHistory: [], tradingDays: [],
    };
}
function seedChallenges() {
    const tiers = [
        { name: 'Starter', capital: 10000 },
        { name: 'Pro', capital: 50000 },
        { name: 'Elite', capital: 100000 },
    ];
    for (const tier of tiers) {
        const p1Id = (0, uuid_1.v4)();
        challenges.set(p1Id, {
            id: p1Id,
            name: `${tier.name} Challenge — Phase 1`,
            description: `Phase 1: $${(tier.capital / 1000).toFixed(0)}k capital. 10% profit target, 5% max daily loss, 10% max total loss, min 4 trading days. 30-day window.`,
            startingCapital: tier.capital, durationDays: 30, profitTarget: 10,
            maxDailyLoss: 5, maxTotalLoss: 10, minTradingDays: 4, phase: 1,
            market: 'SOL-PERP', status: 'active', createdAt: Date.now(),
        });
        const p2Id = (0, uuid_1.v4)();
        challenges.set(p2Id, {
            id: p2Id,
            name: `${tier.name} Challenge — Phase 2 (Verification)`,
            description: `Phase 2: $${(tier.capital / 1000).toFixed(0)}k capital. 5% profit target, same loss limits, min 4 trading days. 60-day window.`,
            startingCapital: tier.capital, durationDays: 60, profitTarget: 5,
            maxDailyLoss: 5, maxTotalLoss: 10, minTradingDays: 4, phase: 2,
            market: 'SOL-PERP', status: 'active', createdAt: Date.now(),
        });
    }
    console.log(`🏁 Seeded ${tiers.length * 2} challenges (${tiers.length} tiers × 2 phases)`);
}
function getAllChallenges() { return Array.from(challenges.values()); }
function getChallenge(id) { return challenges.get(id); }
function hasPassedPhase1(agentId, startingCapital) {
    return Array.from(entries.values()).find((e) => e.agentId === agentId && e.phase === 1 && e.status === 'passed' &&
        getChallenge(e.challengeId)?.startingCapital === startingCapital);
}
function hasPassedBothPhases(agentId) {
    const passed = Array.from(entries.values()).filter((e) => e.agentId === agentId && e.status === 'passed');
    const phase1 = passed.find((e) => e.phase === 1);
    const phase2 = passed.find((e) => e.phase === 2 && e.phase1EntryId === phase1?.id);
    if (phase1 && phase2)
        return { phase1, phase2 };
    return null;
}
function enterChallenge(challengeId, agentId, agentName, authority) {
    const challenge = challenges.get(challengeId);
    if (!challenge || challenge.status !== 'active')
        return null;
    let phase1EntryId;
    if (challenge.phase === 2) {
        const p1 = hasPassedPhase1(agentId, challenge.startingCapital);
        if (!p1) {
            console.log(`❌ Agent ${agentName} must pass Phase 1 first`);
            return null;
        }
        phase1EntryId = p1.id;
    }
    for (const e of entries.values()) {
        if (e.challengeId === challengeId && e.agentId === agentId && e.status === 'active')
            return e;
    }
    const entryId = (0, uuid_1.v4)();
    const subAccountId = ++subAccountCounter;
    const now = Date.now();
    const entry = {
        id: entryId, challengeId, agentId, agentName, subAccountId, authority,
        startedAt: now, endsAt: now + challenge.durationDays * 24 * 3600000,
        status: 'active', metrics: defaultMetrics(challenge.startingCapital),
        phase: challenge.phase, phase1EntryId,
    };
    entries.set(entryId, entry);
    console.log(`🤖 Agent ${agentName} (${agentId}) entered ${challenge.name}`);
    return entry;
}
function getEntry(entryId) { return entries.get(entryId); }
function getEntriesByAgent(agentId) { return Array.from(entries.values()).filter((e) => e.agentId === agentId); }
function getEntriesForChallenge(challengeId) { return Array.from(entries.values()).filter((e) => e.challengeId === challengeId); }
function updateEntryMetrics(entryId, metrics) {
    const entry = entries.get(entryId);
    if (!entry)
        return null;
    entry.metrics = { ...entry.metrics, ...metrics };
    return entry;
}
function setEntryStatus(entryId, status, proofTx) {
    const entry = entries.get(entryId);
    if (!entry)
        return;
    entry.status = status;
    if (proofTx)
        entry.proofTx = proofTx;
}
function getLeaderboard(challengeId) {
    return getEntriesForChallenge(challengeId)
        .sort((a, b) => b.metrics.currentPnlPercent - a.metrics.currentPnlPercent)
        .map((e, i) => ({
        rank: i + 1, agentId: e.agentId, agentName: e.agentName,
        pnlPercent: e.metrics.currentPnlPercent, maxDrawdown: e.metrics.maxDrawdownPercent,
        sharpeRatio: e.metrics.sharpeRatio, status: e.status,
    }));
}
//# sourceMappingURL=challengeService.js.map