/**
 * Challenge Service — 5 account tiers × 2 phases = 10 challenges
 */
import { v4 as uuid } from 'uuid';
import {
  Challenge,
  ChallengeEntry,
  ChallengePhase,
  PerformanceMetrics,
  LeaderboardEntry,
  ACCOUNT_TIERS,
} from '../types';

const challenges: Map<string, Challenge> = new Map();
const entries: Map<string, ChallengeEntry> = new Map();
let subAccountCounter = -1;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultMetrics(startingCapital: number): PerformanceMetrics {
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

const PHASE_CONFIG: Record<ChallengePhase, { profitTarget: number; durationDays: number; label: string }> = {
  1: { profitTarget: 8, durationDays: 30, label: 'Challenge' },
  2: { profitTarget: 5, durationDays: 60, label: 'Verification' },
};

export function seedChallenges(): void {
  let count = 0;
  for (const tier of ACCOUNT_TIERS) {
    for (const phase of [1, 2] as ChallengePhase[]) {
      const cfg = PHASE_CONFIG[phase];
      const capitalK = `$${tier.capital / 1000}k`;
      const id = uuid();
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
  console.log(`🏁 Seeded ${count} challenges (${ACCOUNT_TIERS.length} tiers × 2 phases)`);
}

export function getAllChallenges(): Challenge[] {
  return Array.from(challenges.values());
}

export function getChallenge(id: string): Challenge | undefined {
  return challenges.get(id);
}

export function getPhase2Challenge(phase1Challenge: Challenge): Challenge | undefined {
  return Array.from(challenges.values()).find(
    (c) => c.phase === 2 && c.startingCapital === phase1Challenge.startingCapital && c.status === 'active'
  );
}

export function enterChallenge(
  challengeId: string,
  agentId: string,
  agentName: string,
  authority: string,
  phase1EntryId?: string
): ChallengeEntry | null {
  const challenge = challenges.get(challengeId);
  if (!challenge || challenge.status !== 'active') return null;

  for (const e of entries.values()) {
    if (e.challengeId === challengeId && e.agentId === agentId && e.status === 'active') {
      return e;
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
    endsAt: now + challenge.durationDays * 24 * 3600_000,
    status: 'active',
    metrics: defaultMetrics(challenge.startingCapital),
    phase: challenge.phase,
    phase1EntryId,
  };

  entries.set(entryId, entry);
  console.log(`🤖 Agent ${agentName} (${agentId}) entered Phase ${challenge.phase} ${challenge.name}`);
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
 * Check if an agent has passed both phases for any tier
 */
export function hasPassedBothPhases(agentId: string): { phase1: ChallengeEntry; phase2: ChallengeEntry } | null {
  const agentEntries = getEntriesByAgent(agentId);
  const phase2Passed = agentEntries.find((e) => e.phase === 2 && e.status === 'passed');
  if (!phase2Passed) return null;
  const phase1Passed = agentEntries.find(
    (e) => e.phase === 1 && e.status === 'passed' && e.id === phase2Passed.phase1EntryId
  );
  if (!phase1Passed) return null;
  return { phase1: phase1Passed, phase2: phase2Passed };
}

export function getLeaderboard(challengeId: string): LeaderboardEntry[] {
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
