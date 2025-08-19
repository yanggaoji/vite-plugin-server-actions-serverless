import { z } from "zod";

/**
 * Simple metrics server - demonstrating TypeScript support
 */

// Schema definitions
const DateRangeSchema = z.object({
  start: z.string(),
  end: z.string()
});

/**
 * Get user metrics
 */
export async function getUserMetrics(dateRange: { start: string; end: string }) {
  // Validate input
  const range = DateRangeSchema.parse(dateRange);
  
  // Return mock data
  return {
    totalUsers: Math.floor(Math.random() * 1000) + 500,
    activeUsers: Math.floor(Math.random() * 500) + 200,
    newUsers: Math.floor(Math.random() * 100) + 50,
    dateRange: range
  };
}

getUserMetrics.schema = DateRangeSchema;

/**
 * Get revenue metrics
 */
export async function getRevenueMetrics(dateRange: { start: string; end: string }) {
  const range = DateRangeSchema.parse(dateRange);
  
  return {
    total: Math.floor(Math.random() * 50000) + 10000,
    currency: "USD",
    transactions: Math.floor(Math.random() * 100) + 50,
    dateRange: range
  };
}

getRevenueMetrics.schema = DateRangeSchema;

/**
 * Get time series data for charts
 */
export async function getTimeSeriesData(
  metric: "users" | "revenue",
  days: number = 7
): Promise<Array<{ date: string; value: number }>> {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    let value: number;
    if (metric === "users") {
      value = Math.floor(Math.random() * 200) + 100;
    } else {
      value = Math.floor(Math.random() * 5000) + 1000;
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value
    });
  }
  
  return data;
}

getTimeSeriesData.schema = z.tuple([
  z.enum(["users", "revenue"]),
  z.number().optional()
]);

/**
 * Get dashboard summary - all metrics at once
 */
export async function getDashboardSummary() {
  const dateRange = {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  };
  
  const [users, revenue, userTrend, revenueTrend] = await Promise.all([
    getUserMetrics(dateRange),
    getRevenueMetrics(dateRange),
    getTimeSeriesData("users", 7),
    getTimeSeriesData("revenue", 7)
  ]);
  
  return {
    metrics: {
      users,
      revenue
    },
    trends: {
      users: userTrend,
      revenue: revenueTrend
    },
    lastUpdated: new Date().toISOString()
  };
}

getDashboardSummary.schema = z.tuple([]);