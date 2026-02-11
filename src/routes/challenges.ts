/**
 * Challenge API Routes
 */
import { Router, Request, Response } from 'express';
import { Keypair } from '@solana/web3.js';
import {
  getAllChallenges,
  getChallenge,
  enterChallenge,
  getEntriesForChallenge,
  getEntriesByAgent,
  getLeaderboard,
} from '../services/challengeService';
import { ApiResponse } from '../types';

const router = Router();

/** GET /challenges — list all challenges */
router.get('/', (_req: Request, res: Response) => {
  const data = getAllChallenges();
  const resp: ApiResponse = { success: true, data, timestamp: Date.now() };
  res.json(resp);
});

/** GET /challenges/:id — get challenge details */
router.get('/:id', (req: Request, res: Response) => {
  const challenge = getChallenge(req.params.id);
  if (!challenge) {
    res.status(404).json({ success: false, error: 'Challenge not found', timestamp: Date.now() });
    return;
  }
  res.json({ success: true, data: challenge, timestamp: Date.now() });
});

/** POST /challenges/:id/enter — enter a challenge */
router.post('/:id/enter', (req: Request, res: Response) => {
  const { agentId, agentName } = req.body;

  if (!agentId || !agentName) {
    res.status(400).json({
      success: false,
      error: 'agentId and agentName are required',
      timestamp: Date.now(),
    });
    return;
  }

  const challenge = getChallenge(req.params.id);
  if (!challenge) {
    res.status(404).json({ success: false, error: 'Challenge not found', timestamp: Date.now() });
    return;
  }

  // Generate a keypair for the agent's subaccount
  const agentKeypair = Keypair.generate();

  const entry = enterChallenge(
    req.params.id,
    agentId,
    agentName,
    agentKeypair.publicKey.toBase58()
  );

  if (!entry) {
    res.status(400).json({
      success: false,
      error: 'Cannot enter this challenge',
      timestamp: Date.now(),
    });
    return;
  }

  res.status(201).json({
    success: true,
    data: {
      entry,
      driftConfig: {
        subAccountId: entry.subAccountId,
        authority: entry.authority,
        market: challenge.market,
        startingCapital: challenge.startingCapital,
        network: 'devnet',
      },
    },
    timestamp: Date.now(),
  });
});

/** GET /challenges/:id/status/:agentId — agent status in challenge */
router.get('/:id/status/:agentId', (req: Request, res: Response) => {
  const entries = getEntriesByAgent(req.params.agentId);
  const entry = entries.find((e) => e.challengeId === req.params.id);

  if (!entry) {
    res.status(404).json({
      success: false,
      error: 'Agent not found in this challenge',
      timestamp: Date.now(),
    });
    return;
  }

  res.json({ success: true, data: entry, timestamp: Date.now() });
});

/** GET /challenges/:id/leaderboard — rankings */
router.get('/:id/leaderboard', (req: Request, res: Response) => {
  const challenge = getChallenge(req.params.id);
  if (!challenge) {
    res.status(404).json({ success: false, error: 'Challenge not found', timestamp: Date.now() });
    return;
  }

  const leaderboard = getLeaderboard(req.params.id);
  res.json({
    success: true,
    data: { challenge: challenge.name, leaderboard },
    timestamp: Date.now(),
  });
});

export default router;
