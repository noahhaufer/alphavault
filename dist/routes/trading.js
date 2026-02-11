"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Trading API Routes — agents place orders via Drift SDK
 */
const express_1 = require("express");
const driftService_1 = require("../services/driftService");
const challengeService_1 = require("../services/challengeService");
const router = (0, express_1.Router)();
const SOL_PERP_MARKET_INDEX = 0;
/**
 * POST /trading/order — place a perp order
 */
router.post('/order', async (req, res) => {
    try {
        const body = req.body;
        const { agentId, entryId, side, size, orderType, price } = body;
        // Validate required fields
        if (!agentId || !entryId || !side || !size || !orderType) {
            res.status(400).json({
                success: false,
                error: 'Required fields: agentId, entryId, side (long/short), size, orderType (market/limit)',
                timestamp: Date.now(),
            });
            return;
        }
        if (!['long', 'short'].includes(side)) {
            res.status(400).json({
                success: false,
                error: 'side must be "long" or "short"',
                timestamp: Date.now(),
            });
            return;
        }
        if (!['market', 'limit'].includes(orderType)) {
            res.status(400).json({
                success: false,
                error: 'orderType must be "market" or "limit"',
                timestamp: Date.now(),
            });
            return;
        }
        if (orderType === 'limit' && (price == null || price <= 0)) {
            res.status(400).json({
                success: false,
                error: 'price is required for limit orders',
                timestamp: Date.now(),
            });
            return;
        }
        if (size <= 0) {
            res.status(400).json({
                success: false,
                error: 'size must be positive',
                timestamp: Date.now(),
            });
            return;
        }
        // Validate agent is in an active challenge
        const entry = (0, challengeService_1.getEntry)(entryId);
        if (!entry) {
            res.status(404).json({
                success: false,
                error: 'Challenge entry not found',
                timestamp: Date.now(),
            });
            return;
        }
        if (entry.agentId !== agentId) {
            res.status(403).json({
                success: false,
                error: 'Agent does not own this challenge entry',
                timestamp: Date.now(),
            });
            return;
        }
        if (entry.status !== 'active') {
            res.status(400).json({
                success: false,
                error: `Challenge entry is ${entry.status}, not active`,
                timestamp: Date.now(),
            });
            return;
        }
        // Place order via Drift
        const txSignature = await (0, driftService_1.placePerpOrder)({
            subAccountId: entry.subAccountId,
            marketIndex: SOL_PERP_MARKET_INDEX,
            side,
            size,
            orderType,
            price,
        });
        res.status(201).json({
            success: true,
            data: {
                txSignature,
                marketIndex: SOL_PERP_MARKET_INDEX,
                side,
                size,
                orderType,
                price,
                timestamp: Date.now(),
            },
            timestamp: Date.now(),
        });
    }
    catch (err) {
        console.error('Order placement failed:', err.message);
        res.status(500).json({
            success: false,
            error: `Order failed: ${err.message}`,
            timestamp: Date.now(),
        });
    }
});
/**
 * GET /trading/positions/:entryId — current positions
 */
router.get('/positions/:entryId', (req, res) => {
    try {
        const entry = (0, challengeService_1.getEntry)(req.params.entryId);
        if (!entry) {
            res.status(404).json({
                success: false,
                error: 'Entry not found',
                timestamp: Date.now(),
            });
            return;
        }
        const positions = (0, driftService_1.getPositions)(entry.subAccountId);
        res.json({
            success: true,
            data: { entryId: entry.id, positions },
            timestamp: Date.now(),
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: `Failed to read positions: ${err.message}`,
            timestamp: Date.now(),
        });
    }
});
/**
 * GET /trading/history/:entryId — trade/order history
 */
router.get('/history/:entryId', (req, res) => {
    try {
        const entry = (0, challengeService_1.getEntry)(req.params.entryId);
        if (!entry) {
            res.status(404).json({
                success: false,
                error: 'Entry not found',
                timestamp: Date.now(),
            });
            return;
        }
        const history = (0, driftService_1.getOrderHistory)(entry.subAccountId);
        res.json({
            success: true,
            data: { entryId: entry.id, orders: history },
            timestamp: Date.now(),
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: `Failed to read history: ${err.message}`,
            timestamp: Date.now(),
        });
    }
});
/**
 * POST /trading/close/:entryId — close all positions
 */
router.post('/close/:entryId', async (req, res) => {
    try {
        const entry = (0, challengeService_1.getEntry)(req.params.entryId);
        if (!entry) {
            res.status(404).json({
                success: false,
                error: 'Entry not found',
                timestamp: Date.now(),
            });
            return;
        }
        if (entry.status !== 'active') {
            res.status(400).json({
                success: false,
                error: `Entry is ${entry.status}, cannot close positions`,
                timestamp: Date.now(),
            });
            return;
        }
        const txSigs = await (0, driftService_1.closeAllPositions)(entry.subAccountId);
        res.json({
            success: true,
            data: { entryId: entry.id, closedTransactions: txSigs },
            timestamp: Date.now(),
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            error: `Failed to close positions: ${err.message}`,
            timestamp: Date.now(),
        });
    }
});
exports.default = router;
//# sourceMappingURL=trading.js.map