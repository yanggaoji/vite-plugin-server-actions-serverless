import { z } from "zod";
import { 
  createUserId, 
  createOrderId, 
  createProductId,
  type UserId
} from "../types/branded";
import type { AnalyticsEvent, TimeSeriesData } from "../types/analytics";

// Zod schemas for validation
const DateRangeSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

const GenerateOptionsSchema = z.object({
  userCount: z.number().min(1).max(1000).default(100),
  eventMultiplier: z.number().min(1).max(10).default(5),
  seed: z.number().optional()
});

// Helper to generate deterministic random numbers
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Generate synthetic analytics events
 * Demonstrates discriminated unions and branded types
 */
export async function generateEvents(
  dateRange: { start: string; end: string },
  options: { userCount?: number; eventMultiplier?: number; seed?: number } = {}
): Promise<AnalyticsEvent[]> {
  const range = DateRangeSchema.parse(dateRange);
  const opts = GenerateOptionsSchema.parse(options);
  
  const random = seededRandom(opts.seed || Date.now());
  const events: AnalyticsEvent[] = [];
  
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
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
    
    // Events per day based on multiplier
    const eventsToday = Math.floor(opts.userCount * opts.eventMultiplier * (0.5 + random() * 0.5));
    
    for (let i = 0; i < eventsToday; i++) {
      const userId = userIds[Math.floor(random() * userIds.length)];
      const timestamp = new Date(currentDate);
      timestamp.setHours(Math.floor(random() * 24));
      timestamp.setMinutes(Math.floor(random() * 60));
      
      const eventType = random();
      
      if (eventType < 0.4) {
        // Page view (40%)
        events.push({
          type: "page_view",
          userId,
          url: ["/", "/products", "/about", "/contact"][Math.floor(random() * 4)],
          timestamp
        });
      } else if (eventType < 0.7) {
        // Add to cart (30%)
        const product = products[Math.floor(random() * products.length)];
        events.push({
          type: "add_to_cart",
          userId,
          productId: product.id,
          quantity: Math.ceil(random() * 3),
          timestamp
        });
      } else if (eventType < 0.9) {
        // Search (20%)
        events.push({
          type: "search",
          userId,
          query: ["laptop", "phone", "tablet", "accessories"][Math.floor(random() * 4)],
          results: Math.floor(random() * 50),
          timestamp
        });
      } else {
        // Purchase (10%)
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

generateEvents.schema = z.tuple([DateRangeSchema, GenerateOptionsSchema.optional()]);

/**
 * Generate time series data with type-safe structure
 * Demonstrates intersection types and generics
 */
export async function generateTimeSeries<T extends number | { [key: string]: number }>(
  metric: "revenue" | "users" | "conversion",
  dateRange: { start: string; end: string },
  interval: "hourly" | "daily" = "daily"
): Promise<TimeSeriesData<T>[]> {
  const range = DateRangeSchema.parse(dateRange);
  const startDate = new Date(range.start);
  const endDate = new Date(range.end);
  
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
  DateRangeSchema,
  z.enum(["hourly", "daily"]).optional()
]);