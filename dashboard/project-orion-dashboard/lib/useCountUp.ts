"use client";

import { useEffect, useState } from "react";

/**
 * Animates a number from 0 to `target` once (ease-out). Re-polling with the
 * same value does not replay the animation.
 */
export function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** SQL DATE values arrive as UTC midnight; format in UTC so the day never shifts. */
export function formatSqlDate(value: string, withYear = true): string {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}
