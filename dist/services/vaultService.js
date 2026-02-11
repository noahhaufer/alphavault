"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCALE_UP_MIN_PROFIT_PERCENT = exports.SCALE_UP_REQUIRED_MONTHS = exports.SCALE_UP_PERCENT = exports.PAYOUT_INTERVAL_MS = void 0;
exports.createVault = createVault;
exports.getVault = getVault;
exports.getAllVaults = getAllVaults;
exports.getVaultsForAgent = getVaultsForAgent;
exports.refreshVaultMetrics = refreshVaultMetrics;
exports.calculateProfitSplit = calculateProfitSplit;
exports.checkScaleUp = checkScaleUp;
exports.freezeVault = freezeVault;
exports.getVaultPerformance = getVaultPerformance;
/**
 * Vault Service — Drift vault management for funded accounts
 *
 * 90/10 profit split (agent keeps 90%, protocol takes 10%).
 * Bi-weekly payout cycle. Scale-up logic for consecutive profitability.
 */
const web3_js_1 = require("@solana/web3.js");
const driftService_1 = require("./driftService");
/** In-memory vault store */
const vaults = new Map();
/** Subaccount counter for vaults (start at 1000 to avoid collision with challenge entries) */
let vaultSubAccountCounter = 1000;
/** 90/10 split: agent gets 90%, protocol gets 10% (1000 bps) */
const DEFAULT_AGENT_PROFIT_SHARE_BPS = 9000;
/** Bi-weekly payout interval in ms (14 days) */
exports.PAYOUT_INTERVAL_MS = 14 * 24 * 3600000;
/** Scale-up: 25% increase if profitable 2 consecutive months with 10%+ total profit */
exports.SCALE_UP_PERCENT = 25;
exports.SCALE_UP_REQUIRED_MONTHS = 2;
exports.SCALE_UP_MIN_PROFIT_PERCENT = 10;
/**
 * Create a Drift vault (subaccount) for a funded agent
 */
async function createVault(config) {
    const subAccountId = ++vaultSubAccountCounter;
    const { pubkey } = await (0, driftService_1.createSubAccount)(subAccountId, `vault-${config.name}`);
    await (0, driftService_1.delegateSubAccount)(subAccountId, new web3_js_1.PublicKey(config.delegateAuthority));
    const vault = {
        pubkey,
        name: config.name,
        delegateAuthority: config.delegateAuthority,
        totalDeposits: 0,
        currentEquity: 0,
        agentProfitShareBps: config.agentProfitShareBps || DEFAULT_AGENT_PROFIT_SHARE_BPS,
        status: 'active',
        createdAt: Date.now(),
        subAccountId,
    };
    vaults.set(pubkey, vault);
    console.log(`🏦 Vault created: ${config.name} — pubkey: ${pubkey}, delegate: ${config.delegateAuthority}, split: 90/10`);
    return vault;
}
function getVault(pubkey) {
    return vaults.get(pubkey);
}
function getAllVaults() {
    return Array.from(vaults.values());
}
function getVaultsForAgent(delegateAuthority) {
    return Array.from(vaults.values()).filter((v) => v.delegateAuthority === delegateAuthority);
}
function refreshVaultMetrics(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return null;
    try {
        const metrics = (0, driftService_1.getAccountMetrics)(vault.subAccountId);
        vault.currentEquity = metrics.equity;
        return vault;
    }
    catch (err) {
        console.warn(`Failed to refresh vault ${pubkey}: ${err.message}`);
        return vault;
    }
}
/**
 * Calculate profit split for a vault (90/10)
 */
function calculateProfitSplit(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return null;
    refreshVaultMetrics(pubkey);
    const totalProfit = vault.currentEquity - vault.totalDeposits;
    if (totalProfit <= 0) {
        return { totalProfit, agentProfit: 0, protocolProfit: 0 };
    }
    const agentShare = vault.agentProfitShareBps / 10000;
    return {
        totalProfit,
        agentProfit: totalProfit * agentShare,
        protocolProfit: totalProfit * (1 - agentShare),
    };
}
/**
 * Check if a funded account qualifies for scale-up.
 * Criteria: profitable 2 consecutive months with 10%+ total profit.
 * Returns the new allocation if eligible, or null.
 */
function checkScaleUp(currentAllocation, consecutiveProfitableMonths, consecutiveProfit) {
    if (consecutiveProfitableMonths >= exports.SCALE_UP_REQUIRED_MONTHS &&
        consecutiveProfit >= exports.SCALE_UP_MIN_PROFIT_PERCENT) {
        return Math.round(currentAllocation * (1 + exports.SCALE_UP_PERCENT / 100));
    }
    return null;
}
async function freezeVault(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return false;
    try {
        await (0, driftService_1.delegateSubAccount)(vault.subAccountId, web3_js_1.PublicKey.default);
        vault.status = 'frozen';
        console.log(`🔒 Vault frozen: ${pubkey}`);
        return true;
    }
    catch (err) {
        console.error(`Failed to freeze vault ${pubkey}: ${err.message}`);
        return false;
    }
}
function getVaultPerformance(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return null;
    let positions = [];
    try {
        positions = (0, driftService_1.getPositions)(vault.subAccountId);
    }
    catch {
        // Subaccount may not be active
    }
    const profitSplit = calculateProfitSplit(pubkey);
    return { vault, positions, profitSplit };
}
//# sourceMappingURL=vaultService.js.map