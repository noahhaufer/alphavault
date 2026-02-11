/**
 * Solana utility functions — memo program for on-chain proofs
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
export declare function getConnection(): Connection;
/** Load or generate a keypair for the service */
export declare function getServiceKeypair(): Keypair;
/** Hash arbitrary data for on-chain proof */
export declare function hashData(data: Record<string, any>): string;
/**
 * Store a performance proof on-chain via memo program
 * Returns the transaction signature
 */
export declare function storeProofOnChain(payer: Keypair, proof: {
    type: 'challenge_result' | 'funded_status';
    agentId: string;
    challengeId?: string;
    pnlPercent: number;
    maxDrawdown: number;
    sharpeRatio: number;
    passed: boolean;
    timestamp: number;
}): Promise<string>;
/**
 * Request devnet airdrop for a keypair
 */
export declare function requestAirdrop(pubkey: PublicKey, sol?: number): Promise<string>;
//# sourceMappingURL=solana.d.ts.map