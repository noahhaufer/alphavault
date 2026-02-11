/**
 * Solana utility functions — memo program for on-chain proofs
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  clusterApiUrl,
} from '@solana/web3.js';
import crypto from 'crypto';

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/** Devnet connection singleton */
let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    const rpc = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
    connection = new Connection(rpc, 'confirmed');
  }
  return connection;
}

/** Load or generate a keypair for the service */
export function getServiceKeypair(): Keypair {
  if (process.env.SERVICE_PRIVATE_KEY) {
    const bs58 = require('bs58');
    return Keypair.fromSecretKey(bs58.decode(process.env.SERVICE_PRIVATE_KEY));
  }
  // Generate ephemeral keypair for demo
  console.warn('⚠️  No SERVICE_PRIVATE_KEY set — using ephemeral keypair (demo mode)');
  return Keypair.generate();
}

/** Hash arbitrary data for on-chain proof */
export function hashData(data: Record<string, any>): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data, Object.keys(data).sort()))
    .digest('hex');
}

/**
 * Store a performance proof on-chain via memo program
 * Returns the transaction signature
 */
export async function storeProofOnChain(
  payer: Keypair,
  proof: Record<string, any> & {
    type: 'challenge_result' | 'funded_status';
    agentId: string;
    timestamp: number;
  }
): Promise<string> {
  const conn = getConnection();

  const dataHash = hashData(proof);
  const memo = JSON.stringify({
    protocol: 'alphavault',
    version: '1.0',
    hash: dataHash,
    type: proof.type,
    agent: proof.agentId,
    result: proof.passed ? 'PASS' : 'FAIL',
    pnl: (proof.pnlPercent ?? 0).toFixed(2),
    dd: (proof.maxDrawdown ?? 0).toFixed(2),
    ts: proof.timestamp,
  });

  const instruction = new TransactionInstruction({
    keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo),
  });

  const tx = new Transaction().add(instruction);

  try {
    const sig = await sendAndConfirmTransaction(conn, tx, [payer], {
      commitment: 'confirmed',
    });
    console.log(`📝 On-chain proof stored: ${sig}`);
    return sig;
  } catch (err: any) {
    console.error('Failed to store proof on-chain:', err.message);
    // Return a placeholder for demo if wallet has no SOL
    return `demo_proof_${dataHash.slice(0, 16)}`;
  }
}

/**
 * Request devnet airdrop for a keypair
 */
export async function requestAirdrop(pubkey: PublicKey, sol: number = 1): Promise<string> {
  const conn = getConnection();
  try {
    const sig = await conn.requestAirdrop(pubkey, sol * 1e9);
    await conn.confirmTransaction(sig, 'confirmed');
    console.log(`💰 Airdropped ${sol} SOL to ${pubkey.toBase58()}`);
    return sig;
  } catch (err: any) {
    console.error('Airdrop failed:', err.message);
    return '';
  }
}
