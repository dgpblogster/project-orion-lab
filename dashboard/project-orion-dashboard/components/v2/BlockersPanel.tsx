/** What is blocking the release: open critical/high bugs plus stalled work. */

"use client";

import { Panel, PanelTitle, QuestionTag } from "./Panel";

export interface BugPriority {
  Priority: "Critical" | "High" | "Medium" | "Low";
  Count: number;
  TopIssues: string | null;
}

export interface StalledItem {
  Title: string;
  GitHubIssueRef: string | null;
  AssignedTo: string | null;
  Notes: string | null;
}

/** "Bug: auth token refresh fails under load (#25)" -> { title, ref } */
function splitIssue(raw: string) {
  const m = raw.match(/^(.*?)(?:\s*\((#\d+)\))?$/);
  const title = (m?.[1] ?? raw).replace(/^(Bug|Task|Story):\s*/i, "");
  return { title, ref: m?.[2] ?? null };
}

export function BlockersPanel({
  bugs,
  stalled,
  onOpenCritical,
  className = "",
  delay = 0,
}: {
  bugs: BugPriority[];
  stalled: StalledItem[];
  onOpenCritical: () => void;
  className?: string;
  delay?: number;
}) {
  const rows = (["Critical", "High"] as const).flatMap((p) => {
    const entry = bugs.find((b) => b.Priority === p);
    return (entry?.TopIssues ?? "").split("|").filter(Boolean).map((raw) => ({ priority: p, ...splitIssue(raw) }));
  });

  return (
    <Panel className={`p-6 flex flex-col ${className}`} delay={delay}>
      <PanelTitle
        title="What is blocking the release"
        subtitle="Open critical and high bugs, active sprint"
        right={
          <button type="button" onClick={onOpenCritical} className="text-sm font-semibold text-brand hover:underline shrink-0">
            Details →
          </button>
        }
      />
      <div className="mt-3"><QuestionTag text="What is blocking the release?" /></div>

      <ul className="mt-4 space-y-2">
        {rows.slice(0, 5).map((r, i) => (
          <li key={i} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${r.priority === "Critical" ? "bg-accent-red" : "bg-accent-yellow"}`} />
            <span className="flex-1 text-[15px] text-text-primary truncate">{r.title}</span>
            {r.ref && <span className="font-mono text-xs text-text-muted">{r.ref}</span>}
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-accent-green font-medium">No open critical or high bugs</li>}
      </ul>

      {stalled.length > 0 && (
        <div className="mt-auto pt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Stalled work</div>
          {stalled.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-accent-yellow/10 px-3 py-2.5">
              <span aria-hidden>⏸</span>
              <span className="flex-1 text-[15px] text-text-primary truncate">{s.Title}</span>
              {s.GitHubIssueRef && <span className="font-mono text-xs text-text-muted">{s.GitHubIssueRef}</span>}
              <span className="rounded-full bg-accent-yellow/20 px-2 py-0.5 text-xs font-semibold text-accent-yellow">12+ days</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
