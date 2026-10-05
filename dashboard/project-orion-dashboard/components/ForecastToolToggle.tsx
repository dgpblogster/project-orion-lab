/**
 * ForecastToolToggle Component
 *
 * Header switch that "deploys" the MCP server's get_release_forecast tool.
 * Flipping it writes FeatureFlags.ForecastToolEnabled in SQL. The MCP server
 * reads that flag on every request, so the Copilot Studio agent picks up the
 * new tool without anyone touching the agent.
 */

"use client";

import { useEffect, useState } from "react";
import { requestToolsRefresh } from "./v2/ToolsStrip";

export function ForecastToolToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  // Read the current flag state on load
  useEffect(() => {
    fetch("/api/flags", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setEnabled(Boolean(data.forecastToolEnabled)))
      .catch(() => setError(true));
  }, []);

  async function toggle() {
    if (enabled === null || saving) return;
    const next = !enabled;
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forecastToolEnabled: next }),
      });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setEnabled(Boolean(data.forecastToolEnabled));
      requestToolsRefresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  const on = enabled === true;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      disabled={enabled === null || saving}
      className={`flex items-center gap-3 min-h-[44px] px-4 rounded-xl border transition-colors
        ${on ? "border-accent-green/40 bg-accent-green/10" : "border-border bg-surface"}
        disabled:opacity-60`}
    >
      <span className="text-text-primary text-sm font-medium">MCP forecast tool</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${on ? "bg-accent-green" : "bg-border"}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform
            ${on ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </span>
      <span className={`text-sm font-semibold w-20 text-left ${on ? "text-accent-green" : "text-text-muted"}`}>
        {error ? "Error" : saving ? "Saving" : enabled === null ? "…" : on ? "Deployed" : "Off"}
      </span>
    </button>
  );
}
