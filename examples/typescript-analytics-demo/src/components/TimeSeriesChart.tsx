import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";

interface TimeSeriesChartProps {
  data: Array<{
    date: string;
    value: number;
    confidence?: number;
  }>;
  dataKey: string;
  color?: string;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  dataKey,
  color = "#0066cc"
}) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="date" 
          stroke="#666"
          style={{ fontSize: "12px" }}
        />
        <YAxis 
          stroke="#666"
          style={{ fontSize: "12px" }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            border: "1px solid #ddd",
            borderRadius: "4px"
          }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
        />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          fill={color}
          fillOpacity={0.1}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};