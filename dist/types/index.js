"use strict";
/**
 * AlphaVault Type Definitions
 *
 * Two-phase challenge system (prop firm style):
 *   Phase 1 (Challenge): 8% profit target, 5% max daily loss, 10% max total loss, min 10 trading days, 30-day window
 *   Phase 2 (Verification): 5% profit target, same loss limits, min 10 trading days, 60-day window
 *   Agent must pass BOTH phases to get funded.
 *
 * Funded accounts: no profit target, same loss limits, 90/10 profit split (agent/protocol).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCOUNT_TIERS = void 0;
exports.ACCOUNT_TIERS = [
    { capital: 10000, fee: 89 },
    { capital: 25000, fee: 199 },
    { capital: 50000, fee: 299 },
    { capital: 100000, fee: 499 },
    { capital: 200000, fee: 899 },
];
//# sourceMappingURL=index.js.map