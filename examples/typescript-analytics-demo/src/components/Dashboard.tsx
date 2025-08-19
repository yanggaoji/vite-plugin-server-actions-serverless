import React, { useState, useEffect } from "react";
import { MetricsGrid } from "./MetricsGrid";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { TypeFeatureCard } from "./TypeFeatureCard";
import { 
  calculateMetric
} from "../actions/analytics.server";
import { generateTimeSeries } from "../actions/data-generator.server";
import type { MetricName } from "../types/analytics-types";

interface DashboardProps {
  showTypeInfo: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ showTypeInfo }) => {
  const [loading, setLoading] = useState(true);
  const [dateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString()
  });
  
  const [metrics, setMetrics] = useState<{
    userCount: number;
    revenue: { amount: number; currency: string };
    conversion: { rate: number; total: number; converted: number };
  } | null>(null);
  
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load multiple metrics in parallel
      const [userCount, revenue, conversion, timeSeries] = await Promise.all([
        calculateMetric("user_count_daily" as MetricName, dateRange),
        calculateMetric("order_revenue_daily" as MetricName, dateRange),
        calculateMetric("product_conversion_daily" as MetricName, dateRange),
        generateTimeSeries("revenue", dateRange, "daily")
      ]);

      setMetrics({
        userCount: userCount as number,
        revenue: revenue as { amount: number; currency: string },
        conversion: conversion as { rate: number; total: number; converted: number }
      });

      // Transform time series for chart
      setTimeSeriesData(timeSeries.map(point => ({
        date: new Date(point.timestamp).toLocaleDateString(),
        value: typeof point.value === "number" ? point.value : 0,
        confidence: point.metadata?.confidence || 1
      })));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading analytics data...</div>;
  }

  return (
    <div className="dashboard">
      {showTypeInfo && (
        <TypeFeatureCard
          feature="Template Literal Types"
          description="MetricName uses template literals to create type-safe metric names"
          example={`type MetricName = \`\${Entity}_\${Metric}_\${Timeframe}\`;
// Results in: "user_count_daily" | "order_revenue_weekly" | ...`}
        />
      )}

      <MetricsGrid metrics={metrics} />

      {showTypeInfo && (
        <TypeFeatureCard
          feature="Conditional Types"
          description="MetricValue returns different types based on the metric name"
          example={`type MetricValue<T> = 
  T extends \`\${infer E}_count_\${infer TF}\` ? number :
  T extends \`\${infer E}_revenue_\${infer TF}\` ? { amount: number; currency: string } :
  never;`}
        />
      )}

      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Revenue Trend</h3>
          <TimeSeriesChart data={timeSeriesData} dataKey="value" />
        </div>
      </div>

      {showTypeInfo && (
        <TypeFeatureCard
          feature="Branded Types"
          description="Prevent mixing different ID types with branded types"
          example={`type UserId = string & { __brand: "UserId" };
type OrderId = string & { __brand: "OrderId" };
// Now you can't accidentally pass a UserId where OrderId is expected`}
        />
      )}
    </div>
  );
};