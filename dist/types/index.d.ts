/**
 * AlphaVault Type Definitions
 *
 * Two-phase challenge system (prop firm style):
 *   Phase 1 (Challenge): 8% profit target, 5% max daily loss, 10% max total loss, min 10 trading days, 30-day window
 *   Phase 2 (Verification): 5% profit target, same loss limits, min 10 trading days, 60-day window
 *   Agent must pass BOTH phases to get funded.
 *
 * Funded accounts: no profit target, same loss limits, 90/10 profit split (agent/protocol).
 */
export type ChallengePhase = 1 | 2;
export interface AccountTier {
    /** Starting capital in USDC */
    capital: number;
    /** Challenge fee in USDC (refundable on pass) */
    fee: number;
}
export declare const ACCOUNT_TIERS: AccountTier[];
export interface Challenge {
    id: string;
    name: string;
    description: string;
    startingCapital: number;
    durationDays: number;
    profitTarget: number;
    maxDailyLoss: number;
    maxTotalLoss: number;
    minTradingDays: number;
    phase: ChallengePhase;
    challengeFee: number;
    market: string;
    status: 'active' | 'upcoming' | 'completed';
    createdAt: number;
}
export interface ChallengeEntry {
    id: string;
    challengeId: string;
    agentId: string;
    agentName: string;
    subAccountId: number;
    authority: string;
    startedAt: number;
    endsAt: number;
    status: 'active' | 'passed' | 'failed' | 'expired';
    metrics: PerformanceMetrics;
    proofTx?: string;
    phase: ChallengePhase;
    phase1EntryId?: string;
}
export interface PerformanceMetrics {
    currentPnl: number;
    currentPnlPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    maxDailyLoss: number;
    maxDailyLossPercent: number;
    dailyLoss: number;
    dailyLossPercent: number;
    dailyLossDate: string;
    peakEquity: number;
    currentEquity: number;
    sharpeRatio: number;
    totalTrades: number;
    winRate: number;
    pnlHistory: number[];
    tradingDays: string[];
}
export interface PayoutSchedule {
    id: string;
    fundedAccountId: string;
    availableAt: number;
    amount: number;
    status: 'pending' | 'paid' | 'skipped';
    paidAt?: number;
    txSignature?: string;
}
export interface FundedAccount {
    id: string;
    agentId: string;
    agentName: string;
    challengeEntryId: string;
    verificationEntryId: string;
    allocation: number;
    status: 'pending' | 'active' | 'suspended' | 'revoked';
    appliedAt: number;
    activatedAt?: number;
    performanceMetrics?: PerformanceMetrics;
    proofTx?: string;
    vaultPubkey?: string;
    currentEquity?: number;
    totalWithdrawn?: number;
    protocolFeeBps: number;
    maxDailyLoss: number;
    maxTotalLoss: number;
    payoutSchedule: PayoutSchedule[];
    firstPayoutAt: number;
    consecutiveProfitableMonths: number;
    consecutiveProfit: number;
    feeRefunded: boolean;
    challengeFee: number;
}
export interface ProfitWithdrawalResult {
    txSignature: string;
    initialAllocation: number;
    currentEquity: number;
    totalProfit: number;
    protocolFee: number;
    agentPayout: number;
    feeRateBps: number;
}
export interface PerformanceSummary {
    initialAllocation: number;
    currentEquity: number;
    totalProfit: number;
    availableToWithdraw: number;
    protocolFeeRate: number;
    agentShareRate: number;
    totalWithdrawn: number;
    nextPayoutAt: number | null;
    payoutSchedule: PayoutSchedule[];
}
export interface LeaderboardEntry {
    rank: number;
    agentId: string;
    agentName: string;
    pnlPercent: number;
    maxDrawdown: number;
    sharpeRatio: number;
    status: ChallengeEntry['status'];
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: number;
}
export type OrderSide = 'long' | 'short';
export type OrderKind = 'market' | 'limit';
export interface PlaceOrderRequest {
    agentId: string;
    entryId: string;
    side: OrderSide;
    size: number;
    orderType: OrderKind;
    price?: number;
}
export interface OrderResult {
    txSignature: string;
    marketIndex: number;
    side: OrderSide;
    size: number;
    orderType: OrderKind;
    price?: number;
    timestamp: number;
}
export interface PositionInfo {
    marketIndex: number;
    baseAssetAmount: number;
    quoteAssetAmount: number;
    quoteEntryAmount: number;
    unrealizedPnl: number;
    direction: 'long' | 'short' | 'flat';
}
export interface TradeHistoryEntry {
    orderId: number;
    marketIndex: number;
    direction: string;
    baseAssetAmountFilled: number;
    quoteAssetAmountFilled: number;
    status: string;
}
export interface VaultConfig {
    name: string;
    delegateAuthority: string;
    agentProfitShareBps: number;
    maxAllocation: number;
}
export interface VaultInfo {
    pubkey: string;
    name: string;
    delegateAuthority: string;
    totalDeposits: number;
    currentEquity: number;
    agentProfitShareBps: number;
    status: 'active' | 'frozen' | 'closed';
    createdAt: number;
}
//# sourceMappingURL=index.d.ts.map