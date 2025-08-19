// Shared types that can be imported by both client and server

// Template literal types
export type Entity = "user" | "order" | "product" | "session";
export type Metric = "count" | "revenue" | "duration" | "conversion";
export type Timeframe = "daily" | "weekly" | "monthly";
export type MetricName = `${Entity}_${Metric}_${Timeframe}`;

// Conditional types
export type MetricValue<T extends MetricName> = 
  T extends `${infer E}_count_${infer TF}` ? number :
  T extends `${infer E}_revenue_${infer TF}` ? { amount: number; currency: string } :
  T extends `${infer E}_duration_${infer TF}` ? { avg: number; min: number; max: number } :
  T extends `${infer E}_conversion_${infer TF}` ? { rate: number; total: number; converted: number } :
  never;