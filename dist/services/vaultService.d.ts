import { VaultConfig, VaultInfo } from '../types';
export declare const PAYOUT_INTERVAL_MS: number;
export declare const SCALE_UP_PERCENT = 25;
export declare const SCALE_UP_REQUIRED_MONTHS = 2;
export declare const SCALE_UP_MIN_PROFIT_PERCENT = 10;
export declare function createVault(config: VaultConfig): Promise<VaultInfo>;
export declare function getVault(pubkey: string): VaultInfo | undefined;
export declare function getAllVaults(): VaultInfo[];
export declare function getVaultsForAgent(delegate: string): VaultInfo[];
export declare function refreshVaultMetrics(pubkey: string): VaultInfo | null;
export declare function calculateProfitSplit(pubkey: string): {
    totalProfit: number;
    agentProfit: number;
    protocolProfit: number;
} | null;
export declare function checkScaleUp(currentAllocation: number, consecutiveProfitableMonths: number, consecutiveProfit: number): number | null;
export declare function freezeVault(pubkey: string): Promise<boolean>;
export declare function getVaultPerformance(pubkey: string): {
    vault: VaultInfo & {
        subAccountId: number;
    };
    positions: import("../types").PositionInfo[];
    profitSplit: {
        totalProfit: number;
        agentProfit: number;
        protocolProfit: number;
    } | null;
} | null;
//# sourceMappingURL=vaultService.d.ts.map