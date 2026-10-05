/**
 * ForecastPanel
 *
 * Shows the answer from the MCP server's get_release_forecast tool. Locked
 * until the forecast switch is flipped, because the dashboard calls the same
 * server-side tool the agent does.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, PanelTitle, QuestionTag } from "./Panel";
import { formatSqlDate } from "@/lib/useCountUp";

interface Forecast {
  releaseName: string;
  targetDate: string;
  remainingPoints: number;
  sprintsRemaining: number;
  currentVelocity: number;
  avg3Velocity: number;
  projectedPointsAtCurrentPace: number;
  shortfallPoints: number;
  requiredVelocity: number | null;
  projectedFinishDateAtCurrentPace: string | null;
  onTrack: boolean;
}

const REFRESH_EVENT = "orion:tools-refresh";

function PaceBar({ label, value, max, color, emphasis = false }: { label: string; value: number; max: number; color: string; emphasis?: boolean }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(Math.min(100, (value / max) * 100)), 50);
    return () => clearTimeout(t);
  }, [value, max]);
  return (
    <div className="flex items-center gap-3">
      <span className={`w-28 text-sm ${emphasis ? "font-semibold text-text-primary" : "text-text-muted"}`}>{label}</span>
      <div className="flex-1 h-3 rounded-full bg-background overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color, transition: "width 1.1s cubic-bezier(0.2,0.7,0.2,1)" }} />
      </div>
      <span className="w-20 text-right text-sm font-semibold tabular-nums text-text-primary">{value} pts</span>
    </div>
  );
}

export function ForecastPanel({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  const [state, setState] = useState<{ online: boolean; available: boolean; forecast?: Forecast } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp-forecast", { cache: "no-store" });
      setState(await res.json());
    } catch {
      setState({ online: false, available: false });
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onRefresh = () => setTimeout(load, 500);
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [load]);

  const f = state?.forecast;
  const daysLate =
    f?.projectedFinishDateAtCurrentPace
      ? Math.round((Date.parse(f.projectedFinishDateAtCurrentPace) - Date.parse(f.targetDate)) / 86_400_000)
      : null;
  const max = f ? Math.max(f.requiredVelocity ?? 0, f.avg3Velocity, f.currentVelocity, 45) * 1.1 : 50;

  return (
    <Panel className={`p-6 flex flex-col ${className}`} delay={delay}>
      <PanelTitle title="Release forecast" subtitle={f ? `${f.releaseName} · target ${formatSqlDate(f.targetDate)}` : "From the MCP server"} />
      <div className="mt-3"><QuestionTag text="At our current pace, will we make the release?" /></div>

      {!state || !state.available || !f ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="h-14 w-14 rounded-2xl bg-background border border-border grid place-items-center text-2xl" aria-hidden>🔒</div>
          <p className="mt-4 font-semibold text-text-primary">
            {state && !state.online ? "MCP server offline" : "No forecast tool on the MCP server"}
          </p>
          <p className="text-sm text-text-muted mt-1 max-w-xs">
            {state && !state.online
              ? "Start the MCP server to load the forecast."
              : "Deploy get_release_forecast with the switch above. Nothing changes in the agent."}
          </p>
        </div>
      ) : (
        <div className="mt-5 flex-1 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${f.onTrack ? "bg-accent-green/10 text-accent-green" : "bg-accent-red/10 text-accent-red"}`}>
              {f.onTrack ? "On track" : "Not on track"}
            </span>
            {!f.onTrack && (
              <span className="text-sm text-text-muted">
                <b className="text-text-primary">{f.shortfallPoints} pts short</b> across {f.sprintsRemaining} sprints
              </span>
            )}
          </div>

          <div className="space-y-3">
            <PaceBar label="Current pace" value={f.currentVelocity} max={max} color="#DC2626" />
            <PaceBar label="3-sprint avg" value={f.avg3Velocity} max={max} color="#D97706" />
            {f.requiredVelocity !== null && <PaceBar label="Needed" value={f.requiredVelocity} max={max} color="#059669" emphasis />}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-auto">
            <div className="rounded-xl bg-background p-3">
              <div className="text-xs text-text-muted">Remaining</div>
              <div className="text-xl font-semibold tabular-nums">{f.remainingPoints} pts</div>
            </div>
            <div className="rounded-xl bg-background p-3">
              <div className="text-xs text-text-muted">Sprints left</div>
              <div className="text-xl font-semibold tabular-nums">{f.sprintsRemaining}</div>
            </div>
            <div className="rounded-xl bg-background p-3">
              <div className="text-xs text-text-muted">Finish at pace</div>
              <div className="text-xl font-semibold tabular-nums">
                {f.projectedFinishDateAtCurrentPace ? formatSqlDate(f.projectedFinishDateAtCurrentPace, false) : "n/a"}
              </div>
              {daysLate !== null && daysLate > 0 && <div className="text-xs font-medium text-accent-red">{daysLate} days late</div>}
            </div>
          </div>
          <p className="text-xs text-text-muted">Answered by <span className="font-mono">get_release_forecast</span> on the MCP server.</p>
        </div>
      )}
    </Panel>
  );
}
