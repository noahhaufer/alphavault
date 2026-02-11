/**
 * Add more SOL collateral to Drift subaccount 0
 */
import dotenv from 'dotenv';
dotenv.config();

import { initializeDrift, depositCollateral, getDriftClient } from '../src/services/driftService';

const AMOUNT = parseFloat(process.argv[2] || '7');

async function main() {
  console.log(`\n🚀 Initializing Drift SDK...`);
  await initializeDrift();
  
  console.log(`\n📥 Depositing ${AMOUNT} SOL as collateral...`);
  const tx = await depositCollateral(AMOUNT, 0);
  console.log(`   ✅ TX: ${tx}`);
  
  await new Promise(r => setTimeout(r, 3000));
  
  const client = getDriftClient();
  const user = client.getUser();
  const equity = user.getTotalCollateral().toNumber() / 1e6;
  const spotValue = user.getSpotMarketAssetValue().toNumber() / 1e6;
  
  console.log(`\n💰 Updated Drift Account:`);
  console.log(`   Total collateral: $${equity.toFixed(2)}`);
  console.log(`   Spot value: $${spotValue.toFixed(2)}`);
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
