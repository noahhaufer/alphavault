/**
 * AlphaVault Type Definitions
 */
export interface Challenge {
    id: string;
    name: string;
    description: string;
    /** Starting capital in USDC */
    startingCapital: number;
    /** Duration in hours */
    durationHours: number;
    /** Required profit % to pass */
    profitTarget: number;
    /** Max allowed drawdown % */
    maxDrawdown: number;
    /** Market to trade */
    market: string;
    status: 'active' | 'upcoming' | 'completed';
    createdAt: number;
}
export interface ChallengeEntry {
    id: string;
    challengeId: string;
    agentId: string;
    agentName: string;
    /** Drift subaccount index */
    subAccountId: number;
    /** Public key of the subaccount authority */
    authority: string;
    startedAt: number;
    endsAt: number;
    status: 'active' | 'passed' | 'failed' | 'expired';
    metrics: PerformanceMetrics;
    /** Solana tx signature of on-chain proof */
    proofTx?: string;
}
export interface PerformanceMetrics {
    currentPnl: number;
    currentPnlPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    peakEquity: number;
    currentEquity: number;
    sharpeRatio: number;
    totalTrades: number;
    winRate: number;
    /** Rolling PnL snapshots for Sharpe calculation */
    pnlHistory: number[];
}
export interface FundedAccount {
    id: string;
    agentId: string;
    agentName: string;
    challengeEntryId: string;
    allocation: number;
    status: 'pending' | 'active' | 'suspended' | 'revoked';
    appliedAt: number;
    activatedAt?: number;
    performanceMetrics?: PerformanceMetrics;
    proofTx?: string;
    /** Drift vault pubkey (if created) */
    vaultPubkey?: string;
    /** Current equity (updated on refresh) */
    currentEquity?: number;
    /** Total profits withdrawn so far */
    totalWithdrawn?: number;
    /** Protocol fee rate in basis points (default 2000 = 20%) */
    protocolFeeBps?: number;
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
export interface PlaceOrderRequest {
    agentId: string;
    entryId: string;
    side: OrderSide;
    /** Size in base asset (e.g. 1 = 1 SOL) */
    size: number;
    orderType: OrderKind;
    /** Required for limit orders — price in USD */
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
    /** Agent public key that will be delegated trading */
    delegateAuthority: string;
    /** Profit share to agent in basis points (e.g. 8000 = 80%) */
    agentProfitShareBps: number;
    /** Max allocation in USDC */
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