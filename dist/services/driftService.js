"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDrift = initializeDrift;
exports.getDriftClient = getDriftClient;
exports.depositCollateral = depositCollateral;
exports.createSubAccount = createSubAccount;
exports.delegateSubAccount = delegateSubAccount;
exports.placePerpOrder = placePerpOrder;
exports.cancelAllOrders = cancelAllOrders;
exports.closeAllPositions = closeAllPositions;
exports.getPositions = getPositions;
exports.getOrderHistory = getOrderHistory;
exports.getAccountMetrics = getAccountMetrics;
exports.getTradeCount = getTradeCount;
exports.getAccountEquity = getAccountEquity;
exports.getMarketPrices = getMarketPrices;
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
 * Deposit SOL as collateral into Drift subaccount
 */
async function depositCollateral(amountSol, subAccountId = 0) {
    const client = getDriftClient();
    const keypair = (0, solana_1.getServiceKeypair)();
    // Market index 1 = SOL spot, use BASE_PRECISION (1e9) for SOL amounts
    const amount = new sdk_1.BN(amountSol * 1e9);
    const txSig = await client.deposit(amount, 1, keypair.publicKey, subAccountId);
    console.log(`💰 Deposited ${amountSol} SOL to subaccount ${subAccountId} — tx: ${txSig}`);
    return txSig;
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
 * Place a perp order on behalf of a subaccount.
 * Supports market, limit, stop-loss (trigger market), and take-profit (trigger limit).
 */
async function placePerpOrder(params) {
    const client = getDriftClient();
    // Switch to the correct subaccount
    await client.switchActiveUser(params.subAccountId);
    const direction = params.side === 'long' ? sdk_1.PositionDirection.LONG : sdk_1.PositionDirection.SHORT;
    // Apply leverage to size if specified
    const effectiveSize = params.leverage && params.leverage > 1
        ? params.size * params.leverage
        : params.size;
    const baseAssetAmount = client.convertToPerpPrecision(effectiveSize);
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
    console.log(`📈 Order placed: ${params.side} ${effectiveSize} market#${params.marketIndex} (${params.orderType}) — tx: ${txSig}`);
    // Place stop-loss trigger order if specified
    if (params.stopLoss != null && params.stopLoss > 0) {
        await placeTriggerOrder({
            client,
            subAccountId: params.subAccountId,
            marketIndex: params.marketIndex,
            side: params.side,
            size: effectiveSize,
            triggerPrice: params.stopLoss,
            isStopLoss: true,
        });
    }
    // Place take-profit trigger order if specified
    if (params.takeProfit != null && params.takeProfit > 0) {
        await placeTriggerOrder({
            client,
            subAccountId: params.subAccountId,
            marketIndex: params.marketIndex,
            side: params.side,
            size: effectiveSize,
            triggerPrice: params.takeProfit,
            isStopLoss: false,
        });
    }
    return txSig;
}
/**
 * Place a trigger order (stop-loss or take-profit) to close a position.
 */
async function placeTriggerOrder(params) {
    // Closing direction is opposite of the position
    const closeDirection = params.side === 'long' ? sdk_1.PositionDirection.SHORT : sdk_1.PositionDirection.LONG;
    const baseAssetAmount = params.client.convertToPerpPrecision(params.size);
    const triggerPriceBN = new sdk_1.BN(params.triggerPrice).mul(sdk_1.PRICE_PRECISION);
    // Stop-loss: trigger when price moves against position
    // Take-profit: trigger when price moves in favor
    // For longs: SL triggers below (triggerBelow), TP triggers above (triggerAbove)
    // For shorts: SL triggers above (triggerAbove), TP triggers below (triggerBelow)
    const isLong = params.side === 'long';
    const triggerBelow = params.isStopLoss ? isLong : !isLong;
    const orderType = params.isStopLoss
        ? sdk_1.OrderType.TRIGGER_MARKET
        : sdk_1.OrderType.TRIGGER_LIMIT;
    const orderParams = {
        orderType,
        marketType: sdk_1.MarketType.PERP,
        marketIndex: params.marketIndex,
        direction: closeDirection,
        baseAssetAmount,
        triggerPrice: triggerPriceBN,
        triggerCondition: triggerBelow ? { below: {} } : { above: {} },
        reduceOnly: true,
    };
    // For trigger limit, set the price to the trigger price
    if (orderType === sdk_1.OrderType.TRIGGER_LIMIT) {
        orderParams.price = triggerPriceBN;
    }
    const txSig = await params.client.placePerpOrder(orderParams, undefined, params.subAccountId);
    const label = params.isStopLoss ? 'Stop-loss' : 'Take-profit';
    console.log(`🛡️ ${label} placed: market#${params.marketIndex} @ ${params.triggerPrice} — tx: ${txSig}`);
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
 * Get account equity for a subaccount (collateral + unrealized PnL)
 */
function getAccountEquity(subAccountId) {
    const client = getDriftClient();
    const user = client.getUser(subAccountId);
    // Get collateral value
    const collateral = (0, sdk_1.convertToNumber)(user.getTotalCollateral(), sdk_1.QUOTE_PRECISION);
    // Get unrealized PnL across all positions
    const unrealizedPnl = (0, sdk_1.convertToNumber)(user.getUnrealizedPNL(true, undefined, undefined), sdk_1.QUOTE_PRECISION);
    return collateral + unrealizedPnl;
}
/**
 * Get current oracle prices for all perp markets
 */
function getMarketPrices() {
    const client = getDriftClient();
    const markets = client.getPerpMarketAccounts();
    const prices = [];
    // Market name mapping
    const marketNames = {
        0: 'SOL-PERP',
        1: 'BTC-PERP',
        2: 'ETH-PERP',
        3: 'APT-PERP',
        4: 'BONK-PERP',
        5: 'MATIC-PERP',
        6: 'ARB-PERP',
        7: 'DOGE-PERP',
        8: 'BNB-PERP',
        9: 'SUI-PERP',
        10: 'PEPE-PERP',
        11: 'OP-PERP',
        12: 'RENDER-PERP',
        13: 'XRP-PERP',
        14: 'HNT-PERP',
        15: 'INJ-PERP',
        16: 'LINK-PERP',
        17: 'RLB-PERP',
        18: 'PYTH-PERP',
        19: 'TIA-PERP',
        20: 'JTO-PERP',
        21: 'SEI-PERP',
        22: 'WIF-PERP',
        23: 'JUP-PERP',
        24: 'DYM-PERP',
        25: 'TAO-PERP',
        26: 'W-PERP',
        27: 'KMNO-PERP',
        28: 'TNSR-PERP',
    };
    for (const market of markets) {
        try {
            const oracleData = client.getOracleDataForPerpMarket(market.marketIndex);
            const price = (0, sdk_1.convertToNumber)(oracleData.price, sdk_1.PRICE_PRECISION);
            const confidence = oracleData.confidence
                ? (0, sdk_1.convertToNumber)(oracleData.confidence, sdk_1.PRICE_PRECISION)
                : undefined;
            prices.push({
                marketIndex: market.marketIndex,
                marketName: marketNames[market.marketIndex] || `MARKET-${market.marketIndex}`,
                price,
                confidence,
                slot: oracleData.slot.toNumber(),
            });
        }
        catch (err) {
            // Skip markets with no oracle data
            continue;
        }
    }
    return prices;
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