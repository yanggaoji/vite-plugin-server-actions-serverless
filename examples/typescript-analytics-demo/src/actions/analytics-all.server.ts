import { z } from "zod";

// ============================================
// Types (inline to avoid import issues)
// ============================================

// Branded types
export type UserId = string & { __brand: "UserId" };
export type OrderId = string & { __brand: "OrderId" };
export type ProductId = string & { __brand: "ProductId" };

// Helper functions for branded types (internal use only)
const createUserId = (id: string): UserId => `user_${id}` as UserId;
const createOrderId = (id: string): OrderId => `order_${id}` as OrderId;
const createProductId = (id: string): ProductId => `product_${id}` as ProductId;

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

// Discriminated union
export type AnalyticsEvent = 
  | { type: "page_view"; userId: UserId; url: string; timestamp: Date }
  | { type: "add_to_cart"; userId: UserId; productId: ProductId; quantity: number; timestamp: Date }
  | { type: "purchase"; userId: UserId; orderId: OrderId; amount: number; timestamp: Date }
  | { type: "search"; userId: UserId; query: string; results: number; timestamp: Date };

// Intersection types
export type TimeSeriesData<T> = {
  timestamp: Date;
  value: T;
  metadata?: {
    source: string;
    confidence: number;
  };
};

// Mapped types
export type Aggregation<T extends Record<string, number>> = {
  [K in keyof T as `${string & K}_sum`]: number;
} & {
  [K in keyof T as `${string & K}_avg`]: number;
} & {
  [K in keyof T as `${string & K}_count`]: number;
};

// Recursive types
export type GroupedData<T> = {
  key: T[keyof T];
  values: T[];
  children?: GroupedData<T>[];
};

// ============================================
// Data Generation Functions
// ============================================

// Helper to generate deterministic random numbers
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Generate synthetic analytics events
 */
export async function generateEvents(
  dateRange: { start: string; end: string },
  options: { userCount?: number; eventMultiplier?: number; seed?: number } = {}
): Promise<AnalyticsEvent[]> {
  const opts = {
    userCount: options.userCount || 100,
    eventMultiplier: options.eventMultiplier || 5,
    seed: options.seed || Date.now()
  };
  
  const random = seededRandom(opts.seed);
  const events: AnalyticsEvent[] = [];
  
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate users
  const userIds: UserId[] = Array.from({ length: opts.userCount }, (_, i) => 
    createUserId(`${i + 1000}`)
  );
  
  // Generate products
  const products = [
    { id: createProductId("laptop"), name: "Laptop", price: 999 },
    { id: createProductId("phone"), name: "Phone", price: 699 },
    { id: createProductId("tablet"), name: "Tablet", price: 499 },
    { id: createProductId("watch"), name: "Watch", price: 299 },
    { id: createProductId("headphones"), name: "Headphones", price: 199 }
  ];
  
  // Generate events for each day
  for (let day = 0; day < dayCount; day++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + day);
    
    const eventsToday = Math.floor(opts.userCount * opts.eventMultiplier * (0.5 + random() * 0.5));
    
    for (let i = 0; i < eventsToday; i++) {
      const userId = userIds[Math.floor(random() * userIds.length)];
      const timestamp = new Date(currentDate);
      timestamp.setHours(Math.floor(random() * 24));
      timestamp.setMinutes(Math.floor(random() * 60));
      
      const eventType = random();
      
      if (eventType < 0.4) {
        events.push({
          type: "page_view",
          userId,
          url: ["/", "/products", "/about", "/contact"][Math.floor(random() * 4)],
          timestamp
        });
      } else if (eventType < 0.7) {
        const product = products[Math.floor(random() * products.length)];
        events.push({
          type: "add_to_cart",
          userId,
          productId: product.id,
          quantity: Math.ceil(random() * 3),
          timestamp
        });
      } else if (eventType < 0.9) {
        events.push({
          type: "search",
          userId,
          query: ["laptop", "phone", "tablet", "accessories"][Math.floor(random() * 4)],
          results: Math.floor(random() * 50),
          timestamp
        });
      } else {
        const product = products[Math.floor(random() * products.length)];
        events.push({
          type: "purchase",
          userId,
          orderId: createOrderId(`${Date.now()}_${i}`),
          amount: product.price * (1 + Math.floor(random() * 3)),
          timestamp
        });
      }
    }
  }
  
  return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

generateEvents.schema = z.tuple([
  z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  z.object({
    userCount: z.number().min(1).max(1000).optional(),
    eventMultiplier: z.number().min(1).max(10).optional(),
    seed: z.number().optional()
  }).optional()
]);

/**
 * Generate time series data
 */
export async function generateTimeSeries<T extends number | { [key: string]: number }>(
  metric: "revenue" | "users" | "conversion",
  dateRange: { start: string; end: string },
  interval: "hourly" | "daily" = "daily"
): Promise<TimeSeriesData<T>[]> {
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  
  const data: TimeSeriesData<T>[] = [];
  const random = seededRandom(Date.now());
  
  const intervalMs = interval === "hourly" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  let current = new Date(startDate);
  
  while (current <= endDate) {
    let value: T;
    
    switch (metric) {
      case "revenue":
        value = (1000 + random() * 4000) as T;
        break;
      case "users":
        value = Math.floor(50 + random() * 150) as T;
        break;
      case "conversion":
        const conversionData = {
          rate: 0.02 + random() * 0.08,
          total: Math.floor(100 + random() * 400),
          converted: 0
        };
        conversionData.converted = Math.floor(conversionData.total * conversionData.rate);
        value = conversionData as unknown as T;
        break;
    }
    
    data.push({
      timestamp: new Date(current),
      value,
      metadata: {
        source: "synthetic",
        confidence: 0.85 + random() * 0.15
      }
    });
    
    current = new Date(current.getTime() + intervalMs);
  }
  
  return data;
}

