import { z } from "zod";

/**
 * Simple server action to test basic functionality
 */
export async function getSimpleMetric(name: string): Promise<number> {
  // Return a random metric value based on name hash
  const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return Math.floor((Math.random() + hash) * 1000) % 1000;
}

getSimpleMetric.schema = z.tuple([z.string()]);

/**
 * Get dashboard stats
 */
export async function getDashboardStats(): Promise<{
  users: number;
  revenue: number;
  orders: number;
  timestamp: string;
}> {
  return {
    users: Math.floor(Math.random() * 1000),
    revenue: Math.floor(Math.random() * 10000),
    orders: Math.floor(Math.random() * 100),
    timestamp: new Date().toISOString()
  };
}

getDashboardStats.schema = z.tuple([]);