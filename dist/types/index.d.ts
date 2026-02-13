export type ChallengePhase = 1 | 2;
export declare const ACCOUNT_TIERS: {
    capital: number;
    fee: number;
}[];
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
    market: string;
    challengeFee: number;
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
    protocolFeeBps?: number;
    maxDailyLoss: number;
    maxTotalLoss: number;
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
/** Supported Drift perp markets (devnet) */
export declare const PERP_MARKET_MAP: Record<string, number>;
export declare function resolveMarketIndex(market?: string): number;
export interface PlaceOrderRequest {
    agentId: string;
    entryId: string;
    side: OrderSide;
    size: number;
    orderType: OrderKind;
    price?: number;
    market?: string;
    leverage?: number;
    stopLoss?: number;
    takeProfit?: number;
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