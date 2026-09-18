"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#0d9488",
  "#0ea5e9",
  "#6366f1",
  "#f59e0b",
  "#ec4899",
  "#14b8a6",
  "#64748b",
];

function ChartCard({
  title,
  subtitle,
  children,
  tall,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  tall?: boolean;
}) {
  return (
    <div className={`chart-card ${tall ? "h-[300px]" : "h-[240px]"} min-w-0 sm:h-[280px]`}>
      <h3 className="text-base font-semibold leading-tight text-ink-900">{title}</h3>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <div className="h-[85%]">{children}</div>
    </div>
  );
}

export function EventsTimelineChart({
  data,
}: {
  data: { hour: string; events: number }[];
}) {
  const hasData = data.some((d) => d.events > 0);
  return (
    <ChartCard title="Events by hour" subtitle="When the agent was observed today">
      {!hasData ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="evFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={3} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="#94a3b8" />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="events"
              stroke="#4f46e5"
              fill="url(#evFill)"
              name="Events"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function InteractionMixChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <ChartCard
      title="Agent interaction mix"
      subtitle="Sessions, model, tools, tests, files (PRD §10)"
    >
      {!hasData ? (
        <EmptyChart text="No agent interactions yet — heartbeats are connector health only" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={48} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function HourlyInteractionChart({
  data,
}: {
  data: {
    hour: string;
    model: number;
    tools: number;
    files: number;
    sessions: number;
    tests: number;
  }[];
}) {
  const hasData = data.some(
    (d) => d.model + d.tools + d.files + d.sessions + d.tests > 0,
  );
  return (
    <ChartCard
      title="Interaction timeline"
      subtitle="Sessions, model, tools, files, tests/builds — kept separate (PRD §10–11)"
    >
      {!hasData ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="sessions" stackId="1" stroke="#0ea5e9" fill="#7dd3fc" name="Sessions" />
            <Area type="monotone" dataKey="model" stackId="1" stroke="#4f46e5" fill="#a5b4fc" name="Model" />
            <Area type="monotone" dataKey="tools" stackId="1" stroke="#0f766e" fill="#5eead4" name="Tools" />
            <Area type="monotone" dataKey="files" stackId="1" stroke="#d97706" fill="#fcd34d" name="Files" />
            <Area type="monotone" dataKey="tests" stackId="1" stroke="#be185d" fill="#f9a8d4" name="Tests / builds" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function EventTypesChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const hasData = data.length > 0;
  return (
    <ChartCard title="Event catalog" subtitle="Top types in the recent window">
      {!hasData ? (
        <EmptyChart />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#0d9488" radius={[0, 4, 4, 0]} name="Count" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function EngineeringChecksChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <ChartCard
      title="Tests, builds, lint"
      subtitle="Engineering checks the agent triggered — not developer time"
    >
      {!hasData ? (
        <EmptyChart text="Provider does not expose this metric yet, or no checks ran" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Count">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

export function DonutChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number }[];
}) {
  if (data.length === 0) {
    return (
      <ChartCard title={title} subtitle={subtitle}>
        <EmptyChart />
      </ChartCard>
    );
  }
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={74}
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
    </ChartCard>
  );
}

export function ProviderPieChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  return (
    <DonutChart
      title="By provider"
      subtitle="Which agent emitted the events"
      data={data}
    />
  );
}

function EmptyChart({ text }: { text?: string }) {
  return (
    <p className="mt-10 px-2 text-center text-sm text-slate-400">
      {text ?? "No activity observed — not the same as zero work"}
    </p>
  );
}
