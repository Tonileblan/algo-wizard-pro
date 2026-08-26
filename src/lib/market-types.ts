export type Candle = {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Quote = {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  currency: string;
  asOf: string;
};

export type CandleSeries = {
  symbol: string;
  interval: string;
  source: string;
  cached: boolean;
  candles: Candle[];
};
