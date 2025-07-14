import { z } from "zod";

/**
 * Simple analytics server actions that demonstrate TypeScript features
 * without complex cross-file imports
 */

// Inline type definitions to avoid import issues

// Template literal types
type MetricType = "pageviews" | "users" | "revenue";
type TimeFrame = "daily" | "weekly" | "monthly";
type MetricName = `${MetricType}_${TimeFrame}`;

// Conditional types
type MetricValue<T extends MetricName> = 
  T extends `pageviews_${infer TF}` ? number :
  T extends `users_${infer TF}` ? { active: number; new: number } :
  T extends `revenue_${infer TF}` ? { amount: number; currency: string } :
  never;

// Branded types
type UserId = string & { __brand: "UserId" };
type SessionId = string & { __brand: "SessionId" };

// Helper functions
const createUserId = (id: string): UserId => `user_${id}` as UserId;
const createSessionId = (id: string): SessionId => `sess_${id}` as SessionId;

// Discriminated union
type AnalyticsEvent = 
  | { type: "pageview"; userId: UserId; url: string; timestamp: Date }
  | { type: "purchase"; userId: UserId; amount: number; timestamp: Date }
  | { type: "signup"; userId: UserId; source: string; timestamp: Date };

// Intersection type
type TimestampedData<T> = T & {
  timestamp: Date;
  metadata?: {
    source: string;
    version: number;
  };
};

/**
 * Get a specific metric value
 * Demonstrates conditional types
 */
export async function getMetric<T extends MetricName>(
  metric: T,
  dateRange: { start: string; end: string }
): Promise<MetricValue<T>> {
  // Simulate different return types based on metric name
  if (metric.startsWith("pageviews_")) {
    return Math.floor(Math.random() * 10000) as MetricValue<T>;
  } else if (metric.startsWith("users_")) {
    return {
      active: Math.floor(Math.random() * 1000),
      new: Math.floor(Math.random() * 100)
    } as MetricValue<T>;
  } else if (metric.startsWith("revenue_")) {
    return {
      amount: Math.random() * 10000,
      currency: "USD"
    } as MetricValue<T>;
  }
  
  throw new Error(`Unknown metric: ${metric}`);
}

getMetric.schema = z.tuple([
  z.string(),
  z.object({
    start: z.string(),
    end: z.string()
  })
]);

/**
 * Generate sample events
 * Demonstrates discriminated unions and branded types
 */
export async function generateEvents(
  count: number = 10
): Promise<AnalyticsEvent[]> {
  const events: AnalyticsEvent[] = [];
  const userIds = Array.from({ length: 5 }, (_, i) => createUserId(`${i + 1000}`));
  
  for (let i = 0; i < count; i++) {
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    const type = Math.random();
    
    if (type < 0.6) {
      events.push({
        type: "pageview",
        userId,
        url: ["/", "/about", "/products", "/contact"][Math.floor(Math.random() * 4)],
        timestamp: new Date()
      });
    } else if (type < 0.9) {
      events.push({
        type: "purchase",
        userId,
        amount: Math.random() * 500,
        timestamp: new Date()
      });
    } else {
      events.push({
        type: "signup",
        userId,
        source: ["google", "facebook", "direct", "email"][Math.floor(Math.random() * 4)],
        timestamp: new Date()
      });
    }
  }
  
  return events;
}

generateEvents.schema = z.tuple([z.number().optional()]);

/**
 * Process data with timestamps
 * Demonstrates intersection types and generics
 */
export async function processWithTimestamp<T extends Record<string, any>>(
  data: T
): Promise<TimestampedData<T>> {
  return {
    ...data,
    timestamp: new Date(),
    metadata: {
      source: "analytics-api",
      version: 1
    }
  };
}

processWithTimestamp.schema = z.tuple([z.object({}).passthrough()]);

/**
 * Get dashboard summary
 * Demonstrates multiple TypeScript features together
 */
export async function getDashboardSummary(): Promise<{
  metrics: {
    [K in MetricName]?: MetricValue<K>;
  };
  recentEvents: AnalyticsEvent[];
  timestamp: Date;
}> {
  const [pageviews, users, revenue, events] = await Promise.all([
    getMetric("pageviews_daily", { start: "", end: "" }),
    getMetric("users_weekly", { start: "", end: "" }),
    getMetric("revenue_monthly", { start: "", end: "" }),
    generateEvents(5)
  ]);
  
  return {
    metrics: {
      "pageviews_daily": pageviews,
      "users_weekly": users,
      "revenue_monthly": revenue
    },
    recentEvents: events,
    timestamp: new Date()
  };
}

getDashboardSummary.schema = z.tuple([]);