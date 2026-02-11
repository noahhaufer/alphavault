/**
 * Drift Protocol SDK Service — real devnet trading integration
 */
import {
  DriftClient,
  initialize,
  PositionDirection,
  OrderType,
  MarketType,
  BASE_PRECISION,
  PRICE_PRECISION,
  QUOTE_PRECISION,
  getMarketsAndOraclesForSubscription,
  BulkAccountLoader,
  convertToNumber,
  BN,
} from '@drift-labs/sdk';
import { Keypair, PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { getConnection, getServiceKeypair } from '../utils/solana';
import {
  OrderSide,
  OrderKind,
  PositionInfo,
  TradeHistoryEntry,
} from '../types';

let driftClient: DriftClient | null = null;
let initialized = false;

/**
 * Initialize the Drift SDK and subscribe to market data
 */
export async function initializeDrift(): Promise<DriftClient> {
  if (driftClient && initialized) return driftClient;

  const sdkConfig = initialize({ env: 'devnet' });
  const connection = getConnection();
  const keypair = getServiceKeypair();
  const wallet = new Wallet(keypair);

  const { perpMarketIndexes, spotMarketIndexes, oracleInfos } =
    getMarketsAndOraclesForSubscription('devnet');

  const bulkAccountLoader = new BulkAccountLoader(connection as any, 'confirmed', 1000);

  // Cast to any to avoid duplicate @solana/web3.js type conflicts
  driftClient = new DriftClient({
    connection: connection as any,
    wallet: wallet as any,
    env: 'devnet',
    perpMarketIndexes,
    spotMarketIndexes,
    oracleInfos,
    accountSubscription: {
      type: 'polling',
      accountLoader: bulkAccountLoader,
    },
  });

  await driftClient.subscribe();
  initialized = true;

  console.log(
    `⚡ Drift SDK initialized — authority: ${keypair.publicKey.toBase58()}`
  );

  return driftClient;
}

/**
 * Get the drift client (must be initialized first)
 */
export function getDriftClient(): DriftClient {
  if (!driftClient || !initialized) {
    throw new Error('Drift SDK not initialized. Call initializeDrift() first.');
  }
  return driftClient;
}

/**
 * Initialize a Drift user subaccount for a challenge entry
 */
export async function createSubAccount(
  subAccountId: number,
  name: string
): Promise<{ txSig: string; pubkey: string }> {
  const client = getDriftClient();

  try {
    const [txSig, pubkey] = await client.initializeUserAccount(
      subAccountId,
      name
    );
    console.log(
      `📂 Created subaccount ${subAccountId} (${name}): ${pubkey.toBase58()}`
    );
    return { txSig, pubkey: pubkey.toBase58() };
  } catch (err: any) {
    // Already exists is OK
    if (
      err.message?.includes('already in use') ||
      err.message?.includes('custom program error: 0x0')
    ) {
      const pubkey = await client.getUserAccountPublicKey(subAccountId);
      console.log(
        `📂 Subaccount ${subAccountId} already exists: ${pubkey.toBase58()}`
      );
      return { txSig: 'already_exists', pubkey: pubkey.toBase58() };
    }
    throw err;
  }
}

/**
 * Delegate trading authority on a subaccount to an agent wallet.
 * The agent can trade but not withdraw.
 */
export async function delegateSubAccount(
  subAccountId: number,
  delegatePublicKey: PublicKey
): Promise<string> {
  const client = getDriftClient();
  const txSig = await client.updateUserDelegate(
    delegatePublicKey,
    subAccountId
  );
  console.log(
    `🔑 Delegated subaccount ${subAccountId} to ${delegatePublicKey.toBase58()}`
  );
  return txSig;
}

/**
 * Place a perp order on behalf of a subaccount
 */
export async function placePerpOrder(params: {
  subAccountId: number;
  marketIndex: number;
  side: OrderSide;
  size: number;
  orderType: OrderKind;
  price?: number;
}): Promise<string> {
  const client = getDriftClient();

  // Switch to the correct subaccount
  await client.switchActiveUser(params.subAccountId);

  const direction =
    params.side === 'long' ? PositionDirection.LONG : PositionDirection.SHORT;

  const baseAssetAmount = client.convertToPerpPrecision(params.size);

  const orderParams: any = {
    orderType:
      params.orderType === 'market' ? OrderType.MARKET : OrderType.LIMIT,
    marketType: MarketType.PERP,
    marketIndex: params.marketIndex,
    direction,
    baseAssetAmount,
  };

  if (params.orderType === 'limit' && params.price != null) {
    orderParams.price = new BN(params.price).mul(PRICE_PRECISION);
  }

  const txSig = await client.placePerpOrder(orderParams, undefined, params.subAccountId);

  console.log(
    `📈 Order placed: ${params.side} ${params.size} SOL-PERP (${params.orderType}) — tx: ${txSig}`
  );

  return txSig;
}

/**
 * Cancel all orders for a subaccount
 */
export async function cancelAllOrders(
  subAccountId: number
): Promise<string> {
  const client = getDriftClient();
  const txSig = await client.cancelOrders(
    undefined,
    undefined,
    undefined,
    undefined,
    subAccountId
  );
  return txSig;
}

/**
 * Close all perp positions for a subaccount (market order to flatten)
 */
export async function closeAllPositions(
  subAccountId: number
): Promise<string[]> {
  const client = getDriftClient();
  await client.switchActiveUser(subAccountId);

  const user = client.getUser(subAccountId);
  const positions = user.getActivePerpPositions();
  const txSigs: string[] = [];

  for (const pos of positions) {
    if (pos.baseAssetAmount.isZero()) continue;

    const txSig = await client.closePosition(
      pos.marketIndex,
      undefined,
      subAccountId
    );
    txSigs.push(txSig);
    console.log(
      `📉 Closed position on market ${pos.marketIndex} — tx: ${txSig}`
    );
  }

  // Also cancel remaining open orders
  try {
    const cancelTx = await cancelAllOrders(subAccountId);
    txSigs.push(cancelTx);
  } catch {
    // No open orders is fine
  }

  return txSigs;
}

/**
 * Get active positions for a subaccount
 */
export function getPositions(subAccountId: number): PositionInfo[] {
  const client = getDriftClient();
  const user = client.getUser(subAccountId);
  const positions = user.getActivePerpPositions();

  return positions.map((pos) => {
    const baseAmount = convertToNumber(pos.baseAssetAmount, BASE_PRECISION);
    const quoteAmount = convertToNumber(
      pos.quoteAssetAmount,
      QUOTE_PRECISION
    );
    const quoteEntry = convertToNumber(
      pos.quoteEntryAmount,
      QUOTE_PRECISION
    );

    let direction: 'long' | 'short' | 'flat' = 'flat';
    if (pos.baseAssetAmount.gt(new BN(0))) direction = 'long';
    else if (pos.baseAssetAmount.lt(new BN(0))) direction = 'short';

    const unrealizedPnl = convertToNumber(
      user.getUnrealizedPNL(true, pos.marketIndex),
      QUOTE_PRECISION
    );

    return {
      marketIndex: pos.marketIndex,
      baseAssetAmount: baseAmount,
      quoteAssetAmount: quoteAmount,
      quoteEntryAmount: quoteEntry,
      unrealizedPnl,
      direction,
    };
  });
}

/**
 * Get order history (open orders) for a subaccount
 */
export function getOrderHistory(subAccountId: number): TradeHistoryEntry[] {
  const client = getDriftClient();
  const user = client.getUser(subAccountId);
  const userAccount = client.getUserAccount(subAccountId);

  if (!userAccount) return [];

  return userAccount.orders
    .filter((o) => o.orderId !== 0)
    .map((order) => ({
      orderId: order.orderId,
      marketIndex: order.marketIndex,
      direction: order.direction === PositionDirection.LONG ? 'long' : 'short',
      baseAssetAmountFilled: convertToNumber(
        order.baseAssetAmountFilled,
        BASE_PRECISION
      ),
      quoteAssetAmountFilled: convertToNumber(
        order.quoteAssetAmountFilled,
        QUOTE_PRECISION
      ),
      status: order.status === (OrderType as any).FILLED ? 'filled' : 'open',
    }));
}

/**
 * Get account equity and unrealized PnL for a subaccount
 */
export function getAccountMetrics(subAccountId: number): {
  equity: number;
  unrealizedPnl: number;
  freeCollateral: number;
} {
  const client = getDriftClient();
  const user = client.getUser(subAccountId);

  const equity = convertToNumber(
    user.getTotalCollateral(),
    QUOTE_PRECISION
  );
  const unrealizedPnl = convertToNumber(
    user.getUnrealizedPNL(true),
    QUOTE_PRECISION
  );
  const freeCollateral = convertToNumber(
    user.getFreeCollateral(),
    QUOTE_PRECISION
  );

  return { equity, unrealizedPnl, freeCollateral };
}

/**
 * Get trade count from filled orders in the user account
 */
export function getTradeCount(subAccountId: number): number {
  const client = getDriftClient();
  const userAccount = client.getUserAccount(subAccountId);
  if (!userAccount) return 0;

  return userAccount.totalDeposits ? userAccount.orders.filter(
    (o) => o.orderId !== 0 && !o.baseAssetAmountFilled.isZero()
  ).length : 0;
}

/**
 * Shutdown the drift client gracefully
 */
export async function shutdownDrift(): Promise<void> {
  if (driftClient) {
    await driftClient.unsubscribe();
    driftClient = null;
    initialized = false;
    console.log('⚡ Drift SDK shutdown');
  }
}
