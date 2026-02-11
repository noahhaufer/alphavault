export type ChallengePhase = 1 | 2;

export const ACCOUNT_TIERS = [
  { capital: 10_000, fee: 89 },
  { capital: 25_000, fee: 199 },
  { capital: 50_000, fee: 299 },
  { capital: 100_000, fee: 499 },
  { capital: 200_000, fee: 899 },
];

export interface Challenge {
  id: string; name: string; description: string;
  startingCapital: number; durationDays: number; profitTarget: number;
  maxDailyLoss: number; maxTotalLoss: number; minTradingDays: number;
  phase: ChallengePhase; market: string; challengeFee: number;
  status: 'active' | 'upcoming' | 'completed'; createdAt: number;
}

export interface ChallengeEntry {
  id: string; challengeId: string; agentId: string; agentName: string;
  subAccountId: number; authority: string; startedAt: number; endsAt: number;
  status: 'active' | 'passed' | 'failed' | 'expired';
  metrics: PerformanceMetrics; proofTx?: string;
  phase: ChallengePhase; phase1EntryId?: string;
}

export interface PerformanceMetrics {
  currentPnl: number; currentPnlPercent: number;
  maxDrawdown: number; maxDrawdownPercent: number;
  maxDailyLoss: number; maxDailyLossPercent: number;
  dailyLoss: number; dailyLossPercent: number; dailyLossDate: string;
  peakEquity: number; currentEquity: number;
  sharpeRatio: number; totalTrades: number; winRate: number;
  pnlHistory: number[]; tradingDays: string[];
}

export interface FundedAccount {
  id: string; agentId: string; agentName: string;
  challengeEntryId: string; verificationEntryId: string;
  allocation: number;
  status: 'pending' | 'active' | 'suspended' | 'revoked';
  appliedAt: number; activatedAt?: number;
  performanceMetrics?: PerformanceMetrics; proofTx?: string;
  vaultPubkey?: string; currentEquity?: number;
  totalWithdrawn?: number; protocolFeeBps?: number;
  maxDailyLoss: number; maxTotalLoss: number;
}

export interface ProfitWithdrawalResult {
  txSignature: string; initialAllocation: number; currentEquity: number;
  totalProfit: number; protocolFee: number; agentPayout: number; feeRateBps: number;
}

export interface PerformanceSummary {
  initialAllocation: number; currentEquity: number; totalProfit: number;
  availableToWithdraw: number; protocolFeeRate: number; agentShareRate: number;
  totalWithdrawn: number;
}

export interface LeaderboardEntry {
  rank: number; agentId: string; agentName: string;
  pnlPercent: number; maxDrawdown: number; sharpeRatio: number;
  status: ChallengeEntry['status'];
}

export interface ApiResponse<T = any> { success: boolean; data?: T; error?: string; timestamp: number; }
export type OrderSide = 'long' | 'short';
export type OrderKind = 'market' | 'limit';

/** Supported Drift perp markets (devnet) */
export const PERP_MARKET_MAP: Record<string, number> = {
  'SOL-PERP': 0,
  'BTC-PERP': 1,
  'ETH-PERP': 2,
  'APT-PERP': 3,
  '1MBONK-PERP': 4,
  'MATIC-PERP': 5,
  'ARB-PERP': 6,
  'DOGE-PERP': 7,
  'BNB-PERP': 8,
  'SUI-PERP': 9,
  '1MPEPE-PERP': 10,
  'OP-PERP': 11,
  'RENDER-PERP': 12,
  'XRP-PERP': 13,
  'HNT-PERP': 14,
  'INJ-PERP': 15,
  'LINK-PERP': 16,
  'RLB-PERP': 17,
  'PYTH-PERP': 18,
  'TIA-PERP': 19,
  'JTO-PERP': 20,
  'SEI-PERP': 21,
  'WIF-PERP': 22,
  'JUP-PERP': 23,
  'DYM-PERP': 24,
  'TAO-PERP': 25,
  'W-PERP': 26,
  'KMNO-PERP': 27,
  'TNSR-PERP': 28,
};

export function resolveMarketIndex(market?: string): number {
  if (market == null) return 0; // default SOL-PERP
  const upper = market.toUpperCase();
  if (upper in PERP_MARKET_MAP) return PERP_MARKET_MAP[upper];
  const asNum = Number(market);
  if (!isNaN(asNum) && asNum >= 0) return asNum;
  throw new Error(`Unknown perp market: ${market}. Supported: ${Object.keys(PERP_MARKET_MAP).join(', ')}`);
}

export interface PlaceOrderRequest {
  agentId: string; entryId: string; side: OrderSide; size: number;
  orderType: OrderKind; price?: number;
  market?: string;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface OrderResult {
  txSignature: string; marketIndex: number; side: OrderSide; size: number;
  orderType: OrderKind; price?: number; timestamp: number;
}

export interface PositionInfo {
  marketIndex: number; baseAssetAmount: number; quoteAssetAmount: number;
  quoteEntryAmount: number; unrealizedPnl: number;
  direction: 'long' | 'short' | 'flat';
}

export interface TradeHistoryEntry {
  orderId: number; marketIndex: number; direction: string;
  baseAssetAmountFilled: number; quoteAssetAmountFilled: number; status: string;
}

export interface VaultConfig {
  name: string; delegateAuthority: string;
  agentProfitShareBps: number; maxAllocation: number;
}

export interface VaultInfo {
  pubkey: string; name: string; delegateAuthority: string;
  totalDeposits: number; currentEquity: number;
  agentProfitShareBps: number;
  status: 'active' | 'frozen' | 'closed'; createdAt: number;
}
