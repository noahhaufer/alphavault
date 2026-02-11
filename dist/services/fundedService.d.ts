import { FundedAccount, ProfitWithdrawalResult, PerformanceSummary } from '../types';
export declare function applyForFunding(agentId: string, agentName: string): FundedAccount | {
    error: string;
};
export declare function getFundedStatus(agentId: string): FundedAccount | undefined;
export declare function activateFundedAccount(accountId: string): Promise<FundedAccount | null>;
export declare function getAllFundedAccounts(): FundedAccount[];
export declare function getFundedAccountById(accountId: string): FundedAccount | undefined;
/**
 * Withdraw profits from a funded account.
 * Agent can only withdraw profits (equity - allocation), not principal.
 * Protocol takes a configurable fee (default 20%).
 */
export declare function withdrawProfits(accountId: string): ProfitWithdrawalResult | {
    error: string;
};
/**
 * Get performance summary for a funded account.
 */
export declare function getPerformance(accountId: string): PerformanceSummary | {
    error: string;
};
//# sourceMappingURL=fundedService.d.ts.map