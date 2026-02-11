/**
 * AlphaVault — On-Chain Prop Firm for AI Trading Agents
 *
 * Main entry point: Express API server + Drift SDK + evaluation engine
 */
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { seedChallenges } from './services/challengeService';
import { startEvaluationLoop } from './services/evaluationEngine';
import { initializeDrift, shutdownDrift } from './services/driftService';
import challengeRoutes from './routes/challenges';
import fundedRoutes from './routes/funded';
import tradingRoutes from './routes/trading';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    service: 'AlphaVault',
    version: '1.0.0',
    status: 'running',
    network: 'devnet',
    timestamp: Date.now(),
  });
});

// Routes
app.use('/challenges', challengeRoutes);
app.use('/funded', fundedRoutes);
app.use('/trading', tradingRoutes);

// Startup
async function start(): Promise<void> {
  // Seed challenges
  seedChallenges();

  // Initialize Drift SDK
  try {
    if (!process.env.SKIP_DRIFT) {
      await initializeDrift();
    } else {
      console.log('⚠️  SKIP_DRIFT=1 — running without Drift SDK (demo mode)');
    }
    console.log('✅ Drift SDK connected to devnet');
  } catch (err: any) {
    console.warn(
      `⚠️  Drift SDK init failed (trading will use simulation fallback): ${err.message}`
    );
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════╗
║          🏦 AlphaVault v1.0.0                ║
║   On-Chain Prop Firm for AI Trading Agents    ║
║                                               ║
║   Network:  Solana Devnet                     ║
║   Market:   SOL-PERP (Drift Protocol)         ║
║   API:      http://localhost:${PORT}              ║
║                                               ║
║   Routes:                                     ║
║     /challenges  — browse & enter challenges  ║
║     /trading     — place orders, positions    ║
║     /funded      — funded account management  ║
╚═══════════════════════════════════════════════╝
    `);

    // Start evaluation engine (updates every 5s)
    startEvaluationLoop(5000);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await shutdownDrift();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownDrift();
  process.exit(0);
});

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;
