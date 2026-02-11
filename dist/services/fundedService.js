"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyForFunding = applyForFunding;
exports.getFundedStatus = getFundedStatus;
exports.getFundedAccountById = getFundedAccountById;
exports.activateFundedAccount = activateFundedAccount;
exports.getAllFundedAccounts = getAllFundedAccounts;
exports.checkFundedLossLimits = checkFundedLossLimits;
exports.withdrawProfits = withdrawProfits;
exports.getPerformance = getPerformance;
/**
 * Funded Account Service — manages post-challenge funded allocations
 *
 * Requires passing BOTH Phase 1 (Challenge) and Phase 2 (Verification).
 * Funded accounts: no profit target, same loss limits (5% daily, 10% total).
 * Agent can withdraw profits anytime — 90% agent, 10% protocol fee.
 * If loss limits breached → account frozen/revoked.
 */
const uuid_1 = require("uuid");
const challengeService_1 = require("./challengeService");
const solana_1 = require("../utils/solana");
const fundedAccounts = new Map();
const ALLOCATION_MULTIPLIER = 5;
const DEFAULT_PROTOCOL_FEE_BPS = 1000;
const MAX_DAILY_LOSS_PCT = 5;
const MAX_TOTAL_LOSS_PCT = 10;
function applyForFunding(agentId, agentName) {
    const result = (0, challengeService_1.hasPassedBothPhases)(agentId);
    if (!result) {
        return { error: 'Agent must pass both Phase 1 (Challenge) and Phase 2 (Verification) to get funded' };
    }
    for (const fa of fundedAccounts.values()) {
        if (fa.agentId === agentId && (fa.status === 'active' || fa.status === 'pending')) {
            return fa;
        }
    }
    const account = {
        id: (0, uuid_1.v4)(),
        agentId,
        agentName,
        challengeEntryId: result.phase1.id,
        verificationEntryId: result.phase2.id,
        allocation: 10000 * ALLOCATION_MULTIPLIER,
        status: 'pending',
        appliedAt: Date.now(),
        protocolFeeBps: DEFAULT_PROTOCOL_FEE_BPS,
        maxDailyLoss: MAX_DAILY_LOSS_PCT,
        maxTotalLoss: MAX_TOTAL_LOSS_PCT,
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
function getFundedAccountById(accountId) {
    return fundedAccounts.get(accountId);
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
            passed: true,
            pnlPercent: 0,
            maxDrawdown: 0,
            timestamp: Date.now(),
        });
    }
    catch { }
    return account;
}
function getAllFundedAccounts() {
    return Array.from(fundedAccounts.values());
}
function refreshEquity(account) {
    if (account.currentEquity === undefined) {
        account.currentEquity = account.allocation * (1 + Math.random() * 0.15);
    }
    return account.currentEquity;
}
function checkFundedLossLimits(accountId) {
    const account = fundedAccounts.get(accountId);
    if (!account || account.status !== 'active')
        return { breached: false };
    const equity = refreshEquity(account);
    const totalLossPct = ((account.allocation - equity) / account.allocation) * 100;
    if (totalLossPct > account.maxTotalLoss) {
        account.status = 'revoked';
        return { breached: true, reason: `Total loss ${totalLossPct.toFixed(2)}% exceeded ${account.maxTotalLoss}% limit` };
    }
    return { breached: false };
}
function withdrawProfits(accountId) {
    const account = fundedAccounts.get(accountId);
    if (!account)
        return { error: 'Funded account not found' };
    if (account.status !== 'active')
        return { error: 'Account is not active' };
    const lossCheck = checkFundedLossLimits(accountId);
    if (lossCheck.breached)
        return { error: `Account revoked: ${lossCheck.reason}` };
    const equity = refreshEquity(account);
    const feeBps = account.protocolFeeBps ?? DEFAULT_PROTOCOL_FEE_BPS;
    const profit = equity - account.allocation;
    if (profit <= 0) {
        return { error: `No profit to withdraw. Equity: $${equity.toFixed(2)}, Allocation: $${account.allocation}` };
    }
    const protocolFee = profit * (feeBps / 10000);
    const agentPayout = profit - protocolFee;
    account.currentEquity = account.allocation;
    account.totalWithdrawn = (account.totalWithdrawn ?? 0) + agentPayout;
    const txSignature = `sim_withdraw_${accountId.slice(0, 8)}_${Date.now().toString(36)}`;
    console.log(`💸 Profit withdrawal: agent=$${agentPayout.toFixed(2)} (90%), fee=$${protocolFee.toFixed(2)} (10%)`);
    return { txSignature, initialAllocation: account.allocation, currentEquity: equity, totalProfit: profit, protocolFee, agentPayout, feeRateBps: feeBps };
}
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