"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedChallenges = seedChallenges;
exports.getAllChallenges = getAllChallenges;
exports.getChallenge = getChallenge;
exports.getPhase2Challenge = getPhase2Challenge;
exports.enterChallenge = enterChallenge;
exports.getEntry = getEntry;
exports.getEntriesByAgent = getEntriesByAgent;
exports.getEntriesForChallenge = getEntriesForChallenge;
exports.updateEntryMetrics = updateEntryMetrics;
exports.setEntryStatus = setEntryStatus;
exports.hasPassedBothPhases = hasPassedBothPhases;
exports.getLeaderboard = getLeaderboard;
/**
 * Challenge Service — 5 account tiers × 2 phases = 10 challenges
 */
const uuid_1 = require("uuid");
const types_1 = require("../types");
const challenges = new Map();
const entries = new Map();
let subAccountCounter = -1;
// On devnet, all agents share subaccount 0 (funded with collateral).
// In production, each agent gets a unique subaccount funded by the vault.
const DEVNET_SHARED_SUBACCOUNT = process.env.DRIFT_NETWORK !== 'mainnet-beta';
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function defaultMetrics(startingCapital) {
    return {
        currentPnl: 0,
        currentPnlPercent: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        maxDailyLoss: 0,
        maxDailyLossPercent: 0,
        dailyLoss: 0,
        dailyLossPercent: 0,
        dailyLossDate: todayStr(),
        peakEquity: startingCapital,
        currentEquity: startingCapital,
        sharpeRatio: 0,
        totalTrades: 0,
        winRate: 0,
        pnlHistory: [],
        tradingDays: [],
    };
}
const PHASE_CONFIG = {
    1: { profitTarget: 8, durationDays: 30, label: 'Challenge' },
    2: { profitTarget: 5, durationDays: 60, label: 'Verification' },
};
function seedChallenges() {
    let count = 0;
    for (const tier of types_1.ACCOUNT_TIERS) {
        for (const phase of [1, 2]) {
            const cfg = PHASE_CONFIG[phase];
            const capitalK = `$${tier.capital / 1000}k`;
            const id = (0, uuid_1.v4)();
            challenges.set(id, {
                id,
                name: `${capitalK} ${cfg.label}`,
                description: `Phase ${phase} ${cfg.label}: ${capitalK} capital, ${cfg.profitTarget}% profit target, 5% max daily loss, 10% max total loss, min 10 trading days, ${cfg.durationDays}-day window. Fee: $${tier.fee} (refundable on pass).`,
                startingCapital: tier.capital,
                durationDays: cfg.durationDays,
                profitTarget: cfg.profitTarget,
                maxDailyLoss: 5,
                maxTotalLoss: 10,
                minTradingDays: 10,
                phase,
                challengeFee: tier.fee,
                market: 'SOL-PERP',
                status: 'active',
                createdAt: Date.now(),
            });
            count++;
        }
    }
    console.log(`🏁 Seeded ${count} challenges (${types_1.ACCOUNT_TIERS.length} tiers × 2 phases)`);
}
function getAllChallenges() {
    return Array.from(challenges.values());
}
function getChallenge(id) {
    return challenges.get(id);
}
function getPhase2Challenge(phase1Challenge) {
    return Array.from(challenges.values()).find((c) => c.phase === 2 && c.startingCapital === phase1Challenge.startingCapital && c.status === 'active');
}
function enterChallenge(challengeId, agentId, agentName, authority, phase1EntryId) {
    const challenge = challenges.get(challengeId);
    if (!challenge || challenge.status !== 'active')
        return null;
    for (const e of entries.values()) {
        if (e.challengeId === challengeId && e.agentId === agentId && e.status === 'active') {
            return e;
        }
    }
    const entryId = (0, uuid_1.v4)();
    const subAccountId = DEVNET_SHARED_SUBACCOUNT ? 0 : ++subAccountCounter;
    const now = Date.now();
    const entry = {
        id: entryId,
        challengeId,
        agentId,
        agentName,
        subAccountId,
        authority,
        startedAt: now,
        endsAt: now + challenge.durationDays * 24 * 3600000,
        status: 'active',
        metrics: defaultMetrics(challenge.startingCapital),
        phase: challenge.phase,
        phase1EntryId,
    };
    entries.set(entryId, entry);
    console.log(`🤖 Agent ${agentName} (${agentId}) entered Phase ${challenge.phase} ${challenge.name}`);
    return entry;
}
function getEntry(entryId) {
    return entries.get(entryId);
}
function getEntriesByAgent(agentId) {
    return Array.from(entries.values()).filter((e) => e.agentId === agentId);
}
function getEntriesForChallenge(challengeId) {
    return Array.from(entries.values()).filter((e) => e.challengeId === challengeId);
}
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
/**
 * Check if an agent has passed both phases for any tier
 */
function hasPassedBothPhases(agentId) {
    const agentEntries = getEntriesByAgent(agentId);
    const phase2Passed = agentEntries.find((e) => e.phase === 2 && e.status === 'passed');
    if (!phase2Passed)
        return null;
    const phase1Passed = agentEntries.find((e) => e.phase === 1 && e.status === 'passed' && e.id === phase2Passed.phase1EntryId);
    if (!phase1Passed)
        return null;
    return { phase1: phase1Passed, phase2: phase2Passed };
}
function getLeaderboard(challengeId) {
    return getEntriesForChallenge(challengeId)
        .sort((a, b) => b.metrics.currentPnlPercent - a.metrics.currentPnlPercent)
        .map((e, i) => ({
        rank: i + 1,
        agentId: e.agentId,
        agentName: e.agentName,
        pnlPercent: e.metrics.currentPnlPercent,
        maxDrawdown: e.metrics.maxDrawdownPercent,
        sharpeRatio: e.metrics.sharpeRatio,
        status: e.status,
    }));
}
//# sourceMappingURL=challengeService.js.map