"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyForFunding = applyForFunding;
exports.getFundedStatus = getFundedStatus;
exports.activateFundedAccount = activateFundedAccount;
exports.getAllFundedAccounts = getAllFundedAccounts;
exports.getFundedAccountById = getFundedAccountById;
exports.withdrawProfits = withdrawProfits;
exports.getPerformance = getPerformance;
/**
 * Funded Account Service — manages post-challenge funded allocations
 */
const uuid_1 = require("uuid");
const challengeService_1 = require("./challengeService");
const solana_1 = require("../utils/solana");
const fundedAccounts = new Map();
/** Allocation tiers based on challenge capital */
const ALLOCATION_MULTIPLIER = 5; // 5x the challenge capital
function applyForFunding(agentId, agentName) {
    // Check if agent passed any challenge
    const entries = (0, challengeService_1.getEntriesByAgent)(agentId);
    const passed = entries.find((e) => e.status === 'passed');
    if (!passed) {
        return { error: 'Agent has not passed any challenge yet' };
    }
    // Check if already has funded account
    for (const fa of fundedAccounts.values()) {
        if (fa.agentId === agentId && (fa.status === 'active' || fa.status === 'pending')) {
            return fa;
        }
    }
    const account = {
        id: (0, uuid_1.v4)(),
        agentId,
        agentName,
        challengeEntryId: passed.id,
        allocation: 10000 * ALLOCATION_MULTIPLIER, // Based on starter challenge
        status: 'pending',
        appliedAt: Date.now(),
    };
    fundedAccounts.set(account.id, account);
    console.log(`💰 Funded account application: ${agentName} (${agentId}) — $${account.allocation}`);
    return account;
}
function getFundedStatus(agentId) {
    for (const fa of fundedAccounts.values()) {
        if (fa.agentId === agentId)
            return fa;
    }
    return undefined;
}
async function activateFundedAccount(accountId) {
    const account = fundedAccounts.get(accountId);
    if (!account || account.status !== 'pending')
        return null;
    account.status = 'active';
    account.activatedAt = Date.now();
    try {
        const keypair = (0, solana_1.getServiceKeypair)();
        account.proofTx = await (0, solana_1.storeProofOnChain)(keypair, {
            type: 'funded_status',
            agentId: account.agentId,
            pnlPercent: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            passed: true,
            timestamp: Date.now(),
        });
    }
    catch { }
    return account;
}
function getAllFundedAccounts() {
    return Array.from(fundedAccounts.values());
}
function getFundedAccountById(accountId) {
    return fundedAccounts.get(accountId);
}
/** Default protocol fee: 20% (2000 bps) */
const DEFAULT_PROTOCOL_FEE_BPS = 2000;
/**
 * Simulate current equity for a funded account.
 * In production this would query Drift on-chain data.
 */
function refreshEquity(account) {
    if (account.currentEquity === undefined) {
        // Simulate some profit: allocation + random 0-15%
        account.currentEquity = account.allocation * (1 + Math.random() * 0.15);
    }
    return account.currentEquity;
}
/**
 * Withdraw profits from a funded account.
 * Agent can only withdraw profits (equity - allocation), not principal.
 * Protocol takes a configurable fee (default 20%).
 */
function withdrawProfits(accountId) {
    const account = fundedAccounts.get(accountId);
    if (!account)
        return { error: 'Funded account not found' };
    if (account.status !== 'active')
        return { error: 'Account is not active' };
    const equity = refreshEquity(account);
    const feeBps = account.protocolFeeBps ?? DEFAULT_PROTOCOL_FEE_BPS;
    const profit = equity - account.allocation;
    if (profit <= 0) {
        return { error: `No profit to withdraw. Equity: $${equity.toFixed(2)}, Allocation: $${account.allocation}` };
    }
    const protocolFee = profit * (feeBps / 10000);
    const agentPayout = profit - protocolFee;
    // Simulate withdrawal: reset equity to allocation
    account.currentEquity = account.allocation;
    account.totalWithdrawn = (account.totalWithdrawn ?? 0) + agentPayout;
    // Simulated tx signature
    const txSignature = `sim_withdraw_${accountId.slice(0, 8)}_${Date.now().toString(36)}`;
    console.log(`💸 Profit withdrawal: ${account.agentName} — profit=$${profit.toFixed(2)}, agent=$${agentPayout.toFixed(2)}, fee=$${protocolFee.toFixed(2)}`);
    return {
        txSignature,
        initialAllocation: account.allocation,
        currentEquity: equity,
        totalProfit: profit,
        protocolFee,
        agentPayout,
        feeRateBps: feeBps,
    };
}
/**
 * Get performance summary for a funded account.
 */
function getPerformance(accountId) {
    const account = fundedAccounts.get(accountId);
    if (!account)
        return { error: 'Funded account not found' };
    const equity = refreshEquity(account);
    const feeBps = account.protocolFeeBps ?? DEFAULT_PROTOCOL_FEE_BPS;
    const feeRate = feeBps / 10000;
    const totalProfit = equity - account.allocation;
    const availableToWithdraw = totalProfit > 0 ? totalProfit * (1 - feeRate) : 0;
    return {
        initialAllocation: account.allocation,
        currentEquity: equity,
        totalProfit,
        availableToWithdraw,
        protocolFeeRate: feeRate,
        agentShareRate: 1 - feeRate,
        totalWithdrawn: account.totalWithdrawn ?? 0,
    };
}
//# sourceMappingURL=fundedService.js.map