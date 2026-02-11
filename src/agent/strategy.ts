/**
 * Simple Momentum Strategy for AlphaVault Demo
 *
 * Tracks recent prices and determines trade direction based on
 * short-term momentum (simple moving average crossover).
 */

export type Signal = 'long' | 'short' | 'neutral';

export class MomentumStrategy {
  private prices: number[] = [];
  private readonly shortWindow: number;
  private readonly longWindow: number;

  constructor(shortWindow = 3, longWindow = 6) {
    this.shortWindow = shortWindow;
    this.longWindow = longWindow;
  }

  /** Add a price observation */
  addPrice(price: number): void {
    this.prices.push(price);
    // Keep only what we need
    if (this.prices.length > this.longWindow + 5) {
      this.prices = this.prices.slice(-this.longWindow - 5);
    }
  }

  /** Get current signal based on SMA crossover */
  getSignal(): Signal {
    if (this.prices.length < this.longWindow) return 'neutral';

    const shortSMA = this.avg(this.prices.slice(-this.shortWindow));
    const longSMA = this.avg(this.prices.slice(-this.longWindow));
    const diff = (shortSMA - longSMA) / longSMA;

    // Require at least 0.05% divergence to trade
    if (diff > 0.0005) return 'long';
    if (diff < -0.0005) return 'short';
    return 'neutral';
  }

  /** Get formatted state for display */
  getState(): { prices: number[]; signal: Signal; shortSMA: number; longSMA: number } {
    const signal = this.getSignal();
    const shortSMA = this.prices.length >= this.shortWindow
      ? this.avg(this.prices.slice(-this.shortWindow))
      : 0;
    const longSMA = this.prices.length >= this.longWindow
      ? this.avg(this.prices.slice(-this.longWindow))
      : 0;
    return { prices: [...this.prices], signal, shortSMA, longSMA };
  }

  private avg(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
