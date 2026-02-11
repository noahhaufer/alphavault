/**
 * Simple Momentum Strategy for AlphaVault Demo
 *
 * Tracks recent prices and determines trade direction based on
 * short-term momentum (simple moving average crossover).
 */
export type Signal = 'long' | 'short' | 'neutral';
export declare class MomentumStrategy {
    private prices;
    private readonly shortWindow;
    private readonly longWindow;
    constructor(shortWindow?: number, longWindow?: number);
    /** Add a price observation */
    addPrice(price: number): void;
    /** Get current signal based on SMA crossover */
    getSignal(): Signal;
    /** Get formatted state for display */
    getState(): {
        prices: number[];
        signal: Signal;
        shortSMA: number;
        longSMA: number;
    };
    private avg;
}
//# sourceMappingURL=strategy.d.ts.map