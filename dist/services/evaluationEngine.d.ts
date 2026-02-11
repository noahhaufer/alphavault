import { ChallengeEntry } from '../types';
/**
 * Read real metrics from Drift subaccount
 */
export declare function readMetricsFromDrift(entry: ChallengeEntry, startingCapital: number): void;
/**
 * Fallback: simulate metric updates when Drift reads are unavailable
 * (e.g. subaccount not initialized/funded yet)
 */
export declare function simulateMetricUpdate(entry: ChallengeEntry, startingCapital: number): void;
/**
 * Evaluate a single entry — check pass/fail conditions
 */
export declare function evaluateEntry(entry: ChallengeEntry, profitTarget: number, maxDrawdown: number): Promise<void>;
/**
 * Run one evaluation cycle across all active challenges
 */
export declare function runEvaluationCycle(): Promise<void>;
/** Start the evaluation loop */
export declare function startEvaluationLoop(intervalMs?: number): void;
export declare function stopEvaluationLoop(): void;
//# sourceMappingURL=evaluationEngine.d.ts.map