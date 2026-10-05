/**
 * ReadinessHero
 *
 * The hero panel: today's release readiness score (counts up on load) over a
 * trend line of every daily snapshot, with the Healthy (75) and At Risk (50)
 * thresholds drawn in.
 */

"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Panel, PanelTitle, QuestionTag } from "./Panel";
import { formatSqlDate, useCountUp } from "@/lib/useCountUp";

export interface HealthPoint {
  RecordedDate: string;
  ReleaseReadinessScore: number;
  BlockerCount: number;
  BugCriticalCount: number;
  VelocityTrend: string;
}

const scoreColor = (s: number) => (s >= 75 ? "#059669" : s >= 50 ? "#D97706" : "#DC2626");
const scoreMessage = (s: number) =>
  s >= 75 ? "Release tracking well" : s >= 50 ? "Release at risk. Action required." : "Release in jeopardy.";

export function ReadinessHero({ metrics, className = "" }: { metrics: HealthPoint[]; className?: string }) {
  // API returns newest first; chart reads oldest to newest
  const series = [...metrics].reverse().map((m) => ({
    date: formatSqlDate(m.RecordedDate, false),
    score: m.ReleaseReadinessScore,
  }));
  const latest = metrics[0]?.ReleaseReadinessScore ?? 0;
  const first = series[0]?.score ?? latest;
  const delta = latest - first;
  const shown = useCountUp(latest);
  const color = scoreColor(latest);

  return (
    <Panel className={`p-6 ${className}`} delay={160}>
      <PanelTitle
        title="Release readiness"
        subtitle={series.length ? `Daily snapshots since ${series[0].date}` : undefined}
        right={
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
              <span className="text-6xl font-semibold tabular-nums tracking-tight" style={{ color }}>
                {shown}
              </span>
              <span className="text-xl text-text-muted">/100</span>
            </div>
            <p className="text-sm font-medium mt-1" style={{ color }}>
              {scoreMessage(latest)}
            </p>
            {series.length > 1 && (
              <p className="text-sm text-text-muted mt-0.5">
                {delta < 0 ? "Down" : "Up"} {Math.abs(delta)} points since {series[0].date}
              </p>
            )}
          </div>
        }
      />
      <div className="-mt-6"><QuestionTag text="What is the current release readiness score?" /></div>
      <div className="h-[250px] mt-3 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E3E7EF" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#5B6578", fontSize: 13 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis domain={[30, 100]} ticks={[50, 75, 100]} tick={{ fill: "#5B6578", fontSize: 13 }} tickLine={false} axisLine={false} width={36} />
            <ReferenceLine y={75} stroke="#059669" strokeDasharray="4 4" label={{ value: "Healthy", position: "insideTopLeft", fill: "#059669", fontSize: 12 }} />
            <ReferenceLine y={50} stroke="#DC2626" strokeDasharray="4 4" label={{ value: "At risk", position: "insideBottomLeft", fill: "#DC2626", fontSize: 12 }} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #E3E7EF", boxShadow: "0 8px 24px -12px rgba(16,24,40,.2)" }}
              formatter={(v: number) => [`${v}/100`, "Readiness"]}
            />
            <Area type="monotone" dataKey="score" stroke={color} strokeWidth={3} fill="url(#readinessFill)" animationDuration={1400} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
