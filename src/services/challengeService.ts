/**
 * Challenge Service — manages trading challenges and agent entries
 */
import { v4 as uuid } from 'uuid';
import {
  Challenge,
  ChallengeEntry,
  PerformanceMetrics,
  LeaderboardEntry,
} from '../types';

/** In-memory store (swap for DB in production) */
const challenges: Map<string, Challenge> = new Map();
const entries: Map<string, ChallengeEntry> = new Map();

let subAccountCounter = 0;

function defaultMetrics(startingCapital: number): PerformanceMetrics {
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
export function seedChallenges(): void {
  const defaults: Omit<Challenge, 'id' | 'createdAt'>[] = [
    {
      name: 'Starter Challenge',
      description: 'Prove your edge with $10k virtual capital on SOL-PERP. Target: 10% profit, max 5% drawdown.',
      startingCapital: 10_000,
      durationHours: 24,
      profitTarget: 10,
      maxDrawdown: 5,
      market: 'SOL-PERP',
      status: 'active',
    },
    {
      name: 'Pro Challenge',
      description: 'Higher stakes: $50k virtual capital. Same rules — 10% profit, <5% drawdown in 48h.',
      startingCapital: 50_000,
      durationHours: 48,
      profitTarget: 10,
      maxDrawdown: 5,
      market: 'SOL-PERP',
      status: 'active',
    },
    {
      name: 'Elite Challenge',
      description: '$100k virtual capital, 72h window. For battle-tested agents only.',
      startingCapital: 100_000,
      durationHours: 72,
      profitTarget: 10,
      maxDrawdown: 5,
      market: 'SOL-PERP',
      status: 'active',
    },
  ];

  for (const c of defaults) {
    const id = uuid();
    challenges.set(id, { ...c, id, createdAt: Date.now() });
  }
  console.log(`🏁 Seeded ${defaults.length} challenges`);
}

export function getAllChallenges(): Challenge[] {
  return Array.from(challenges.values());
}

export function getChallenge(id: string): Challenge | undefined {
  return challenges.get(id);
}

/**
 * Enter an agent into a challenge
 */
export function enterChallenge(
  challengeId: string,
  agentId: string,
  agentName: string,
  authority: string
): ChallengeEntry | null {
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.status !== 'active') return null;

  // Check if agent already entered this challenge
  for (const e of entries.values()) {
    if (e.challengeId === challengeId && e.agentId === agentId && e.status === 'active') {
      return e; // Already entered
    }
  }

  const entryId = uuid();
  const subAccountId = ++subAccountCounter;
  const now = Date.now();

  const entry: ChallengeEntry = {
    id: entryId,
    challengeId,
    agentId,
    agentName,
    subAccountId,
    authority,
    startedAt: now,
    endsAt: now + challenge.durationHours * 3600_000,
    status: 'active',
    metrics: defaultMetrics(challenge.startingCapital),
  };

  entries.set(entryId, entry);
  console.log(`🤖 Agent ${agentName} (${agentId}) entered challenge ${challenge.name}`);
  return entry;
}

export function getEntry(entryId: string): ChallengeEntry | undefined {
  return entries.get(entryId);
}

export function getEntriesByAgent(agentId: string): ChallengeEntry[] {
  return Array.from(entries.values()).filter((e) => e.agentId === agentId);
}

export function getEntriesForChallenge(challengeId: string): ChallengeEntry[] {
  return Array.from(entries.values()).filter((e) => e.challengeId === challengeId);
}

/**
 * Update metrics for an entry (called by evaluation engine)
 */
export function updateEntryMetrics(
  entryId: string,
  metrics: Partial<PerformanceMetrics>
): ChallengeEntry | null {
  const entry = entries.get(entryId);
  if (!entry) return null;
  entry.metrics = { ...entry.metrics, ...metrics };
  return entry;
}

export function setEntryStatus(
  entryId: string,
  status: ChallengeEntry['status'],
  proofTx?: string
): void {
  const entry = entries.get(entryId);
  if (!entry) return;
  entry.status = status;
  if (proofTx) entry.proofTx = proofTx;
}

/**
 * Build leaderboard for a challenge
 */
export function getLeaderboard(challengeId: string): LeaderboardEntry[] {
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
