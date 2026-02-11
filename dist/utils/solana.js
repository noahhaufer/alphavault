"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnection = getConnection;
exports.getServiceKeypair = getServiceKeypair;
exports.hashData = hashData;
exports.storeProofOnChain = storeProofOnChain;
exports.requestAirdrop = requestAirdrop;
/**
 * Solana utility functions — memo program for on-chain proofs
 */
const web3_js_1 = require("@solana/web3.js");
const crypto_1 = __importDefault(require("crypto"));
const MEMO_PROGRAM_ID = new web3_js_1.PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
/** Devnet connection singleton */
let connection = null;
function getConnection() {
    if (!connection) {
        const rpc = process.env.SOLANA_RPC_URL || (0, web3_js_1.clusterApiUrl)('devnet');
        connection = new web3_js_1.Connection(rpc, 'confirmed');
    }
    return connection;
}
/** Load or generate a keypair for the service */
function getServiceKeypair() {
    if (process.env.SERVICE_PRIVATE_KEY) {
        const bs58 = require('bs58');
        return web3_js_1.Keypair.fromSecretKey(bs58.decode(process.env.SERVICE_PRIVATE_KEY));
    }
    // Generate ephemeral keypair for demo
    console.warn('⚠️  No SERVICE_PRIVATE_KEY set — using ephemeral keypair (demo mode)');
    return web3_js_1.Keypair.generate();
}
/** Hash arbitrary data for on-chain proof */
function hashData(data) {
    return crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(data, Object.keys(data).sort()))
        .digest('hex');
}
/**
 * Store a performance proof on-chain via memo program
 * Returns the transaction signature
 */
async function storeProofOnChain(payer, proof) {
    const conn = getConnection();
    const dataHash = hashData(proof);
    const memo = JSON.stringify({
        protocol: 'alphavault',
        version: '1.0',
        hash: dataHash,
        type: proof.type,
        agent: proof.agentId,
        result: proof.passed ? 'PASS' : 'FAIL',
        pnl: proof.pnlPercent.toFixed(2),
        dd: proof.maxDrawdown.toFixed(2),
        ts: proof.timestamp,
    });
    const instruction = new web3_js_1.TransactionInstruction({
        keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: true }],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo),
    });
    const tx = new web3_js_1.Transaction().add(instruction);
    try {
        const sig = await (0, web3_js_1.sendAndConfirmTransaction)(conn, tx, [payer], {
            commitment: 'confirmed',
        });
        console.log(`📝 On-chain proof stored: ${sig}`);
        return sig;
    }
    catch (err) {
        console.error('Failed to store proof on-chain:', err.message);
        // Return a placeholder for demo if wallet has no SOL
        return `demo_proof_${dataHash.slice(0, 16)}`;
    }
}
/**
 * Request devnet airdrop for a keypair
 */
async function requestAirdrop(pubkey, sol = 1) {
    const conn = getConnection();
    try {
        const sig = await conn.requestAirdrop(pubkey, sol * 1e9);
        await conn.confirmTransaction(sig, 'confirmed');
        console.log(`💰 Airdropped ${sol} SOL to ${pubkey.toBase58()}`);
        return sig;
    }
    catch (err) {
        console.error('Airdrop failed:', err.message);
        return '';
    }
}
//# sourceMappingURL=solana.js.map