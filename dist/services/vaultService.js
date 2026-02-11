"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVault = createVault;
exports.getVault = getVault;
exports.getAllVaults = getAllVaults;
exports.getVaultsForAgent = getVaultsForAgent;
exports.refreshVaultMetrics = refreshVaultMetrics;
exports.calculateProfitSplit = calculateProfitSplit;
exports.freezeVault = freezeVault;
exports.getVaultPerformance = getVaultPerformance;
/**
 * Vault Service — Drift vault management for funded accounts
 *
 * In production, this would use @drift-labs/vaults-sdk for on-chain vault creation.
 * For now, we manage vaults as Drift subaccounts with delegated trading authority
 * and track profit splits off-chain.
 */
const web3_js_1 = require("@solana/web3.js");
const driftService_1 = require("./driftService");
/** In-memory vault store */
const vaults = new Map();
/** Subaccount counter for vaults (start at 1000 to avoid collision with challenge entries) */
let vaultSubAccountCounter = 1000;
/** Default profit split: 80% agent, 20% vault (LPs) */
const DEFAULT_AGENT_PROFIT_SHARE_BPS = 8000;
/**
 * Create a Drift vault (subaccount) for a funded agent
 */
async function createVault(config) {
    const subAccountId = ++vaultSubAccountCounter;
    // Create Drift subaccount for the vault
    const { pubkey } = await (0, driftService_1.createSubAccount)(subAccountId, `vault-${config.name}`);
    // Delegate trading to the agent
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
    console.log(`🏦 Vault created: ${config.name} — pubkey: ${pubkey}, delegate: ${config.delegateAuthority}`);
    return vault;
}
/**
 * Get vault info
 */
function getVault(pubkey) {
    return vaults.get(pubkey);
}
/**
 * Get all vaults
 */
function getAllVaults() {
    return Array.from(vaults.values());
}
/**
 * Get vaults delegated to a specific agent
 */
function getVaultsForAgent(delegateAuthority) {
    return Array.from(vaults.values()).filter((v) => v.delegateAuthority === delegateAuthority);
}
/**
 * Update vault equity from Drift on-chain data
 */
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
 * Calculate profit split for a vault
 * Returns { agentProfit, vaultProfit } in USDC
 */
function calculateProfitSplit(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return null;
    refreshVaultMetrics(pubkey);
    const totalProfit = vault.currentEquity - vault.totalDeposits;
    if (totalProfit <= 0) {
        return { totalProfit, agentProfit: 0, vaultProfit: 0 };
    }
    const agentShare = vault.agentProfitShareBps / 10000;
    return {
        totalProfit,
        agentProfit: totalProfit * agentShare,
        vaultProfit: totalProfit * (1 - agentShare),
    };
}
/**
 * Freeze a vault (disable trading)
 */
async function freezeVault(pubkey) {
    const vault = vaults.get(pubkey);
    if (!vault)
        return false;
    // Revoke delegation by setting delegate to system program (effectively disabling)
    try {
        await (0, driftService_1.delegateSubAccount)(vault.subAccountId, web3_js_1.PublicKey.default // SystemProgram = no delegate
        );
        vault.status = 'frozen';
        console.log(`🔒 Vault frozen: ${pubkey}`);
        return true;
    }
    catch (err) {
        console.error(`Failed to freeze vault ${pubkey}: ${err.message}`);
        return false;
    }
}
/**
 * Get vault performance summary
 */
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