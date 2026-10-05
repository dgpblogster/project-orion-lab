/** Team velocity by sprint, with the active sprint shown as points so far. */

"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Panel, PanelTitle, QuestionTag } from "./Panel";

export interface SprintVelocity {
  SprintId: number;
  SprintName: string;
  TeamVelocity: number;
  Status: "Completed" | "Active";
  CompletedPoints: number;
  PlannedPoints: number;
}

export function VelocityPanel({ sprints, className = "", delay = 0 }: { sprints: SprintVelocity[]; className?: string; delay?: number }) {
  const data = sprints.map((s, i) => {
    const value = s.Status === "Active" ? s.CompletedPoints : Number(s.TeamVelocity);
    const window = sprints.slice(Math.max(0, i - 2), i + 1).filter((x) => x.Status === "Completed");
    const trend = s.Status === "Completed" && window.length ? Math.round(window.reduce((a, x) => a + Number(x.TeamVelocity), 0) / window.length) : null;
    return { name: s.SprintName.replace("Sprint ", "S"), value, active: s.Status === "Active", trend };
  });
  const peak = Math.max(...sprints.filter((s) => s.Status === "Completed").map((s) => Number(s.TeamVelocity)), 0);

  return (
    <Panel className={`p-6 ${className}`} delay={delay}>
      <PanelTitle title="Team velocity" subtitle={peak ? `Peak ${peak} pts, declining since Sprint 3` : undefined} />
      <div className="mt-3"><QuestionTag text="Any patterns across issues and sprint health?" /></div>
      <div className="h-[230px] mt-3 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E3E7EF" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: "#5B6578", fontSize: 13 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#5B6578", fontSize: 13 }} tickLine={false} axisLine={false} width={32} domain={[0, 50]} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #E3E7EF" }}
              formatter={(v: number, _n, p: any) => [`${v} pts${p.payload.active ? " so far" : ""}`, p.payload.active ? "Active sprint" : "Velocity"]}
            />
            <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={44} animationDuration={1100}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.active ? "#FCD9A8" : "#4338CA"} stroke={d.active ? "#D97706" : undefined} strokeDasharray={d.active ? "4 3" : undefined} />
              ))}
              <LabelList dataKey="value" position="top" fill="#0B1324" fontSize={13} fontWeight={600} />
            </Bar>
            <Line type="monotone" dataKey="trend" stroke="#DC2626" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-5 text-sm text-text-muted mt-2">
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-brand" />Completed</span>
        <span className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-dashed border-accent-yellow bg-[#FCD9A8]" />Active, so far</span>
        <span className="flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-accent-red" />3-sprint trend</span>
      </div>
    </Panel>
  );
}
