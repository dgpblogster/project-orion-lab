/**
 * ToolsStrip
 *
 * Shows the tools the Project Orion MCP server is offering right now, read
 * live from the server. When the forecast switch is flipped, the new tool
 * animates in. Refreshes when the switch fires "orion:tools-refresh", and
 * every 30 seconds otherwise (kept slow so the MCP terminal stays readable).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const REFRESH_EVENT = "orion:tools-refresh";

export function ToolsStrip() {
  const [tools, setTools] = useState<string[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp-tools", { cache: "no-store" });
      const data = await res.json();
      setOnline(Boolean(data.online));
      if (!data.online) return;
      const names: string[] = data.tools;

      // First load: no highlight. Later loads: highlight anything new.
      if (known.current) {
        const added = names.filter((n) => !known.current!.has(n));
        if (added.length) {
          setFresh(new Set(added));
          setTimeout(() => setFresh(new Set()), 8000);
        }
      }
      known.current = new Set(names);
      setTools(names);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    const onRefresh = () => setTimeout(load, 400);
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [load]);

  return (
    <div className="rise flex items-center gap-4 rounded-2xl border border-border bg-surface px-5 py-3 shadow-card" style={{ animationDelay: "80ms" }}>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-accent-green" : online === false ? "bg-accent-red" : "bg-border"}`} />
        <span className="text-sm font-semibold text-text-primary">MCP server</span>
        <span className="text-sm text-text-muted">
          {online === false ? "offline" : `${tools.length} tools`}
        </span>
      </div>
      <div className="h-6 w-px bg-border shrink-0" />
      <div className="flex flex-wrap gap-2">
        {tools.map((name) => {
          const isNew = fresh.has(name);
          return (
            <span
              key={name}
              className={`font-mono text-[13px] px-2.5 py-1 rounded-lg border ${
                isNew
                  ? "chip-new border-accent-green/40 bg-accent-green/10 text-accent-green font-semibold"
                  : "border-border bg-background text-text-muted"
              }`}
            >
              {name}
              {isNew && <span className="ml-2 text-[11px] uppercase tracking-wider">new</span>}
            </span>
          );
        })}
        {online === false && (
          <span className="text-sm text-text-muted">Start the MCP server to see its tools.</span>
        )}
      </div>
    </div>
  );
}

/** Ask the strip to re-read the tool list (called after the switch flips). */
export function requestToolsRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}
