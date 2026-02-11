"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Funded Account API Routes
 */
const express_1 = require("express");
const fundedService_1 = require("../services/fundedService");
const router = (0, express_1.Router)();
router.post('/apply', (req, res) => {
    const { agentId, agentName } = req.body;
    if (!agentId || !agentName) {
        res.status(400).json({ success: false, error: 'agentId and agentName required', timestamp: Date.now() });
        return;
    }
    const result = (0, fundedService_1.applyForFunding)(agentId, agentName);
    if ('error' in result) {
        res.status(400).json({ success: false, error: result.error, timestamp: Date.now() });
        return;
    }
    res.status(201).json({ success: true, data: result, timestamp: Date.now() });
});
router.get('/:agentId/status', (req, res) => {
    const account = (0, fundedService_1.getFundedStatus)(req.params.agentId);
    if (!account) {
        res.status(404).json({ success: false, error: 'No funded account found', timestamp: Date.now() });
        return;
    }
    res.json({ success: true, data: account, timestamp: Date.now() });
});
router.get('/', (_req, res) => {
    res.json({ success: true, data: (0, fundedService_1.getAllFundedAccounts)(), timestamp: Date.now() });
});
router.post('/:accountId/withdraw-profits', (req, res) => {
    const result = (0, fundedService_1.withdrawProfits)(req.params.accountId);
    if ('error' in result) {
        res.status(400).json({ success: false, error: result.error, timestamp: Date.now() });
        return;
    }
    res.json({ success: true, data: result, timestamp: Date.now() });
});
router.get('/:accountId/performance', (req, res) => {
    const result = (0, fundedService_1.getPerformance)(req.params.accountId);
    if ('error' in result) {
        res.status(404).json({ success: false, error: result.error, timestamp: Date.now() });
        return;
    }
    res.json({ success: true, data: result, timestamp: Date.now() });
});
exports.default = router;
//# sourceMappingURL=funded.js.map