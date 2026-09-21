"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS, ChartFrame, GRID, TooltipShell, durationTicks } from "./ChartFrame";
import { formatDate, formatDuration } from "@/lib/format";
import type { TrendPoint } from "@/lib/types";
import type { EmptyVariant } from "@/components/ui/States";

/** Daily active vs idle time. Two bands so they are never read as one number. */
export function TrendChart({
  data,
  height = 260,
  emptyVariant = "no-activity",
}: {
  data: TrendPoint[];
  height?: number;
  emptyVariant?: EmptyVariant;
}) {
  const isEmpty = data.every((d) => d.activeMs === 0 && d.idleMs === 0);
  const maxMs = Math.max(...data.map((d) => Math.max(d.activeMs, d.idleMs)), 0);
  return (
    <ChartFrame height={height} isEmpty={isEmpty} emptyVariant={emptyVariant}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gIdle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-idle)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-idle)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRID} />
        <XAxis
          dataKey="date"
          {...AXIS}
          tickFormatter={(v: string) => formatDate(v)}
          minTickGap={24}
        />
        <YAxis
          {...AXIS}
          width={48}
          tickFormatter={durationTicks(maxMs)}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ stroke: "#cbd5e1" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipShell
                title={formatDate(String(label))}
                rows={[
                  {
                    label: "Agent active",
                    value: formatDuration(Number(payload[0]?.payload.activeMs)),
                    color: "var(--chart-1)",
                  },
                  {
                    label: "Idle in session",
                    value: formatDuration(Number(payload[0]?.payload.idleMs)),
                    color: "var(--chart-idle)",
                  },
                  {
                    label: "Sessions",
                    value: String(payload[0]?.payload.sessions ?? 0),
                  },
                ]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="idleMs"
          stroke="var(--chart-idle)"
          strokeWidth={1.5}
          fill="url(#gIdle)"
          name="Idle"
        />
        <Area
          type="monotone"
          dataKey="activeMs"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#gActive)"
          name="Agent active"
        />
      </AreaChart>
    </ChartFrame>
  );
}
