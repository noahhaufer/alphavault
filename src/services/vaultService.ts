/**
 * Vault Service — Drift vault management for funded accounts
 *
 * In production, this would use @drift-labs/vaults-sdk for on-chain vault creation.
 * For now, we manage vaults as Drift subaccounts with delegated trading authority
 * and track profit splits off-chain.
 */
import { PublicKey } from '@solana/web3.js';
import { v4 as uuid } from 'uuid';
import {
  getDriftClient,
  createSubAccount,
  delegateSubAccount,
  getAccountMetrics,
  getPositions,
} from './driftService';
import { VaultConfig, VaultInfo } from '../types';

/** In-memory vault store */
const vaults: Map<string, VaultInfo & { subAccountId: number }> = new Map();

/** Subaccount counter for vaults (start at 1000 to avoid collision with challenge entries) */
let vaultSubAccountCounter = 1000;

/** Default profit split: 80% agent, 20% vault (LPs) */
const DEFAULT_AGENT_PROFIT_SHARE_BPS = 8000;

/**
 * Create a Drift vault (subaccount) for a funded agent
 */
export async function createVault(
  config: VaultConfig
): Promise<VaultInfo> {
  const subAccountId = ++vaultSubAccountCounter;

  // Create Drift subaccount for the vault
  const { pubkey } = await createSubAccount(
    subAccountId,
    `vault-${config.name}`
  );

  // Delegate trading to the agent
  await delegateSubAccount(
    subAccountId,
    new PublicKey(config.delegateAuthority)
  );

  const vault: VaultInfo & { subAccountId: number } = {
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
  console.log(
    `🏦 Vault created: ${config.name} — pubkey: ${pubkey}, delegate: ${config.delegateAuthority}`
  );

  return vault;
}

/**
 * Get vault info
 */
export function getVault(pubkey: string): VaultInfo | undefined {
  return vaults.get(pubkey);
}

/**
 * Get all vaults
 */
export function getAllVaults(): VaultInfo[] {
  return Array.from(vaults.values());
}

/**
 * Get vaults delegated to a specific agent
 */
export function getVaultsForAgent(delegateAuthority: string): VaultInfo[] {
  return Array.from(vaults.values()).filter(
    (v) => v.delegateAuthority === delegateAuthority
  );
}

/**
 * Update vault equity from Drift on-chain data
 */
export function refreshVaultMetrics(pubkey: string): VaultInfo | null {
  const vault = vaults.get(pubkey);
  if (!vault) return null;

  try {
    const metrics = getAccountMetrics(vault.subAccountId);
    vault.currentEquity = metrics.equity;
    return vault;
  } catch (err: any) {
    console.warn(`Failed to refresh vault ${pubkey}: ${err.message}`);
    return vault;
  }
}

/**
 * Calculate profit split for a vault
 * Returns { agentProfit, vaultProfit } in USDC
 */
export function calculateProfitSplit(pubkey: string): {
  totalProfit: number;
  agentProfit: number;
  vaultProfit: number;
} | null {
  const vault = vaults.get(pubkey);
  if (!vault) return null;

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
export async function freezeVault(pubkey: string): Promise<boolean> {
  const vault = vaults.get(pubkey);
  if (!vault) return false;

  // Revoke delegation by setting delegate to system program (effectively disabling)
  try {
    await delegateSubAccount(
      vault.subAccountId,
      PublicKey.default // SystemProgram = no delegate
    );
    vault.status = 'frozen';
    console.log(`🔒 Vault frozen: ${pubkey}`);
    return true;
  } catch (err: any) {
    console.error(`Failed to freeze vault ${pubkey}: ${err.message}`);
    return false;
  }
}

/**
 * Get vault performance summary
 */
export function getVaultPerformance(pubkey: string): {
  vault: VaultInfo;
  positions: ReturnType<typeof getPositions>;
  profitSplit: ReturnType<typeof calculateProfitSplit>;
} | null {
  const vault = vaults.get(pubkey);
  if (!vault) return null;

  let positions: ReturnType<typeof getPositions> = [];
  try {
    positions = getPositions(vault.subAccountId);
  } catch {
    // Subaccount may not be active
  }

  const profitSplit = calculateProfitSplit(pubkey);

  return { vault, positions, profitSplit };
}
