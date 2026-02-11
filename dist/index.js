"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * AlphaVault — On-Chain Prop Firm for AI Trading Agents
 *
 * Main entry point: Express API server + Drift SDK + evaluation engine
 */
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const challengeService_1 = require("./services/challengeService");
const evaluationEngine_1 = require("./services/evaluationEngine");
const driftService_1 = require("./services/driftService");
const challenges_1 = __importDefault(require("./routes/challenges"));
const funded_1 = __importDefault(require("./routes/funded"));
const trading_1 = __importDefault(require("./routes/trading"));
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3000', 10);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.use('/challenges', challenges_1.default);
app.use('/funded', funded_1.default);
app.use('/trading', trading_1.default);
// Startup
async function start() {
    // Seed challenges
    (0, challengeService_1.seedChallenges)();
    // Initialize Drift SDK
    try {
        await (0, driftService_1.initializeDrift)();
        console.log('✅ Drift SDK connected to devnet');
    }
    catch (err) {
        console.warn(`⚠️  Drift SDK init failed (trading will use simulation fallback): ${err.message}`);
    }
    app.listen(PORT, () => {
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
        (0, evaluationEngine_1.startEvaluationLoop)(5000);
    });
}
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await (0, driftService_1.shutdownDrift)();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    await (0, driftService_1.shutdownDrift)();
    process.exit(0);
});
start().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map