"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type Props = {
  monthlyProfit: { month: string; profit: number }[];
  profitByPlatform: { platform: string; profit: number }[];
  inventoryStatus: { name: string; value: number }[];
  agingBuckets: { bucket: string; count: number }[];
};

export default function ReportsCharts({
  monthlyProfit,
  profitByPlatform,
  inventoryStatus,
  agingBuckets,
}: Props) {
  // Use default-ish palette but keep it subtle on dark UI
  const pieColors = ["#6ee7b7", "#93c5fd", "#c4b5fd", "#fbbf24", "#fca5a5", "#a7f3d0"];

  return (
    <div className="chartsGrid">
      {/* Monthly profit line */}
      <div className="tableWrap" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Monthly Profit (last 12 months)
        </div>
        <div className="chartBox">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyProfit}
              margin={{ top: 10, right: 20, left: -30, bottom: 0 }}
            >
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="profit" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Profit by platform bar */}
      <div className="tableWrap" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Profit by Platform</div>
        <div className="chartBox">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={profitByPlatform}
              margin={{ top: 10, right: 20, left: -30, bottom: 0 }}
            >
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory status pie */}
      <div className="tableWrap" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Inventory Status Split</div>
        <div className="chartBox">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={inventoryStatus}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {inventoryStatus.map((_, idx) => (
                  <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Aging buckets bar */}
      <div className="tableWrap" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Unsold Stock Age (days)</div>
        <div className="chartBox">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={agingBuckets}
              margin={{ top: 10, right: 20, left: -30, bottom: 0 }}
            >
              <CartesianGrid strokeOpacity={0.15} />
              <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
