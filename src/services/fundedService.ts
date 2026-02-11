/**
 * Funded Account Service — manages post-challenge funded allocations
 */
import { v4 as uuid } from 'uuid';
import { FundedAccount } from '../types';
import { getEntriesByAgent } from './challengeService';
import { storeProofOnChain, getServiceKeypair } from '../utils/solana';

const fundedAccounts: Map<string, FundedAccount> = new Map();

/** Allocation tiers based on challenge capital */
const ALLOCATION_MULTIPLIER = 5; // 5x the challenge capital

export function applyForFunding(
  agentId: string,
  agentName: string
): FundedAccount | { error: string } {
  // Check if agent passed any challenge
  const entries = getEntriesByAgent(agentId);
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

  const account: FundedAccount = {
    id: uuid(),
    agentId,
    agentName,
    challengeEntryId: passed.id,
    allocation: 10_000 * ALLOCATION_MULTIPLIER, // Based on starter challenge
    status: 'pending',
    appliedAt: Date.now(),
  };

  fundedAccounts.set(account.id, account);
  console.log(`💰 Funded account application: ${agentName} (${agentId}) — $${account.allocation}`);
  return account;
}

export function getFundedStatus(agentId: string): FundedAccount | undefined {
  for (const fa of fundedAccounts.values()) {
    if (fa.agentId === agentId) return fa;
  }
  return undefined;
}

export async function activateFundedAccount(accountId: string): Promise<FundedAccount | null> {
  const account = fundedAccounts.get(accountId);
  if (!account || account.status !== 'pending') return null;

  account.status = 'active';
  account.activatedAt = Date.now();

  try {
    const keypair = getServiceKeypair();
    account.proofTx = await storeProofOnChain(keypair, {
      type: 'funded_status',
      agentId: account.agentId,
      pnlPercent: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      passed: true,
      timestamp: Date.now(),
    });
  } catch {}

  return account;
}

export function getAllFundedAccounts(): FundedAccount[] {
  return Array.from(fundedAccounts.values());
}
