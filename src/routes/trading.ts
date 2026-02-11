/**
 * Trading API Routes — agents place orders via Drift SDK
 */
import { Router, Request, Response } from 'express';
import {
  placePerpOrder,
  getPositions,
  getOrderHistory,
  closeAllPositions,
} from '../services/driftService';
import { getEntry } from '../services/challengeService';
import { ApiResponse, PlaceOrderRequest, resolveMarketIndex } from '../types';

const router = Router();

/**
 * POST /trading/order — place a perp order
 */
router.post('/order', async (req: Request, res: Response) => {
  try {
    const body = req.body as PlaceOrderRequest;
    const { agentId, entryId, side, size, orderType, price, market, leverage, stopLoss, takeProfit } = body;

    // Validate required fields
    if (!agentId || !entryId || !side || !size || !orderType) {
      res.status(400).json({
        success: false,
        error:
          'Required fields: agentId, entryId, side (long/short), size, orderType (market/limit)',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    if (!['long', 'short'].includes(side)) {
      res.status(400).json({
        success: false,
        error: 'side must be "long" or "short"',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    if (!['market', 'limit'].includes(orderType)) {
      res.status(400).json({
        success: false,
        error: 'orderType must be "market" or "limit"',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    if (orderType === 'limit' && (price == null || price <= 0)) {
      res.status(400).json({
        success: false,
        error: 'price is required for limit orders',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    if (size <= 0) {
      res.status(400).json({
        success: false,
        error: 'size must be positive',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    // Validate agent is in an active challenge
    const entry = getEntry(entryId);
    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Challenge entry not found',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    if (entry.agentId !== agentId) {
      res.status(403).json({
        success: false,
        error: 'Agent does not own this challenge entry',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    if (entry.status !== 'active') {
      res.status(400).json({
        success: false,
        error: `Challenge entry is ${entry.status}, not active`,
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    // Resolve market name to index
    let marketIndex: number;
    try {
      marketIndex = resolveMarketIndex(market);
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message,
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    // Validate leverage
    if (leverage != null && (leverage < 1 || leverage > 20)) {
      res.status(400).json({
        success: false,
        error: 'leverage must be between 1 and 20',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    // Place order via Drift
    const txSignature = await placePerpOrder({
      subAccountId: entry.subAccountId,
      marketIndex,
      side,
      size,
      orderType,
      price,
      leverage,
      stopLoss,
      takeProfit,
    });

    res.status(201).json({
      success: true,
      data: {
        txSignature,
        marketIndex,
        market: market || 'SOL-PERP',
        side,
        size,
        orderType,
        price,
        leverage,
        stopLoss,
        takeProfit,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    } as ApiResponse);
  } catch (err: any) {
    console.error('Order placement failed:', err.message);
    res.status(500).json({
      success: false,
      error: `Order failed: ${err.message}`,
      timestamp: Date.now(),
    } as ApiResponse);
  }
});

/**
 * GET /trading/positions/:entryId — current positions
 */
router.get('/positions/:entryId', (req: Request, res: Response) => {
  try {
    const entry = getEntry(req.params.entryId);
    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    const positions = getPositions(entry.subAccountId);
    res.json({
      success: true,
      data: { entryId: entry.id, positions },
      timestamp: Date.now(),
    } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to read positions: ${err.message}`,
      timestamp: Date.now(),
    } as ApiResponse);
  }
});

/**
 * GET /trading/history/:entryId — trade/order history
 */
router.get('/history/:entryId', (req: Request, res: Response) => {
  try {
    const entry = getEntry(req.params.entryId);
    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    const history = getOrderHistory(entry.subAccountId);
    res.json({
      success: true,
      data: { entryId: entry.id, orders: history },
      timestamp: Date.now(),
    } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to read history: ${err.message}`,
      timestamp: Date.now(),
    } as ApiResponse);
  }
});

/**
 * POST /trading/close/:entryId — close all positions
 */
router.post('/close/:entryId', async (req: Request, res: Response) => {
  try {
    const entry = getEntry(req.params.entryId);
    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Entry not found',
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    if (entry.status !== 'active') {
      res.status(400).json({
        success: false,
        error: `Entry is ${entry.status}, cannot close positions`,
        timestamp: Date.now(),
      } as ApiResponse);
      return;
    }

    const txSigs = await closeAllPositions(entry.subAccountId);
    res.json({
      success: true,
      data: { entryId: entry.id, closedTransactions: txSigs },
      timestamp: Date.now(),
    } as ApiResponse);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Failed to close positions: ${err.message}`,
      timestamp: Date.now(),
    } as ApiResponse);
  }
});

export default router;
