/**
 * Health Metrics API Route
 *
 * Returns the latest health metrics for release readiness tracking.
 * Includes trend data from the last 30 days.
 *
 * GET /api/health
 * Response: { metrics: HealthMetric[] }
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

// Health metric data shape
interface HealthMetric {
  RecordedDate: Date;
  ReleaseReadinessScore: number;
  BugCriticalCount: number;
  BlockerCount: number;
  VelocityTrend: "Rising" | "Stable" | "Declining";
}

export async function GET() {
  try {
    // Fetch the last 30 days of health metrics
    const result = await executeQuery<HealthMetric>(`
      SELECT TOP 30
        RecordedDate,
        ReleaseReadinessScore,
        BugCriticalCount,
        BlockerCount,
        VelocityTrend
      FROM HealthMetrics
      ORDER BY RecordedDate DESC
    `);

    return NextResponse.json(
      { metrics: result.recordset },
      {
        status: 200,
        headers: {
          // Enable 30-second revalidation for live updates
          "Cache-Control": "s-maxage=30, stale-while-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching health metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch health metrics", metrics: [] },
      { status: 500 }
    );
  }
}
