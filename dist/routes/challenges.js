"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Challenge API Routes
 */
const express_1 = require("express");
const web3_js_1 = require("@solana/web3.js");
const challengeService_1 = require("../services/challengeService");
const router = (0, express_1.Router)();
router.get('/', (_req, res) => {
    res.json({ success: true, data: (0, challengeService_1.getAllChallenges)(), timestamp: Date.now() });
});
router.get('/:id', (req, res) => {
    const challenge = (0, challengeService_1.getChallenge)(req.params.id);
    if (!challenge) {
        res.status(404).json({ success: false, error: 'Challenge not found', timestamp: Date.now() });
        return;
    }
    res.json({ success: true, data: challenge, timestamp: Date.now() });
});
router.post('/:id/enter', (req, res) => {
    const { agentId, agentName } = req.body;
    if (!agentId || !agentName) {
        res.status(400).json({ success: false, error: 'agentId and agentName are required', timestamp: Date.now() });
        return;
    }
    const challenge = (0, challengeService_1.getChallenge)(req.params.id);
    if (!challenge) {
        res.status(404).json({ success: false, error: 'Challenge not found', timestamp: Date.now() });
        return;
    }
    const agentKeypair = web3_js_1.Keypair.generate();
    const entry = (0, challengeService_1.enterChallenge)(req.params.id, agentId, agentName, agentKeypair.publicKey.toBase58());
    if (!entry) {
        res.status(400).json({ success: false, error: 'Cannot enter this challenge (Phase 2 requires passing Phase 1 first)', timestamp: Date.now() });
        return;
    }
    res.status(201).json({
        success: true,
        data: {
            entry,
            driftConfig: { subAccountId: entry.subAccountId, authority: entry.authority, market: challenge.market, startingCapital: challenge.startingCapital, network: 'devnet' },
        },
        timestamp: Date.now(),
    });
});
router.get('/:id/status/:agentId', (req, res) => {
    const entries = (0, challengeService_1.getEntriesByAgent)(req.params.agentId);
    const entry = entries.find((e) => e.challengeId === req.params.id);
    if (!entry) {
        res.status(404).json({ success: false, error: 'Agent not found in this challenge', timestamp: Date.now() });
        return;
    }
    res.json({ success: true, data: entry, timestamp: Date.now() });
});
router.get('/:id/leaderboard', (req, res) => {
    const challenge = (0, challengeService_1.getChallenge)(req.params.id);
    if (!challenge) {
        res.status(404).json({ success: false, error: 'Challenge not found', timestamp: Date.now() });
        return;
    }
    res.json({ success: true, data: { challenge: challenge.name, leaderboard: (0, challengeService_1.getLeaderboard)(req.params.id) }, timestamp: Date.now() });
});
exports.default = router;
//# sourceMappingURL=challenges.js.map