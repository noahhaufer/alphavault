/**
 * Deposit more SOL into Drift subaccount 0 as collateral
 */
import dotenv from 'dotenv';
dotenv.config();

import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { DriftClient } from '@drift-labs/sdk';
import bs58 from 'bs58';

const DRIFT_ENV = 'devnet';
const RPC = 'https://api.devnet.solana.com';
const PRIVATE_KEY = process.env.SERVICE_PRIVATE_KEY!;
const AMOUNT_SOL = parseFloat(process.argv[2] || '7');

async function main() {
  const connection = new Connection(RPC, 'confirmed');
  const keypair = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  const wallet = new Wallet(keypair);
  
  console.log(`Wallet: ${keypair.publicKey.toBase58()}`);
  
  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  console.log(`SOL balance: ${(balance / 1e9).toFixed(4)} SOL`);
  
  if (balance / 1e9 < AMOUNT_SOL + 0.1) {
    console.error(`❌ Insufficient balance. Need ${AMOUNT_SOL + 0.1} SOL (incl. fees)`);
    process.exit(1);
  }
  
  const client = new DriftClient({
    connection,
    wallet,
    env: DRIFT_ENV as any,
  });
  
  await client.subscribe();
  
  console.log(`\n📥 Depositing ${AMOUNT_SOL} SOL to Drift subaccount 0...`);
  
  // Deposit to subaccount 0 (marketIndex 1 = SOL spot)
  const amount = client.convertToSpotPrecision(AMOUNT_SOL);
  const tx = await client.deposit(amount, 1, keypair.publicKey);
  
  console.log(`✅ Deposited ${AMOUNT_SOL} SOL`);
  console.log(`   TX: ${tx}`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  const user = client.getUser();
  const equity = user.getTotalCollateral().toNumber() / 1e6;
  const spotValue = user.getSpotMarketAssetValue().toNumber() / 1e6;
  
  console.log(`\n💰 New Drift Account:`);
  console.log(`   Equity: $${equity.toFixed(2)}`);
  console.log(`   Spot value: $${spotValue.toFixed(2)}`);
  
  await client.unsubscribe();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
