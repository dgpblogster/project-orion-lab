/**
 * CriticalFlyout
 *
 * Slide-in panel listing every open critical item: owner, status, points,
 * days open, notes and a link to the GitHub issue. Opened from the critical
 * blockers tile or the "Details" link. Esc or the backdrop closes it.
 */

"use client";

import { useEffect, useState } from "react";
import { formatSqlDate } from "@/lib/useCountUp";

interface CriticalItem {
  WorkItemId: number;
  Title: string;
  Type: string;
  Status: string;
  AssignedTo: string | null;
  StoryPoints: number | null;
  GitHubIssueRef: string | null;
  CreatedDate: string;
  DaysOpen: number;
  Notes: string | null;
}

export function CriticalFlyout({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [items, setItems] = useState<CriticalItem[]>([]);
  const [repo, setRepo] = useState("dgpblogster/project-orion");

  useEffect(() => {
    if (!open) return;
    fetch("/api/critical", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items ?? []);
        if (d.repo) setRepo(d.repo);
      })
      .catch(() => setItems([]));
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-text-primary/20 backdrop-blur-[2px] transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        role="dialog"
        aria-label="Critical blockers"
        className={`absolute right-0 top-0 h-full w-full max-w-[560px] bg-surface shadow-2xl border-l border-border flex flex-col
          transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="flex items-start justify-between gap-4 p-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-red" />
              <h2 className="text-xl font-semibold">Critical blockers</h2>
            </div>
            <p className="text-sm text-text-muted mt-1">
              {items.length} open in the active sprint. Each one maps to a GitHub issue.
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg border border-border text-text-muted hover:text-text-primary" aria-label="Close">
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.map((it) => {
            const num = it.GitHubIssueRef?.replace("#", "");
            return (
              <article key={it.WorkItemId} className="rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[17px] font-semibold leading-snug">{it.Title.replace(/^(Bug|Task|Story):\s*/i, "")}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      it.Status === "Blocked" ? "bg-accent-red/10 text-accent-red" : "bg-accent-yellow/10 text-accent-yellow"
                    }`}
                  >
                    {it.Status}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-text-muted text-xs">Owner</dt><dd className="font-medium">{it.AssignedTo ?? "Unassigned"}</dd></div>
                  <div><dt className="text-text-muted text-xs">Points</dt><dd className="font-medium">{it.StoryPoints ?? "-"}</dd></div>
                  <div><dt className="text-text-muted text-xs">Open</dt><dd className="font-medium">{it.DaysOpen} days</dd></div>
                </dl>
                {it.Notes && <p className="mt-3 text-sm text-text-muted leading-relaxed">{it.Notes}</p>}
                <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                  <span>Opened {formatSqlDate(it.CreatedDate)}</span>
                  {num && (
                    <a href={`https://github.com/${repo}/issues/${num}`} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:underline">
                      GitHub {it.GitHubIssueRef} ↗
                    </a>
                  )}
                </div>
              </article>
            );
          })}
          {items.length === 0 && <p className="text-text-muted">No open critical items.</p>}
        </div>
      </aside>
    </div>
  );
}
