"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedChallenges = seedChallenges;
exports.getAllChallenges = getAllChallenges;
exports.getChallenge = getChallenge;
exports.enterChallenge = enterChallenge;
exports.getEntry = getEntry;
exports.getEntriesByAgent = getEntriesByAgent;
exports.getEntriesForChallenge = getEntriesForChallenge;
exports.updateEntryMetrics = updateEntryMetrics;
exports.setEntryStatus = setEntryStatus;
exports.getLeaderboard = getLeaderboard;
/**
 * Challenge Service — manages trading challenges and agent entries
 */
const uuid_1 = require("uuid");
/** In-memory store (swap for DB in production) */
const challenges = new Map();
const entries = new Map();
let subAccountCounter = -1;
function defaultMetrics(startingCapital) {
    return {
        currentPnl: 0,
        currentPnlPercent: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        peakEquity: startingCapital,
        currentEquity: startingCapital,
        sharpeRatio: 0,
        totalTrades: 0,
        winRate: 0,
        pnlHistory: [],
    };
}
/** Seed default challenges on startup */
function seedChallenges() {
    const defaults = [
        {
            name: 'Starter Challenge',
            description: 'Prove your edge with $10k virtual capital on SOL-PERP. Target: 10% profit, max 5% drawdown.',
            startingCapital: 10000,
            durationHours: 24,
            profitTarget: 10,
            maxDrawdown: 5,
            market: 'SOL-PERP',
            status: 'active',
        },
        {
            name: 'Pro Challenge',
            description: 'Higher stakes: $50k virtual capital. Same rules — 10% profit, <5% drawdown in 48h.',
            startingCapital: 50000,
            durationHours: 48,
            profitTarget: 10,
            maxDrawdown: 5,
            market: 'SOL-PERP',
            status: 'active',
        },
        {
            name: 'Elite Challenge',
            description: '$100k virtual capital, 72h window. For battle-tested agents only.',
            startingCapital: 100000,
            durationHours: 72,
            profitTarget: 10,
            maxDrawdown: 5,
            market: 'SOL-PERP',
            status: 'active',
        },
    ];
    for (const c of defaults) {
        const id = (0, uuid_1.v4)();
        challenges.set(id, { ...c, id, createdAt: Date.now() });
    }
    console.log(`🏁 Seeded ${defaults.length} challenges`);
}
function getAllChallenges() {
    return Array.from(challenges.values());
}
function getChallenge(id) {
    return challenges.get(id);
}
/**
 * Enter an agent into a challenge
 */
function enterChallenge(challengeId, agentId, agentName, authority) {
    const challenge = challenges.get(challengeId);
    if (!challenge || challenge.status !== 'active')
        return null;
    // Check if agent already entered this challenge
    for (const e of entries.values()) {
        if (e.challengeId === challengeId && e.agentId === agentId && e.status === 'active') {
            return e; // Already entered
        }
    }
    const entryId = (0, uuid_1.v4)();
    const subAccountId = ++subAccountCounter;
    const now = Date.now();
    const entry = {
        id: entryId,
        challengeId,
        agentId,
        agentName,
        subAccountId,
        authority,
        startedAt: now,
        endsAt: now + challenge.durationHours * 3600000,
        status: 'active',
        metrics: defaultMetrics(challenge.startingCapital),
    };
    entries.set(entryId, entry);
    console.log(`🤖 Agent ${agentName} (${agentId}) entered challenge ${challenge.name}`);
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
/**
 * Update metrics for an entry (called by evaluation engine)
 */
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
 * Build leaderboard for a challenge
 */
function getLeaderboard(challengeId) {
    const challengeEntries = getEntriesForChallenge(challengeId);
    return challengeEntries
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