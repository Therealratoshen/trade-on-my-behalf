export const MARKET_FIXTURES = {
  "SOL-PERP": { price: 142.68, change: "+1.84%", high: 145.2, low: 139.7, volume: "18.42M", funding: "0.0081%" },
  "ETH-PERP": { price: 3218.4, change: "-0.62%", high: 3268, low: 3176, volume: "42.18M", funding: "0.0064%" },
  "BTC-PERP": { price: 68420.5, change: "+0.31%", high: 69112, low: 67740, volume: "96.70M", funding: "0.0048%" },
} as const;

export type PaperMarket = keyof typeof MARKET_FIXTURES;
export type PaperTimeframe = "5m" | "15m" | "1H" | "4H";
export type PaperSide = "Long" | "Short";

export interface PaperRiskInput {
  side: "long" | "short";
  equity: number;
  riskPercent: number;
  entry: number;
  stop: number;
  target: number;
  leverage: number;
  feeBps: number;
  slippageBps: number;
  perTradeCap: number;
  dailyRemaining: number;
}

export interface PaperRiskPlan {
  side: "long" | "short";
  entry: number;
  leverage: number;
  riskBudget: number;
  quantity: number;
  notional: number;
  collateral: number;
  modeledLoss: number;
  modeledReward: number;
  actualRiskPercent: number;
  rewardRisk: number;
  breakEvenWinRate: number;
  warnings: string[];
}

export interface PatternObservation {
  sampleCount: number;
  lastClose: number;
  shortSma: number;
  longSma: number;
  crossover: "up" | "down" | "none";
  breakout: "above" | "below" | "inside";
  priorHigh: number;
  priorLow: number;
}

export function calculatePaperRisk(input: PaperRiskInput): PaperRiskPlan {
  const numeric = [input.equity, input.riskPercent, input.entry, input.stop, input.target, input.leverage,
    input.feeBps, input.slippageBps, input.perTradeCap, input.dailyRemaining];
  if (!numeric.every((value) => Number.isFinite(value))) throw new Error("Every numeric assumption must be finite.");
  if (input.equity <= 0 || input.riskPercent <= 0 || input.riskPercent > 100) {
    throw new Error("Paper equity must be positive and the risk budget must be greater than 0 and at most 100%.");
  }
  if ([input.entry, input.stop, input.target].some((value) => value <= 0)) throw new Error("Prices must be positive.");
  if (![1, 2, 3, 5, 10].includes(input.leverage)) throw new Error("Choose one of the listed sample leverage values.");
  if ([input.feeBps, input.slippageBps].some((value) => value < 0 || value > 10000)) {
    throw new Error("Fee and slippage assumptions must be between 0 and 10,000 bps per leg.");
  }
  if (input.perTradeCap < 0 || input.dailyRemaining < 0) throw new Error("Sample collateral budgets cannot be negative.");

  const isLong = input.side === "long";
  if (isLong ? !(input.stop < input.entry && input.target > input.entry) : !(input.stop > input.entry && input.target < input.entry)) {
    throw new Error(isLong ? "For a long, the illustrative stop must be below entry and target above it." : "For a short, the illustrative stop must be above entry and target below it.");
  }

  const costRate = (input.feeBps + input.slippageBps) / 10000;
  const unitLoss = Math.abs(input.entry - input.stop) + (input.entry + input.stop) * costRate;
  const unitReward = Math.abs(input.target - input.entry) - (input.entry + input.target) * costRate;
  if (unitReward <= 0) throw new Error("The target does not cover the entered fee and slippage assumptions.");

  const riskBudget = input.equity * input.riskPercent / 100;
  const collateralLimit = Math.min(input.equity, input.perTradeCap, input.dailyRemaining);
  if (collateralLimit === 0) throw new Error("No collateral remains under the entered sample budgets.");
  const riskQuantity = riskBudget / unitLoss;
  const cashQuantity = input.equity / (input.entry / input.leverage + input.entry * costRate);
  const quantity = Math.min(riskQuantity, collateralLimit * input.leverage / input.entry, cashQuantity);
  const notional = quantity * input.entry;
  const collateral = notional / input.leverage;
  const modeledLoss = quantity * unitLoss;
  const modeledReward = quantity * unitReward;
  const rewardRisk = modeledReward / modeledLoss;
  const breakEvenWinRate = 100 / (1 + rewardRisk);
  const actualRiskPercent = modeledLoss / input.equity * 100;
  const results = [quantity, notional, collateral, modeledLoss, modeledReward, rewardRisk, breakEvenWinRate, actualRiskPercent];
  if (!results.every((value) => Number.isFinite(value) && value > 0)) throw new Error("These assumptions exceed the supported calculation range.");

  const warnings = ["Stops do not guarantee execution or cap actual losses. Funding and venue-specific liquidation are not modeled."];
  if (quantity < riskQuantity) warnings.push("The sample collateral budgets reduce size below the full entered risk budget.");
  if (modeledLoss >= collateral) warnings.push("Modeled loss reaches or exceeds collateral; liquidation can occur before an illustrative stop.");
  if (input.riskPercent > 2) warnings.push("This scenario allocates more than 2% of paper equity to a planned loss; this is not a recommendation.");
  if (costRate === 0) warnings.push("Fees and slippage are assumed to be zero; actual execution costs can differ.");

  return { side: input.side, entry: input.entry, leverage: input.leverage, riskBudget, quantity, notional, collateral,
    modeledLoss, modeledReward, actualRiskPercent, rewardRisk, breakEvenWinRate, warnings };
}

