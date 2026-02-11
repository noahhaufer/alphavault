import { getPositions } from './driftService';
import { VaultConfig, VaultInfo } from '../types';
/**
 * Create a Drift vault (subaccount) for a funded agent
 */
export declare function createVault(config: VaultConfig): Promise<VaultInfo>;
/**
 * Get vault info
 */
export declare function getVault(pubkey: string): VaultInfo | undefined;
/**
 * Get all vaults
 */
export declare function getAllVaults(): VaultInfo[];
/**
 * Get vaults delegated to a specific agent
 */
export declare function getVaultsForAgent(delegateAuthority: string): VaultInfo[];
/**
 * Update vault equity from Drift on-chain data
 */
export declare function refreshVaultMetrics(pubkey: string): VaultInfo | null;
/**
 * Calculate profit split for a vault
 * Returns { agentProfit, vaultProfit } in USDC
 */
export declare function calculateProfitSplit(pubkey: string): {
    totalProfit: number;
    agentProfit: number;
    vaultProfit: number;
} | null;
/**
 * Freeze a vault (disable trading)
 */
export declare function freezeVault(pubkey: string): Promise<boolean>;
/**
 * Get vault performance summary
 */
export declare function getVaultPerformance(pubkey: string): {
    vault: VaultInfo;
    positions: ReturnType<typeof getPositions>;
    profitSplit: ReturnType<typeof calculateProfitSplit>;
} | null;
//# sourceMappingURL=vaultService.d.ts.map