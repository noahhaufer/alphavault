import { ChallengeEntry, Challenge } from '../types';
export declare function readMetricsFromDrift(entry: ChallengeEntry, startingCapital: number): void;
export declare function simulateMetricUpdate(entry: ChallengeEntry, startingCapital: number): void;
export declare function evaluateEntry(entry: ChallengeEntry, challenge: Challenge): Promise<void>;
export declare function runEvaluationCycle(): Promise<void>;
export declare function startEvaluationLoop(intervalMs?: number): void;
export declare function stopEvaluationLoop(): void;
//# sourceMappingURL=evaluationEngine.d.ts.map