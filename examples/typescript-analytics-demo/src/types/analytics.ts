import { UserId, OrderId, ProductId } from "./branded";

/**
 * Advanced TypeScript types for analytics
 */

// Template literal types for metric names
export type Entity = "user" | "order" | "product" | "session";
export type Metric = "count" | "revenue" | "duration" | "conversion";
export type Timeframe = "hourly" | "daily" | "weekly" | "monthly";

export type MetricName = `${Entity}_${Metric}_${Timeframe}`;

// Conditional types for metric values
export type MetricValue<T extends MetricName> = 
  T extends `${infer E}_count_${infer TF}` ? number :
  T extends `${infer E}_revenue_${infer TF}` ? { amount: number; currency: string } :
  T extends `${infer E}_duration_${infer TF}` ? { avg: number; min: number; max: number } :
  T extends `${infer E}_conversion_${infer TF}` ? { rate: number; total: number; converted: number } :
  never;

// Discriminated union for events
export type AnalyticsEvent = 
  | { type: "page_view"; userId: UserId; url: string; timestamp: Date }
  | { type: "purchase"; userId: UserId; orderId: OrderId; amount: number; timestamp: Date }
  | { type: "add_to_cart"; userId: UserId; productId: ProductId; quantity: number; timestamp: Date }
  | { type: "search"; userId: UserId; query: string; results: number; timestamp: Date };

// Intersection type for time-series data
export type TimeSeriesData<T> = {
  timestamp: Date;
  value: T;
} & {
  metadata?: {
    source: string;
    confidence: number;
  };
};

// Mapped type for aggregations
export type Aggregation<T extends Record<string, unknown>> = {
  [K in keyof T as `${string & K}_sum`]?: number;
} & {
  [K in keyof T as `${string & K}_avg`]?: number;
} & {
  [K in keyof T as `${string & K}_count`]?: number;
};

// Recursive type for nested grouping
export type GroupedData<T, K extends keyof T = keyof T> = {
  key: T[K];
  values: T[];
  children?: GroupedData<T, Exclude<keyof T, K>>[];
};

// Type for query results with inference
export type QueryResult<T extends Record<string, any>> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

// Utility type for deep partial (for filters)
export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

// Type for date ranges with validation
export type DateRange = {
  start: Date;
  end: Date;
} & {
  isValid(): boolean;
  getDays(): number;
};

// Advanced generic constraint for data transformers
export type DataTransformer<TInput, TOutput> = {
  name: string;
  transform(data: TInput): TOutput;
  reverse?(data: TOutput): TInput;
  validate?(data: TInput): boolean;
};