"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERP_MARKET_MAP = exports.ACCOUNT_TIERS = void 0;
exports.resolveMarketIndex = resolveMarketIndex;
exports.ACCOUNT_TIERS = [
    { capital: 10000, fee: 89 },
    { capital: 25000, fee: 199 },
    { capital: 50000, fee: 299 },
    { capital: 100000, fee: 499 },
    { capital: 200000, fee: 899 },
];
/** Supported Drift perp markets (devnet) */
exports.PERP_MARKET_MAP = {
    'SOL-PERP': 0,
    'BTC-PERP': 1,
    'ETH-PERP': 2,
    'APT-PERP': 3,
    '1MBONK-PERP': 4,
    'MATIC-PERP': 5,
    'ARB-PERP': 6,
    'DOGE-PERP': 7,
    'BNB-PERP': 8,
    'SUI-PERP': 9,
    '1MPEPE-PERP': 10,
    'OP-PERP': 11,
    'RENDER-PERP': 12,
    'XRP-PERP': 13,
    'HNT-PERP': 14,
    'INJ-PERP': 15,
    'LINK-PERP': 16,
    'RLB-PERP': 17,
    'PYTH-PERP': 18,
    'TIA-PERP': 19,
    'JTO-PERP': 20,
    'SEI-PERP': 21,
    'WIF-PERP': 22,
    'JUP-PERP': 23,
    'DYM-PERP': 24,
    'TAO-PERP': 25,
    'W-PERP': 26,
    'KMNO-PERP': 27,
    'TNSR-PERP': 28,
};
function resolveMarketIndex(market) {
    if (market == null)
        return 0; // default SOL-PERP
    const upper = market.toUpperCase();
    if (upper in exports.PERP_MARKET_MAP)
        return exports.PERP_MARKET_MAP[upper];
    const asNum = Number(market);
    if (!isNaN(asNum) && asNum >= 0)
        return asNum;
    throw new Error(`Unknown perp market: ${market}. Supported: ${Object.keys(exports.PERP_MARKET_MAP).join(', ')}`);
}
//# sourceMappingURL=index.js.map