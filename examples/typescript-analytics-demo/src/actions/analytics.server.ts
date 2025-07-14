import { z } from "zod";
import type { 
  MetricName, 
  MetricValue,
  Aggregation,
  GroupedData
} from "../types/analytics";
import { generateEvents } from "./data-generator.server";

// Schemas
const MetricQuerySchema = z.object({
  metrics: z.array(z.string()),
  groupBy: z.array(z.string()).optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  filters: z.record(z.any()).optional()
});

/**
 * Calculate metrics with conditional type returns
 * Demonstrates advanced conditional types in practice
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
 * Shows how mapped types create new object shapes
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
 * Demonstrates recursive type definitions
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
 * Demonstrates how TypeScript infers return types from inputs
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
  const validated = MetricQuerySchema.parse(query);
  const startTime = Date.now();
  
  // Generate base events
  const events = await generateEvents(validated.dateRange);
  
  // Apply filters
  let filteredEvents = events;
  if (validated.filters) {
    filteredEvents = events.filter(event => {
      return Object.entries(validated.filters!).every(([key, value]) => {
        return (event as any)[key] === value;
      });
    });
  }
  
  // Calculate metrics
  const results: Array<Record<string, any>> = [];
  const totals: Record<string, number> = {};
  
  // Simplified aggregation for demo
  for (const metric of validated.metrics) {
    totals[metric] = filteredEvents.length;
  }
  
  // Group if needed
  if (validated.groupBy && validated.groupBy.length > 0) {
    // Simplified grouping logic
    const grouped = await groupData(filteredEvents as any, validated.groupBy);
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
      groupCount: validated.groupBy?.length || 0
    }
  };
}

queryMetrics.schema = MetricQuerySchema;