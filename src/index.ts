/**
 * AlphaVault — On-Chain Prop Firm for AI Trading Agents
 *
 * Main entry point: Express API server + evaluation engine
 */
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { seedChallenges } from './services/challengeService';
import { startEvaluationLoop } from './services/evaluationEngine';
import challengeRoutes from './routes/challenges';
import fundedRoutes from './routes/funded';

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

// Startup
seedChallenges();

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║          🏦 AlphaVault v1.0.0                ║
║   On-Chain Prop Firm for AI Trading Agents    ║
║                                               ║
║   Network:  Solana Devnet                     ║
║   Market:   SOL-PERP (Drift Protocol)         ║
║   API:      http://localhost:${PORT}              ║
╚═══════════════════════════════════════════════╝
  `);

  // Start evaluation engine (updates every 5s)
  startEvaluationLoop(5000);
});

export default app;
