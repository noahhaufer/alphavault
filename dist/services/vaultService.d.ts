import { getPositions } from './driftService';
import { VaultConfig, VaultInfo } from '../types';
/** Bi-weekly payout interval in ms (14 days) */
export declare const PAYOUT_INTERVAL_MS: number;
/** Scale-up: 25% increase if profitable 2 consecutive months with 10%+ total profit */
export declare const SCALE_UP_PERCENT = 25;
export declare const SCALE_UP_REQUIRED_MONTHS = 2;
export declare const SCALE_UP_MIN_PROFIT_PERCENT = 10;
/**
 * Create a Drift vault (subaccount) for a funded agent
 */
export declare function createVault(config: VaultConfig): Promise<VaultInfo>;
export declare function getVault(pubkey: string): VaultInfo | undefined;
export declare function getAllVaults(): VaultInfo[];
export declare function getVaultsForAgent(delegateAuthority: string): VaultInfo[];
export declare function refreshVaultMetrics(pubkey: string): VaultInfo | null;
/**
 * Calculate profit split for a vault (90/10)
 */
export declare function calculateProfitSplit(pubkey: string): {
    totalProfit: number;
    agentProfit: number;
    protocolProfit: number;
} | null;
/**
 * Check if a funded account qualifies for scale-up.
 * Criteria: profitable 2 consecutive months with 10%+ total profit.
 * Returns the new allocation if eligible, or null.
 */
export declare function checkScaleUp(currentAllocation: number, consecutiveProfitableMonths: number, consecutiveProfit: number): number | null;
export declare function freezeVault(pubkey: string): Promise<boolean>;
export declare function getVaultPerformance(pubkey: string): {
    vault: VaultInfo;
    positions: ReturnType<typeof getPositions>;
    profitSplit: ReturnType<typeof calculateProfitSplit>;
} | null;
//# sourceMappingURL=vaultService.d.ts.map