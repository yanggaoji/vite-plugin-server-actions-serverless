import React, { useState, useEffect } from "react";
import { getDashboardSummary } from "../actions/metrics.server";

export const SimpleDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await getDashboardSummary();
      setData(summary);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading metrics...</div>;
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>Error: {error}</p>
        <button onClick={loadDashboard}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="simple-dashboard">
      <h2>Analytics Dashboard</h2>
      
      <div className="metrics-row">
        <div className="metric-card" data-testid="metric-card">
          <h3>Users</h3>
          <div className="metric-value">{data.metrics.users.totalUsers}</div>
          <div className="metric-detail">
            Active: {data.metrics.users.activeUsers} | 
            New: {data.metrics.users.newUsers}
          </div>
        </div>
        
        <div className="metric-card" data-testid="metric-card">
          <h3>Revenue</h3>
          <div className="metric-value">
            ${data.metrics.revenue.total.toLocaleString()}
          </div>
          <div className="metric-detail">
            {data.metrics.revenue.transactions} transactions
          </div>
        </div>
      </div>

      <div className="chart-section">
        <h3>7-Day Trends</h3>
        <div className="simple-chart">
          <h4>User Activity</h4>
          <div className="chart-bars">
            {data.trends.users.map((point: any, i: number) => (
              <div key={i} className="bar-container">
                <div 
                  className="bar" 
                  style={{ 
                    height: `${(point.value / 300) * 100}%`,
                    backgroundColor: '#4CAF50' 
                  }}
                  title={`${point.date}: ${point.value} users`}
                />
                <div className="bar-label">{point.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="footer">
        <p>Last updated: {new Date(data.lastUpdated).toLocaleString()}</p>
        <button onClick={loadDashboard}>Refresh</button>
      </div>
    </div>
  );
};