"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS, ChartFrame, GRID, TooltipShell } from "./ChartFrame";
import { formatDate, formatNumber } from "@/lib/format";

/** Daily file creates, edits, and deletes observed from connected agents. */
export function ChangeTrendChart({
  data,
  height = 260,
}: {
  data: { date: string; fileChanges: number }[];
  height?: number;
}) {
  const hasChanges = data.some((d) => d.fileChanges > 0);
  const max = Math.max(...data.map((d) => d.fileChanges), 0);
  return (
    <ChartFrame
      height={height}
      isEmpty={!hasChanges}
      emptyTitle="No file changes in this period"
      emptyBody="Creates, edits, and deletes from Cursor and Claude Code appear here once the connector reports them."
    >
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gChanges" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
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
          width={36}
          allowDecimals={false}
          tickFormatter={(v: number) => formatNumber(v)}
        />
        <Tooltip
          cursor={{ stroke: "var(--chart-grid)" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipShell
                title={formatDate(String(label))}
                rows={[
                  {
                    label: "File changes",
                    value: formatNumber(Number(payload[0]?.payload.fileChanges ?? 0)),
                    color: "var(--chart-2)",
                  },
                ]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="fileChanges"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#gChanges)"
          dot={max > 0 && data.length < 16}
        />
      </AreaChart>
    </ChartFrame>
  );
}