generateTimeSeries.schema = z.tuple([
  z.enum(["revenue", "users", "conversion"]),
  z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  z.enum(["hourly", "daily"]).optional()
]);

// ============================================
// Analytics Functions
// ============================================

/**
 * Calculate metrics with conditional type returns
 */
export async function calculateMetric<T extends MetricName>(
  metricName: T,
  dateRange: { start: string; end: string }
): Promise<MetricValue<T>> {
  // Get events for the date range
  const events = await generateEvents(dateRange);
  
  // Type-safe metric calculation based on template literal type
  const [entity, metric] = metricName.split("_") as [string, string, string];
  
  // Filter events based on entity
  const relevantEvents = events.filter(event => {
    switch (entity) {
      case "user": return true;
      case "order": return event.type === "purchase";
      case "product": return event.type === "add_to_cart" || event.type === "purchase";
      case "session": return event.type === "page_view";
      default: return false;
    }
  });
  
  // Calculate based on metric type
  switch (metric) {
    case "count":
      return relevantEvents.length as MetricValue<T>;
      
    case "revenue":
      const revenue = relevantEvents
        .filter(e => e.type === "purchase")
        .reduce((sum, e) => sum + (e as any).amount, 0);
      return { amount: revenue, currency: "USD" } as MetricValue<T>;
      
    case "duration":
      // Simulated session durations
      const durations = relevantEvents.map(() => 5 + Math.random() * 55);
      return {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations)
      } as MetricValue<T>;
      
    case "conversion":
      const total = relevantEvents.filter(e => e.type === "add_to_cart").length;
      const converted = relevantEvents.filter(e => e.type === "purchase").length;
      return {
        rate: total > 0 ? converted / total : 0,
        total,
        converted
      } as MetricValue<T>;
      
    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
}

calculateMetric.schema = z.tuple([
  z.string(),
  z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  })
]);

/**
 * Aggregate data with mapped types
 */
export async function aggregateData<T extends Record<string, number>>(
  data: T[],
  operations: Array<"sum" | "avg" | "count">
): Promise<Aggregation<T>> {
  const result: any = {};
  
  if (data.length === 0) return result;
  
  const keys = Object.keys(data[0]) as Array<keyof T>;
  
  for (const key of keys) {
    for (const op of operations) {
      const fieldName = `${String(key)}_${op}`;
      
      switch (op) {
        case "sum":
          result[fieldName] = data.reduce((sum, item) => sum + (item[key] as number), 0);
          break;
        case "avg":
          result[fieldName] = data.reduce((sum, item) => sum + (item[key] as number), 0) / data.length;
          break;
        case "count":
          result[fieldName] = data.filter(item => item[key] != null).length;
          break;
      }
    }
  }
  
  return result as Aggregation<T>;
}

aggregateData.schema = z.tuple([
  z.array(z.record(z.number())),
  z.array(z.enum(["sum", "avg", "count"]))
]);

/**
 * Group data with recursive types
 */
export async function groupData<T extends Record<string, any>>(
  data: T[],
  groupByFields: Array<keyof T>
): Promise<GroupedData<T>[]> {
  if (groupByFields.length === 0 || data.length === 0) {
    return [];
  }
  
  const [firstField, ...remainingFields] = groupByFields;
  const groups = new Map<T[typeof firstField], T[]>();
  
  // Group by first field
  for (const item of data) {
    const key = item[firstField];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  // Convert to grouped data structure
  const result: GroupedData<T>[] = [];
  
  for (const [key, values] of groups) {
    const group: GroupedData<T> = {
      key,
      values
    };
    
    // Recursively group by remaining fields
    if (remainingFields.length > 0) {
      group.children = await groupData(values, remainingFields) as any;
    }
    
    result.push(group);
  }
  
  return result;
}

groupData.schema = z.tuple([
  z.array(z.record(z.any())),
  z.array(z.string())
]);

/**
 * Complex metric query with type inference
 */
export async function queryMetrics(
  query: {
    metrics: string[];
    groupBy?: string[];
    dateRange: { start: string; end: string };
    filters?: Record<string, any>;
  }
): Promise<{
  results: Array<Record<string, any>>;
  totals: Record<string, number>;
  metadata: {
    queryTime: number;
    resultCount: number;
    groupCount: number;
  };
}> {
  const startTime = Date.now();
  
  // Generate base events
  const events = await generateEvents(query.dateRange);
  
  // Apply filters
  let filteredEvents = events;
  if (query.filters) {
    filteredEvents = events.filter(event => {
      return Object.entries(query.filters!).every(([key, value]) => {
        return (event as any)[key] === value;
      });
    });
  }
  
  // Calculate metrics
  const results: Array<Record<string, any>> = [];
  const totals: Record<string, number> = {};
  
  // Simplified aggregation for demo
  for (const metric of query.metrics) {
    totals[metric] = filteredEvents.length;
  }
  
  // Group if needed
  if (query.groupBy && query.groupBy.length > 0) {
    // Simplified grouping logic
    const grouped = await groupData(filteredEvents as any, query.groupBy);
    results.push(...grouped.map(g => ({
      group: g.key,
      count: g.values.length
    })));
  } else {
    results.push(totals);
  }
  
  return {
    results,
    totals,
    metadata: {
      queryTime: Date.now() - startTime,
      resultCount: results.length,
      groupCount: query.groupBy?.length || 0
    }
  };
}

queryMetrics.schema = z.object({
  metrics: z.array(z.string()),
  groupBy: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  filters: z.record(z.any()).optional()
});