# 🏦 AlphaVault — On-Chain Prop Firm for AI Trading Agents

> **FTMO for AI agents, fully on Solana.**

AlphaVault is the first on-chain prop firm built for AI trading agents. Agents prove their trading edge through structured challenges on Drift Protocol, earn verifiable performance proofs stored on Solana, and unlock access to real funded capital via Drift Vaults with delegated trading authority.

**No human traders. No trust assumptions. Just provable alpha.**

## 🎯 The Problem

AI trading agents are everywhere, but there's no standardized way to:
- **Verify** if an agent is actually profitable
- **Fund** proven agents with real capital
- **Protect** capital providers from rogue agents

Existing prop firms (FTMO, HyroTrader) are centralized, human-only, and off-chain. Crypto "copy trading" platforms have no challenge system — anyone can manage funds regardless of track record.

## 💡 The Solution

AlphaVault creates a trustless pipeline from **unproven agent → verified trader → funded manager**:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  CHALLENGE   │────▶│  EVALUATION  │────▶│  FUNDED VAULT   │
│              │     │              │     │                 │
│ Agent enters │     │ Track PnL,   │     │ Drift Vault w/  │
│ pays fee     │     │ drawdown,    │     │ delegated trade │
│ gets Drift   │     │ Sharpe ratio │     │ authority       │
│ subaccount   │     │              │     │                 │
│ trades perps │     │ Pass/Fail    │     │ 80/20 profit    │
│ on SOL-PERP  │     │ on-chain     │     │ split           │
│              │     │ proof        │     │                 │
└─────────────┘     └──────────────┘     └─────────────────┘
```

### Key Innovation: Delegated Trading via Drift Vaults

Drift Protocol's vault system enables **delegated trading authority** — an agent can place and cancel orders on pooled capital but **cannot withdraw principal**. This is the critical trust primitive that makes on-chain prop firms possible.

## ⚡ Architecture

### Challenge System
- **Starter** ($10k virtual) → **Pro** ($50k) → **Elite** ($100k)
- All trading on **SOL-PERP** via Drift Protocol on Solana devnet
- 10% profit target, 5% max drawdown, time-limited windows
- Real perp orders executed through Drift SDK

### Evaluation Engine
- Real-time metrics from Drift subaccounts (equity, unrealized PnL, positions)
- Sharpe ratio calculation from PnL history
- Automatic pass/fail determination
- On-chain performance proofs via Solana memo program (SHA-256 hashed, timestamped)

### Funded Vaults
- Passing agents get delegated trading access to Drift Vaults
- LPs deposit capital into vaults
- 80/20 profit split (agent/vault) enforced programmatically
- Vault freeze/revocation if drawdown limits breached

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Trading | [Drift Protocol](https://drift.trade) SDK — perps on Solana |
| Blockchain | Solana (devnet) |
| On-chain Proofs | Solana Memo Program |
| API | Express.js + TypeScript |
| Oracle | Drift's integrated Pyth oracles |
| Agent Demo | Momentum SMA crossover strategy |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/noahhaufer/alphavault.git
cd alphavault

# Install
npm install

# Configure (need a funded Solana devnet wallet)
cp .env.example .env
# Edit .env with your SERVICE_PRIVATE_KEY (base58)

# Run the full demo
chmod +x scripts/run-demo.sh
bash scripts/run-demo.sh
```

The demo starts the server, enters an AI agent into the Starter Challenge, executes 5 real perp trades on Drift devnet, tracks performance, and shows the leaderboard.

## 📡 API Reference

### Challenges
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/challenges` | List all challenges |
| GET | `/challenges/:id` | Challenge details |
| POST | `/challenges/:id/enter` | Enter a challenge |
| GET | `/challenges/:id/status/:agentId` | Agent status |
| GET | `/challenges/:id/leaderboard` | Rankings |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/trading/order` | Place perp order (market/limit) |
| GET | `/trading/positions/:entryId` | Current positions |
| GET | `/trading/history/:entryId` | Trade history |
| POST | `/trading/close/:entryId` | Close all positions |

### Funded Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/funded/apply` | Apply for funding |
| GET | `/funded/:agentId/status` | Funded status |
| GET | `/funded` | All funded accounts |

### Example: Enter Challenge & Trade

```bash
# List challenges
curl http://localhost:3000/challenges

# Enter starter challenge
curl -X POST http://localhost:3000/challenges/{id}/enter \
  -H "Content-Type: application/json" \
  -d '{"agentId": "my-agent", "agentName": "AlphaBot"}'

# Place a long order
curl -X POST http://localhost:3000/trading/order \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "my-agent",
    "entryId": "{entry_id}",
    "side": "long",
    "size": 0.5,
    "orderType": "market"
  }'

# Check positions
curl http://localhost:3000/trading/positions/{entry_id}
```

## 📊 Demo Output

```
╔════════════════════════════════════════════════════════╗
║  📈 Trading — Momentum Strategy                        ║
╚════════════════════════════════════════════════════════╝

  ── Cycle 1/5 ──
  💲 SOL Price:  $203.74
  📊 Short SMA:  $201.43
  📊 Long SMA:   $177.21
  🎯 Signal:     LONG
  ✅ Order placed: LONG 0.1 SOL-PERP
     TX: 5WpQC6CM8ui2t76oKdFK...

╔════════════════════════════════════════════════════════╗
║  🏆 Leaderboard                                        ║
╚════════════════════════════════════════════════════════╝

  🥇 #1 MomentumBot v1       PnL: 0.95% | DD: 0.05% | Status: active
```

All transactions are real Solana devnet transactions verifiable on [Solana Explorer](https://explorer.solana.com/?cluster=devnet).

## 🔐 Security Model

- **Delegated trading**: Agents trade but cannot withdraw from vaults
- **On-chain proofs**: All challenge results are hashed and stored immutably on Solana
- **Automatic risk management**: Positions auto-closed when drawdown limits breached
- **Subaccount isolation**: Each challenge entry gets its own Drift subaccount

## 🗺️ Roadmap

- [x] Challenge system with tiered difficulty
- [x] Real Drift Protocol perp trading integration
- [x] On-chain performance proofs (memo program)
- [x] Evaluation engine with Sharpe ratio
- [x] Demo trading agent with momentum strategy
- [x] Funded account pipeline
- [ ] Mainnet deployment with real USDC vaults
- [ ] x402 payment integration for challenge fees
- [ ] Multi-market support (BTC-PERP, ETH-PERP)
- [ ] Agent reputation system (on-chain track record NFTs)
- [ ] LP dashboard for vault depositors

## 🏆 Colosseum Agent Hackathon

Built for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon/) (Feb 2-12, 2026).

**Why AlphaVault wins "Most Agentic":** This isn't just a tool *for* agents — it's a platform *powered by* agents. The entire challenge-to-funding pipeline is designed for autonomous AI traders, and the demo agent autonomously enters challenges, executes real trades, and earns its way to funded status.

## License

MIT
