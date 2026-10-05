/**
 * Project Orion Dashboard (light redesign)
 *
 * Laid out to follow the questions asked of the agents on stage, so the
 * audience can see each answer as the agent gives it:
 *
 *   MCP server tools strip      the tools the server offers right now
 *   Readiness hero + KPIs       "What is the current release readiness score?"
 *                               "What critical bugs are open?" (click for details)
 *   Blockers | Velocity | Forecast
 *                               "What is blocking the release?"
 *                               "Any patterns across issues and sprint health?"
 *                               "At our current pace, will we make the release?"
 */

"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { ForecastToolToggle } from "@/components/ForecastToolToggle";
import { ToolsStrip } from "@/components/v2/ToolsStrip";
import { ReadinessHero, HealthPoint } from "@/components/v2/ReadinessHero";
import { KpiTile, ProgressRing } from "@/components/v2/KpiTile";
import { VelocityPanel, SprintVelocity } from "@/components/v2/VelocityPanel";
import { BlockersPanel, BugPriority, StalledItem } from "@/components/v2/BlockersPanel";
import { ForecastPanel } from "@/components/v2/ForecastPanel";
import { CriticalFlyout } from "@/components/v2/CriticalFlyout";
import { formatSqlDate } from "@/lib/useCountUp";

interface Sprint {
  SprintName: string;
  StartDate: string;
  EndDate: string;
  PlannedPoints: number;
  CompletedPoints: number;
}

interface Release {
  ReleaseName: string;
  TargetDate: string;
  DaysRemaining: number;
}

interface DashboardData {
  health: HealthPoint[];
  sprint: Sprint | null;
  velocity: SprintVelocity[];
  bugs: BugPriority[];
  stalled: StalledItem[];
  release: Release | null;
}

const getJson = (url: string) => fetch(url, { cache: "no-store" }).then((r) => r.json());

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [health, sprint, velocity, bugs, stalled, release] = await Promise.all([
          getJson("/api/health"),
          getJson("/api/sprint"),
          getJson("/api/velocity"),
          getJson("/api/bugs"),
          getJson("/api/stalled"),
          getJson("/api/release"),
        ]);
        setData({
          health: health.metrics ?? [],
          sprint: sprint.sprint ?? null,
          velocity: velocity.sprints ?? [],
          bugs: bugs.bugs ?? [],
          stalled: stalled.items ?? [],
          release: release.release ?? null,
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const latest = data?.health[0];
  const score = latest?.ReleaseReadinessScore ?? 0;
  const status =
    score >= 75 ? { label: "Healthy", s: "healthy" as const } : score >= 50 ? { label: "At Risk", s: "warning" as const } : { label: "Critical", s: "critical" as const };

  const critical = data?.bugs.find((b) => b.Priority === "Critical");
  const criticalCount = critical?.Count ?? 0;
  const criticalRefs = (critical?.TopIssues ?? "").match(/#\d+/g) ?? [];

  const sprint = data?.sprint;
  const completion = sprint && sprint.PlannedPoints > 0 ? Math.round((sprint.CompletedPoints / sprint.PlannedPoints) * 100) : 0;

  const completed = (data?.velocity ?? []).filter((s) => s.Status === "Completed");
  const currentVelocity = completed.length ? Number(completed[completed.length - 1].TeamVelocity) : 0;
  const peakVelocity = completed.length ? Math.max(...completed.map((s) => Number(s.TeamVelocity))) : 0;

  return (
    <div className="min-h-screen px-8 py-6 max-w-[1840px] mx-auto">
      {/* Header */}
      <header className="rise flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-brand text-white grid place-items-center text-xl font-semibold shadow-card">O</div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Project Orion</h1>
            <p className="text-text-muted">
              Release health
              {data?.release && (
                <>
                  {" · "}
                  {data.release.ReleaseName} target {formatSqlDate(data.release.TargetDate)}
                  {" · "}
                  <span className="font-semibold text-accent-yellow">{data.release.DaysRemaining} days left</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-green" />
            </span>
            {latest ? <>Data as of {formatSqlDate(latest.RecordedDate)}</> : "Connecting…"}
          </div>
          {latest && <StatusBadge label={status.label} status={status.s} />}
          <ForecastToolToggle />
        </div>
      </header>

      {/* Tools the MCP server offers right now */}
      <div className="mt-5">
        <ToolsStrip />
      </div>

      {/* Readiness hero + KPIs */}
      <div className="mt-5 grid grid-cols-12 gap-5">
        <ReadinessHero metrics={data?.health ?? []} className="col-span-12 xl:col-span-8" />
        <div className="col-span-12 xl:col-span-4 grid gap-5">
          <KpiTile
            label="Critical blockers"
            value={criticalCount}
            tone="red"
            pulse={criticalCount > 0}
            sub={criticalRefs.length ? criticalRefs.join(" · ") : "None open"}
            question="What critical bugs are open?"
            actionHint="View details"
            onClick={() => setFlyoutOpen(true)}
            delay={220}
          />
          <KpiTile
            label={sprint ? `${sprint.SprintName} completion` : "Sprint completion"}
            value={completion}
            suffix="%"
            tone="amber"
            sub={sprint ? `${sprint.CompletedPoints} of ${sprint.PlannedPoints} pts · ends ${formatSqlDate(sprint.EndDate, false)}` : undefined}
            visual={<ProgressRing percent={completion} color="#D97706" />}
            delay={280}
          />
          <KpiTile
            label="Velocity, last sprint"
            value={currentVelocity}
            suffix="pts"
            tone="amber"
            sub={peakVelocity ? `Down from a ${peakVelocity} pt peak` : undefined}
            delay={340}
          />
        </div>
      </div>

      {/* Blockers | Velocity | Forecast */}
      <div className="mt-5 grid grid-cols-12 gap-5">
        <BlockersPanel
          bugs={data?.bugs ?? []}
          stalled={data?.stalled ?? []}
          onOpenCritical={() => setFlyoutOpen(true)}
          className="col-span-12 lg:col-span-6 xl:col-span-4"
          delay={400}
        />
        <VelocityPanel sprints={data?.velocity ?? []} className="col-span-12 lg:col-span-6 xl:col-span-4" delay={460} />
        <ForecastPanel className="col-span-12 xl:col-span-4" delay={520} />
      </div>

      <div className="fixed bottom-3 right-4 text-xs font-mono text-text-muted/60">Project Orion Demo</div>

      <CriticalFlyout open={flyoutOpen} onClose={() => setFlyoutOpen(false)} />
    </div>
  );
}
