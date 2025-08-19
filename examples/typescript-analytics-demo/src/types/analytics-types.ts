// Shared types that can be imported by both client and server

// Template literal types
export type Entity = "user" | "order" | "product" | "session";
export type Metric = "count" | "revenue" | "duration" | "conversion";
export type Timeframe = "daily" | "weekly" | "monthly";
export type MetricName = `${Entity}_${Metric}_${Timeframe}`;

// Conditional types
export type MetricValue<T extends MetricName> = 
  T extends `${infer _E}_count_${infer _TF}` ? number :
  T extends `${infer _E}_revenue_${infer _TF}` ? { amount: number; currency: string } :
  T extends `${infer _E}_duration_${infer _TF}` ? { avg: number; min: number; max: number } :
  T extends `${infer _E}_conversion_${infer _TF}` ? { rate: number; total: number; converted: number } :
  never;