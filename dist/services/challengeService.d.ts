import { Challenge, ChallengeEntry, PerformanceMetrics, LeaderboardEntry } from '../types';
export declare function seedChallenges(): void;
export declare function getAllChallenges(): Challenge[];
export declare function getChallenge(id: string): Challenge | undefined;
export declare function getPhase2Challenge(phase1Challenge: Challenge): Challenge | undefined;
export declare function enterChallenge(challengeId: string, agentId: string, agentName: string, authority: string, phase1EntryId?: string): ChallengeEntry | null;
export declare function getEntry(entryId: string): ChallengeEntry | undefined;
export declare function getEntriesByAgent(agentId: string): ChallengeEntry[];
export declare function getEntriesForChallenge(challengeId: string): ChallengeEntry[];
export declare function updateEntryMetrics(entryId: string, metrics: Partial<PerformanceMetrics>): ChallengeEntry | null;
export declare function setEntryStatus(entryId: string, status: ChallengeEntry['status'], proofTx?: string): void;
/**
 * Check if an agent has passed both phases for any tier
 */
export declare function hasPassedBothPhases(agentId: string): {
    phase1: ChallengeEntry;
    phase2: ChallengeEntry;
} | null;
export declare function getLeaderboard(challengeId: string): LeaderboardEntry[];
//# sourceMappingURL=challengeService.d.ts.map