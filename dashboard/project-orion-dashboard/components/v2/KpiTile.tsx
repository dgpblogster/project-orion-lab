/** Compact KPI tile: big animated number, label, supporting line, optional visual. */

"use client";

import { Panel, QuestionTag } from "./Panel";
import { useCountUp } from "@/lib/useCountUp";

const tones = {
  red: { text: "text-accent-red", soft: "bg-accent-red/10" },
  amber: { text: "text-accent-yellow", soft: "bg-accent-yellow/10" },
  green: { text: "text-accent-green", soft: "bg-accent-green/10" },
  brand: { text: "text-brand", soft: "bg-brand-soft" },
};

export function KpiTile({
  label,
  value,
  suffix,
  sub,
  tone = "brand",
  pulse = false,
  visual,
  onClick,
  actionHint,
  question,
  delay = 0,
}: {
  label: string;
  value: number;
  suffix?: string;
  sub?: React.ReactNode;
  tone?: keyof typeof tones;
  pulse?: boolean;
  visual?: React.ReactNode;
  onClick?: () => void;
  actionHint?: string;
  question?: string;
  delay?: number;
}) {
  const shown = useCountUp(value, 1000);
  const t = tones[tone];
  const body = (
    <div className="flex items-center justify-between gap-4 w-full">
      <div className="text-left">
        <div className="flex items-center gap-2">
          {pulse && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-red" />
            </span>
          )}
          <span className="text-sm font-medium text-text-muted">{label}</span>
        </div>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className={`text-4xl font-semibold tabular-nums tracking-tight ${t.text}`}>{shown}</span>
          {suffix && <span className="text-base text-text-muted">{suffix}</span>}
        </div>
        {sub && <div className="text-sm text-text-muted mt-1">{sub}</div>}
        {question && <div className="mt-2"><QuestionTag text={question} /></div>}
        {actionHint && <div className={`text-xs font-semibold mt-2 ${t.text}`}>{actionHint} →</div>}
      </div>
      {visual && <div className="shrink-0">{visual}</div>}
    </div>
  );

  return (
    <Panel className={`p-5 ${onClick ? "transition hover:-translate-y-0.5 hover:shadow-lg" : ""}`} delay={delay}>
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg">
          {body}
        </button>
      ) : (
        body
      )}
    </Panel>
  );
}

/** Animated completion ring (fills on mount). */
export function ProgressRing({ percent, color = "#4338CA", size = 76 }: { percent: number; color?: string; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#E3E7EF" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.2,0.7,0.2,1)" }}
      />
    </svg>
  );
}
