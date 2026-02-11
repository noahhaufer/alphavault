"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDrift = initializeDrift;
exports.getDriftClient = getDriftClient;
exports.createSubAccount = createSubAccount;
exports.delegateSubAccount = delegateSubAccount;
exports.placePerpOrder = placePerpOrder;
exports.cancelAllOrders = cancelAllOrders;
exports.closeAllPositions = closeAllPositions;
exports.getPositions = getPositions;
exports.getOrderHistory = getOrderHistory;
exports.getAccountMetrics = getAccountMetrics;
exports.getTradeCount = getTradeCount;
exports.shutdownDrift = shutdownDrift;
/**
 * Drift Protocol SDK Service — real devnet trading integration
 */
const sdk_1 = require("@drift-labs/sdk");
const anchor_1 = require("@coral-xyz/anchor");
const solana_1 = require("../utils/solana");
let driftClient = null;
let initialized = false;
/**
 * Initialize the Drift SDK and subscribe to market data
 */
async function initializeDrift() {
    if (driftClient && initialized)
        return driftClient;
    const sdkConfig = (0, sdk_1.initialize)({ env: 'devnet' });
    const connection = (0, solana_1.getConnection)();
    const keypair = (0, solana_1.getServiceKeypair)();
    const wallet = new anchor_1.Wallet(keypair);
    const { perpMarketIndexes, spotMarketIndexes, oracleInfos } = (0, sdk_1.getMarketsAndOraclesForSubscription)('devnet');
    const bulkAccountLoader = new sdk_1.BulkAccountLoader(connection, 'confirmed', 1000);
    // Cast to any to avoid duplicate @solana/web3.js type conflicts
    driftClient = new sdk_1.DriftClient({
        connection: connection,
        wallet: wallet,
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
    console.log(`⚡ Drift SDK initialized — authority: ${keypair.publicKey.toBase58()}`);
    return driftClient;
}
/**
 * Get the drift client (must be initialized first)
 */
function getDriftClient() {
    if (!driftClient || !initialized) {
        throw new Error('Drift SDK not initialized. Call initializeDrift() first.');
    }
    return driftClient;
}
/**
 * Initialize a Drift user subaccount for a challenge entry
 */
async function createSubAccount(subAccountId, name) {
    const client = getDriftClient();
    try {
        const [txSig, pubkey] = await client.initializeUserAccount(subAccountId, name);
        console.log(`📂 Created subaccount ${subAccountId} (${name}): ${pubkey.toBase58()}`);
        return { txSig, pubkey: pubkey.toBase58() };
    }
    catch (err) {
        // Already exists is OK
        if (err.message?.includes('already in use') ||
            err.message?.includes('custom program error: 0x0')) {
            const pubkey = await client.getUserAccountPublicKey(subAccountId);
            console.log(`📂 Subaccount ${subAccountId} already exists: ${pubkey.toBase58()}`);
            return { txSig: 'already_exists', pubkey: pubkey.toBase58() };
        }
        throw err;
    }
}
/**
 * Delegate trading authority on a subaccount to an agent wallet.
 * The agent can trade but not withdraw.
 */
async function delegateSubAccount(subAccountId, delegatePublicKey) {
    const client = getDriftClient();
    const txSig = await client.updateUserDelegate(delegatePublicKey, subAccountId);
    console.log(`🔑 Delegated subaccount ${subAccountId} to ${delegatePublicKey.toBase58()}`);
    return txSig;
}
/**
 * Place a perp order on behalf of a subaccount
 */
async function placePerpOrder(params) {
    const client = getDriftClient();
    // Switch to the correct subaccount
    await client.switchActiveUser(params.subAccountId);
    const direction = params.side === 'long' ? sdk_1.PositionDirection.LONG : sdk_1.PositionDirection.SHORT;
    const baseAssetAmount = client.convertToPerpPrecision(params.size);
    const orderParams = {
        orderType: params.orderType === 'market' ? sdk_1.OrderType.MARKET : sdk_1.OrderType.LIMIT,
        marketType: sdk_1.MarketType.PERP,
        marketIndex: params.marketIndex,
        direction,
        baseAssetAmount,
    };
    if (params.orderType === 'limit' && params.price != null) {
        orderParams.price = new sdk_1.BN(params.price).mul(sdk_1.PRICE_PRECISION);
    }
    const txSig = await client.placePerpOrder(orderParams, undefined, params.subAccountId);
    console.log(`📈 Order placed: ${params.side} ${params.size} SOL-PERP (${params.orderType}) — tx: ${txSig}`);
    return txSig;
}
/**
 * Cancel all orders for a subaccount
 */
async function cancelAllOrders(subAccountId) {
    const client = getDriftClient();
    const txSig = await client.cancelOrders(undefined, undefined, undefined, undefined, subAccountId);
    return txSig;
}
/**
 * Close all perp positions for a subaccount (market order to flatten)
 */
async function closeAllPositions(subAccountId) {
    const client = getDriftClient();
    await client.switchActiveUser(subAccountId);
    const user = client.getUser(subAccountId);
    const positions = user.getActivePerpPositions();
    const txSigs = [];
    for (const pos of positions) {
        if (pos.baseAssetAmount.isZero())
            continue;
        const txSig = await client.closePosition(pos.marketIndex, undefined, subAccountId);
        txSigs.push(txSig);
        console.log(`📉 Closed position on market ${pos.marketIndex} — tx: ${txSig}`);
    }
    // Also cancel remaining open orders
    try {
        const cancelTx = await cancelAllOrders(subAccountId);
        txSigs.push(cancelTx);
    }
    catch {
        // No open orders is fine
    }
    return txSigs;
}
/**
 * Get active positions for a subaccount
 */
function getPositions(subAccountId) {
    const client = getDriftClient();
    const user = client.getUser(subAccountId);
    const positions = user.getActivePerpPositions();
    return positions.map((pos) => {
        const baseAmount = (0, sdk_1.convertToNumber)(pos.baseAssetAmount, sdk_1.BASE_PRECISION);
        const quoteAmount = (0, sdk_1.convertToNumber)(pos.quoteAssetAmount, sdk_1.QUOTE_PRECISION);
        const quoteEntry = (0, sdk_1.convertToNumber)(pos.quoteEntryAmount, sdk_1.QUOTE_PRECISION);
        let direction = 'flat';
        if (pos.baseAssetAmount.gt(new sdk_1.BN(0)))
            direction = 'long';
        else if (pos.baseAssetAmount.lt(new sdk_1.BN(0)))
            direction = 'short';
        const unrealizedPnl = (0, sdk_1.convertToNumber)(user.getUnrealizedPNL(true, pos.marketIndex), sdk_1.QUOTE_PRECISION);
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
function getOrderHistory(subAccountId) {
    const client = getDriftClient();
    const user = client.getUser(subAccountId);
    const userAccount = client.getUserAccount(subAccountId);
    if (!userAccount)
        return [];
    return userAccount.orders
        .filter((o) => o.orderId !== 0)
        .map((order) => ({
        orderId: order.orderId,
        marketIndex: order.marketIndex,
        direction: order.direction === sdk_1.PositionDirection.LONG ? 'long' : 'short',
        baseAssetAmountFilled: (0, sdk_1.convertToNumber)(order.baseAssetAmountFilled, sdk_1.BASE_PRECISION),
        quoteAssetAmountFilled: (0, sdk_1.convertToNumber)(order.quoteAssetAmountFilled, sdk_1.QUOTE_PRECISION),
        status: order.status === sdk_1.OrderType.FILLED ? 'filled' : 'open',
    }));
}
/**
 * Get account equity and unrealized PnL for a subaccount
 */
function getAccountMetrics(subAccountId) {
    const client = getDriftClient();
    const user = client.getUser(subAccountId);
    const equity = (0, sdk_1.convertToNumber)(user.getTotalCollateral(), sdk_1.QUOTE_PRECISION);
    const unrealizedPnl = (0, sdk_1.convertToNumber)(user.getUnrealizedPNL(true), sdk_1.QUOTE_PRECISION);
    const freeCollateral = (0, sdk_1.convertToNumber)(user.getFreeCollateral(), sdk_1.QUOTE_PRECISION);
    return { equity, unrealizedPnl, freeCollateral };
}
/**
 * Get trade count from filled orders in the user account
 */
function getTradeCount(subAccountId) {
    const client = getDriftClient();
    const userAccount = client.getUserAccount(subAccountId);
    if (!userAccount)
        return 0;
    return userAccount.totalDeposits ? userAccount.orders.filter((o) => o.orderId !== 0 && !o.baseAssetAmountFilled.isZero()).length : 0;
}
/**
 * Shutdown the drift client gracefully
 */
async function shutdownDrift() {
    if (driftClient) {
        await driftClient.unsubscribe();
        driftClient = null;
        initialized = false;
        console.log('⚡ Drift SDK shutdown');
    }
}
//# sourceMappingURL=driftService.js.map