export function parseSampleCloses(text: string): number[] {
  if (!text.trim()) throw new Error("Enter at least 21 completed, equally spaced closing prices, oldest first.");
  if (text.length > 50000) throw new Error("Price input is too large.");
  const closes = text.trim().split(/[\s,]+/).map(Number);
  if (closes.length < 21 || closes.length > 1000) throw new Error("Use between 21 and 1,000 closing prices.");
  if (closes.some((value) => !Number.isFinite(value) || value <= 0)) throw new Error("Every closing price must be finite and positive.");
  return closes;
}

export function analyzeSampleCloses(closes: number[]): PatternObservation {
  if (closes.length < 21 || closes.length > 1000 || closes.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new Error("Pattern observations require 21–1,000 valid closing prices.");
  }
  const average = (values: number[]) => values.reduce((sum, value) => sum + value / values.length, 0);
  const shortSma = average(closes.slice(-5));
  const longSma = average(closes.slice(-20));
  const previousShort = average(closes.slice(-6, -1));
  const previousLong = average(closes.slice(-21, -1));
  const lastClose = closes[closes.length - 1];
  const prior = closes.slice(-21, -1);
  const priorHigh = Math.max(...prior);
  const priorLow = Math.min(...prior);
  const crossover = previousShort <= previousLong && shortSma > longSma ? "up"
    : previousShort >= previousLong && shortSma < longSma ? "down" : "none";
  const breakout = lastClose > priorHigh ? "above" : lastClose < priorLow ? "below" : "inside";
  return { sampleCount: closes.length, lastClose, shortSma, longSma, crossover, breakout, priorHigh, priorLow };
}

const candleStarts = [86, 82, 88, 76, 70, 79, 64, 69, 58, 61, 52, 56, 45, 51, 42, 39, 46, 33, 39, 28, 35, 30, 22, 27, 19, 23, 15, 20, 13, 9, 16, 11, 6, 13, 7, 3];

export function makeSyntheticCandles(market: PaperMarket, timeframe: PaperTimeframe) {
  const frameOffset: Record<PaperTimeframe, number> = { "5m": 2, "15m": 4, "1H": 0, "4H": 7 };
  return candleStarts.map((base, index) => {
    const drift = market === "ETH-PERP" ? (index % 5 === 0 ? 6 : -2)
      : market === "BTC-PERP" ? (index % 4 === 0 ? -3 : 2) : (index % 6 === 0 ? 7 : -1);
    const open = base + drift + (index % 2 ? frameOffset[timeframe] : -frameOffset[timeframe]);
    const close = base + (index % 3 === 0 ? -3 : 4) + (index % 4 ? -frameOffset[timeframe] : frameOffset[timeframe]);
    return { x: 18 + index * 19, open, close, high: Math.min(open, close) - (3 + index % 4), low: Math.max(open, close) + (3 + (index * 3) % 5) };
  });
}
