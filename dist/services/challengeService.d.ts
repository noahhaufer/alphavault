import { Challenge, ChallengeEntry, PerformanceMetrics, LeaderboardEntry } from '../types';
/** Seed default challenges on startup */
export declare function seedChallenges(): void;
export declare function getAllChallenges(): Challenge[];
export declare function getChallenge(id: string): Challenge | undefined;
/**
 * Enter an agent into a challenge
 */
export declare function enterChallenge(challengeId: string, agentId: string, agentName: string, authority: string): ChallengeEntry | null;
export declare function getEntry(entryId: string): ChallengeEntry | undefined;
export declare function getEntriesByAgent(agentId: string): ChallengeEntry[];
export declare function getEntriesForChallenge(challengeId: string): ChallengeEntry[];
/**
 * Update metrics for an entry (called by evaluation engine)
 */
export declare function updateEntryMetrics(entryId: string, metrics: Partial<PerformanceMetrics>): ChallengeEntry | null;
export declare function setEntryStatus(entryId: string, status: ChallengeEntry['status'], proofTx?: string): void;
/**
 * Build leaderboard for a challenge
 */
export declare function getLeaderboard(challengeId: string): LeaderboardEntry[];
//# sourceMappingURL=challengeService.d.ts.map