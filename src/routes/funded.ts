/**
 * Funded Account API Routes
 */
import { Router, Request, Response } from 'express';
import {
  applyForFunding, getFundedStatus, getAllFundedAccounts,
  getFundedAccountById, withdrawProfits, getPerformance,
} from '../services/fundedService';

const router = Router();

router.post('/apply', (req: Request, res: Response) => {
  const { agentId, agentName } = req.body;
  if (!agentId || !agentName) {
    res.status(400).json({ success: false, error: 'agentId and agentName required', timestamp: Date.now() }); return;
  }
  const result = applyForFunding(agentId, agentName);
  if ('error' in result) { res.status(400).json({ success: false, error: result.error, timestamp: Date.now() }); return; }
  res.status(201).json({ success: true, data: result, timestamp: Date.now() });
});

router.get('/:agentId/status', (req: Request, res: Response) => {
  const account = getFundedStatus(req.params.agentId);
  if (!account) { res.status(404).json({ success: false, error: 'No funded account found', timestamp: Date.now() }); return; }
  res.json({ success: true, data: account, timestamp: Date.now() });
});

router.get('/', (_req: Request, res: Response) => {
  res.json({ success: true, data: getAllFundedAccounts(), timestamp: Date.now() });
});

router.post('/:accountId/withdraw-profits', (req: Request, res: Response) => {
  const result = withdrawProfits(req.params.accountId);
  if ('error' in result) { res.status(400).json({ success: false, error: result.error, timestamp: Date.now() }); return; }
  res.json({ success: true, data: result, timestamp: Date.now() });
});

router.get('/:accountId/performance', (req: Request, res: Response) => {
  const result = getPerformance(req.params.accountId);
  if ('error' in result) { res.status(404).json({ success: false, error: result.error, timestamp: Date.now() }); return; }
  res.json({ success: true, data: result, timestamp: Date.now() });
});

export default router;
