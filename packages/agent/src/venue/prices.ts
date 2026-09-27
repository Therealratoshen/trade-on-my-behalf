import { MARKETS, type Market, type PriceFeed } from './index.js';

const JUPITER_PRICE_API = 'https://lite-api.jup.ag/price/v3';

/** Spot USD prices from Jupiter's public price API (same oracle family Jupiter Perps marks against). */
export class JupiterPriceFeed implements PriceFeed {
  constructor(private readonly baseUrl = JUPITER_PRICE_API, private readonly timeoutMs = 8_000) {}

  async priceUsd(market: Market): Promise<number> {
    const mint = MARKETS[market].mint;
    const res = await fetch(`${this.baseUrl}?ids=${mint}`, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) throw new Error(`Jupiter price API ${res.status} for ${market}`);
    const body = (await res.json()) as Record<string, { usdPrice?: number } | undefined>;
    const price = body[mint]?.usdPrice;
    if (typeof price !== 'number' || !(price > 0)) {
      throw new Error(`Jupiter price API returned no price for ${market} (${mint})`);
    }
    return price;
  }
}

/** Fixed prices, for tests and offline demos. */
export class StaticPriceFeed implements PriceFeed {
  constructor(private readonly prices: Partial<Record<Market, number>>) {}

  set(market: Market, price: number): void {
    this.prices[market] = price;
  }

  async priceUsd(market: Market): Promise<number> {
    const p = this.prices[market];
    if (p === undefined) throw new Error(`no static price for ${market}`);
    return p;
  }
}
