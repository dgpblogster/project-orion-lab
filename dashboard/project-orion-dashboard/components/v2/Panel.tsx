/** Card shell used by every panel in the redesigned dashboard. */
export function Panel({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`rise bg-surface rounded-2xl border border-border shadow-card ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-text-primary tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/**
 * The agent question this panel answers. Lets attendees match what they see
 * on screen to what the agent is asked. Set SHOW_QUESTIONS to false to hide.
 */
export const SHOW_QUESTIONS = true;

export function QuestionTag({ text }: { text: string }) {
  if (!SHOW_QUESTIONS) return null;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand">
      <span aria-hidden>💬</span>
      <span>“{text}”</span>
    </div>
  );
}
