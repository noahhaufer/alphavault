/**
 * Funded Account API Routes
 */
import { Router, Request, Response } from 'express';
import {
  applyForFunding,
  getFundedStatus,
  getAllFundedAccounts,
} from '../services/fundedService';

const router = Router();

/** POST /funded/apply — apply for funded account */
router.post('/apply', (req: Request, res: Response) => {
  const { agentId, agentName } = req.body;

  if (!agentId || !agentName) {
    res.status(400).json({
      success: false,
      error: 'agentId and agentName required',
      timestamp: Date.now(),
    });
    return;
  }

  const result = applyForFunding(agentId, agentName);

  if ('error' in result) {
    res.status(400).json({ success: false, error: result.error, timestamp: Date.now() });
    return;
  }

  res.status(201).json({ success: true, data: result, timestamp: Date.now() });
});

/** GET /funded/:agentId/status — funded account status */
router.get('/:agentId/status', (req: Request, res: Response) => {
  const account = getFundedStatus(req.params.agentId);

  if (!account) {
    res.status(404).json({
      success: false,
      error: 'No funded account found for this agent',
      timestamp: Date.now(),
    });
    return;
  }

  res.json({ success: true, data: account, timestamp: Date.now() });
});

/** GET /funded — list all funded accounts */
router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: getAllFundedAccounts(), timestamp: Date.now() });
});

export default router;
