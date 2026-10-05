/**
 * StatusBadge Component
 *
 * A reusable status indicator pill that displays a label with
 * color-coded backgrounds based on status type.
 *
 * Used for: Overall health status, velocity trends, sprint status
 */

interface StatusBadgeProps {
  /** The label text to display */
  label: string;
  /** The status determines the badge color */
  status: "healthy" | "warning" | "critical" | "neutral" | "active";
  /** Optional: smaller size variant */
  size?: "sm" | "md";
}

export function StatusBadge({
  label,
  status,
  size = "md",
}: StatusBadgeProps) {
  // Map status to Tailwind color classes
  const statusColors: Record<string, string> = {
    healthy: "bg-accent-green/20 text-accent-green border-accent-green/30",
    warning: "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30",
    critical: "bg-accent-red/20 text-accent-red border-accent-red/30",
    neutral: "bg-accent-blue/20 text-accent-blue border-accent-blue/30",
    active: "bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30",
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border
        ${statusColors[status]}
        ${sizeClasses}
      `}
    >
      {label}
    </span>
  );
}
