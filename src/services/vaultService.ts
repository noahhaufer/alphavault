/**
 * Vault Service — 90/10 profit split, bi-weekly payouts, scale-up logic
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

const vaults: Map<string, VaultInfo & { subAccountId: number }> = new Map();
let vaultSubAccountCounter = 1000;

const DEFAULT_AGENT_PROFIT_SHARE_BPS = 9000;

export const PAYOUT_INTERVAL_MS = 14 * 24 * 3600_000;
export const SCALE_UP_PERCENT = 25;
export const SCALE_UP_REQUIRED_MONTHS = 2;
export const SCALE_UP_MIN_PROFIT_PERCENT = 10;

export async function createVault(config: VaultConfig): Promise<VaultInfo> {
  const subAccountId = ++vaultSubAccountCounter;
  const { pubkey } = await createSubAccount(subAccountId, `vault-${config.name}`);
  await delegateSubAccount(subAccountId, new PublicKey(config.delegateAuthority));

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
  console.log(`🏦 Vault created: ${config.name} — split: 90/10`);
  return vault;
}

export function getVault(pubkey: string): VaultInfo | undefined { return vaults.get(pubkey); }
export function getAllVaults(): VaultInfo[] { return Array.from(vaults.values()); }
export function getVaultsForAgent(delegate: string): VaultInfo[] {
  return Array.from(vaults.values()).filter((v) => v.delegateAuthority === delegate);
}

export function refreshVaultMetrics(pubkey: string): VaultInfo | null {
  const vault = vaults.get(pubkey);
  if (!vault) return null;
  try { vault.currentEquity = getAccountMetrics(vault.subAccountId).equity; } catch {}
  return vault;
}

export function calculateProfitSplit(pubkey: string): { totalProfit: number; agentProfit: number; protocolProfit: number } | null {
  const vault = vaults.get(pubkey);
  if (!vault) return null;
  refreshVaultMetrics(pubkey);
  const totalProfit = vault.currentEquity - vault.totalDeposits;
  if (totalProfit <= 0) return { totalProfit, agentProfit: 0, protocolProfit: 0 };
  const agentShare = vault.agentProfitShareBps / 10000;
  return { totalProfit, agentProfit: totalProfit * agentShare, protocolProfit: totalProfit * (1 - agentShare) };
}

export function checkScaleUp(currentAllocation: number, consecutiveProfitableMonths: number, consecutiveProfit: number): number | null {
  if (consecutiveProfitableMonths >= SCALE_UP_REQUIRED_MONTHS && consecutiveProfit >= SCALE_UP_MIN_PROFIT_PERCENT) {
    return Math.round(currentAllocation * (1 + SCALE_UP_PERCENT / 100));
  }
  return null;
}

export async function freezeVault(pubkey: string): Promise<boolean> {
  const vault = vaults.get(pubkey);
  if (!vault) return false;
  try {
    await delegateSubAccount(vault.subAccountId, PublicKey.default);
    vault.status = 'frozen';
    console.log(`🔒 Vault frozen: ${pubkey}`);
    return true;
  } catch (err: any) {
    console.error(`Failed to freeze vault ${pubkey}: ${err.message}`);
    return false;
  }
}

export function getVaultPerformance(pubkey: string) {
  const vault = vaults.get(pubkey);
  if (!vault) return null;
  let positions: ReturnType<typeof getPositions> = [];
  try { positions = getPositions(vault.subAccountId); } catch {}
  return { vault, positions, profitSplit: calculateProfitSplit(pubkey) };
}
