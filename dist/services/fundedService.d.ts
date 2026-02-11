import { FundedAccount, ProfitWithdrawalResult, PerformanceSummary } from '../types';
export declare function applyForFunding(agentId: string, agentName: string): FundedAccount | {
    error: string;
};
export declare function getFundedStatus(agentId: string): FundedAccount | undefined;
export declare function getFundedAccountById(accountId: string): FundedAccount | undefined;
export declare function activateFundedAccount(accountId: string): Promise<FundedAccount | null>;
export declare function getAllFundedAccounts(): FundedAccount[];
export declare function checkFundedLossLimits(accountId: string): {
    breached: boolean;
    reason?: string;
};
export declare function withdrawProfits(accountId: string): ProfitWithdrawalResult | {
    error: string;
};
export declare function getPerformance(accountId: string): PerformanceSummary | {
    error: string;
};
//# sourceMappingURL=fundedService.d.ts.map