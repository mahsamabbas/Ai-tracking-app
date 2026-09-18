"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#64748b"];

export function EventsTimelineChart({
  data,
}: {
  data: { hour: string; events: number }[];
}) {
  const hasData = data.some((d) => d.events > 0);
  return (
    <div className="card h-[240px] min-w-0 sm:h-[280px]">
      <h3 className="text-sm font-semibold text-slate-800">Events by hour</h3>
      <p className="text-xs text-slate-500">Current day (local hours)</p>
      {!hasData ? (
        <p className="mt-12 text-center text-sm text-slate-400">
          No events yet — connect an agent or send a test batch
        </p>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="events"
              stroke="#4f46e5"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Events"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function EventTypesChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const hasData = data.length > 0;
  return (
    <div className="card h-[240px] min-w-0 sm:h-[280px]">
      <h3 className="text-sm font-semibold text-slate-800">Event types</h3>
      <p className="text-xs text-slate-500">Top categories in recent window</p>
      {!hasData ? (
        <p className="mt-12 text-center text-sm text-slate-400">No breakdown yet</p>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} name="Count" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function ProviderPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="card h-[240px] min-w-0 sm:h-[280px]">
        <h3 className="text-sm font-semibold text-slate-800">By provider</h3>
        <p className="mt-12 text-center text-sm text-slate-400">No provider data</p>
      </div>
    );
  }
  return (
    <div className="card h-[240px] min-w-0 sm:h-[280px]">
      <h3 className="text-sm font-semibold text-slate-800">By provider</h3>
      <ResponsiveContainer width="100%" height="90%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
