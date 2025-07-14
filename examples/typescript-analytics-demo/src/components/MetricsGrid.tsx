import React from "react";

interface MetricsGridProps {
  metrics: {
    userCount: number;
    revenue: { amount: number; currency: string };
    conversion: { rate: number; total: number; converted: number };
  } | null;
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  if (!metrics) return null;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <h3>Active Users</h3>
        <div className="metric-value">{metrics.userCount.toLocaleString()}</div>
        <div className="metric-label">Last 7 days</div>
      </div>

      <div className="metric-card">
        <h3>Revenue</h3>
        <div className="metric-value">
          {formatCurrency(metrics.revenue.amount, metrics.revenue.currency)}
        </div>
        <div className="metric-label">Total revenue</div>
      </div>

      <div className="metric-card">
        <h3>Conversion Rate</h3>
        <div className="metric-value">{formatPercentage(metrics.conversion.rate)}</div>
        <div className="metric-label">
          {metrics.conversion.converted} of {metrics.conversion.total} converted
        </div>
      </div>
    </div>
  );
};