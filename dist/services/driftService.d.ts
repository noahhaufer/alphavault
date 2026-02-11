/**
 * Drift Protocol SDK Service — real devnet trading integration
 */
import { DriftClient } from '@drift-labs/sdk';
import { PublicKey } from '@solana/web3.js';
import { OrderSide, OrderKind, PositionInfo, TradeHistoryEntry } from '../types';
/**
 * Initialize the Drift SDK and subscribe to market data
 */
export declare function initializeDrift(): Promise<DriftClient>;
/**
 * Get the drift client (must be initialized first)
 */
export declare function getDriftClient(): DriftClient;
/**
 * Initialize a Drift user subaccount for a challenge entry
 */
export declare function createSubAccount(subAccountId: number, name: string): Promise<{
    txSig: string;
    pubkey: string;
}>;
/**
 * Delegate trading authority on a subaccount to an agent wallet.
 * The agent can trade but not withdraw.
 */
export declare function delegateSubAccount(subAccountId: number, delegatePublicKey: PublicKey): Promise<string>;
/**
 * Place a perp order on behalf of a subaccount
 */
export declare function placePerpOrder(params: {
    subAccountId: number;
    marketIndex: number;
    side: OrderSide;
    size: number;
    orderType: OrderKind;
    price?: number;
}): Promise<string>;
/**
 * Cancel all orders for a subaccount
 */
export declare function cancelAllOrders(subAccountId: number): Promise<string>;
/**
 * Close all perp positions for a subaccount (market order to flatten)
 */
export declare function closeAllPositions(subAccountId: number): Promise<string[]>;
/**
 * Get active positions for a subaccount
 */
export declare function getPositions(subAccountId: number): PositionInfo[];
/**
 * Get order history (open orders) for a subaccount
 */
export declare function getOrderHistory(subAccountId: number): TradeHistoryEntry[];
/**
 * Get account equity and unrealized PnL for a subaccount
 */
export declare function getAccountMetrics(subAccountId: number): {
    equity: number;
    unrealizedPnl: number;
    freeCollateral: number;
};
/**
 * Get trade count from filled orders in the user account
 */
export declare function getTradeCount(subAccountId: number): number;
/**
 * Shutdown the drift client gracefully
 */
export declare function shutdownDrift(): Promise<void>;
//# sourceMappingURL=driftService.d.ts.map