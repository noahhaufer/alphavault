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
 * Vault Service — 90/10 profit split, bi-weekly payouts, scale-up logic
 */
const web3_js_1 = require("@solana/web3.js");
const driftService_1 = require("./driftService");
const vaults = new Map();
let vaultSubAccountCounter = 1000;
const DEFAULT_AGENT_PROFIT_SHARE_BPS = 9000;
exports.PAYOUT_INTERVAL_MS = 14 * 24 * 3600000;
exports.SCALE_UP_PERCENT = 25;
exports.SCALE_UP_REQUIRED_MONTHS = 2;
exports.SCALE_UP_MIN_PROFIT_PERCENT = 10;
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
    console.log(`🏦 Vault created: ${config.name} — split: 90/10`);
    return vault;
}
function getVault(pubkey) { return vaults.get(pubkey); }
function getAllVaults() { return Array.from(vaults.values()); }
function getVaultsForAgent(delegate) {
    return Array.from(vaults.values()).filter((v) => v.delegateAuthority === delegate);
}
function refreshVaultMetrics(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return null;
    try {
        vault.currentEquity = (0, driftService_1.getAccountMetrics)(vault.subAccountId).equity;
    }
    catch { }
    return vault;
}
function calculateProfitSplit(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return null;
    refreshVaultMetrics(pubkey);
    const totalProfit = vault.currentEquity - vault.totalDeposits;
    if (totalProfit <= 0)
        return { totalProfit, agentProfit: 0, protocolProfit: 0 };
    const agentShare = vault.agentProfitShareBps / 10000;
    return { totalProfit, agentProfit: totalProfit * agentShare, protocolProfit: totalProfit * (1 - agentShare) };
}
function checkScaleUp(currentAllocation, consecutiveProfitableMonths, consecutiveProfit) {
    if (consecutiveProfitableMonths >= exports.SCALE_UP_REQUIRED_MONTHS && consecutiveProfit >= exports.SCALE_UP_MIN_PROFIT_PERCENT) {
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
    catch { }
    return { vault, positions, profitSplit: calculateProfitSplit(pubkey) };
}
//# sourceMappingURL=vaultService.js.map