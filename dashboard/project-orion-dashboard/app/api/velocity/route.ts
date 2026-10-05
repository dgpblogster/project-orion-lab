/**
 * Velocity API Route
 *
 * Returns sprint history data for the velocity chart.
 * Shows all sprints ordered by SprintId for trend visualization.
 *
 * GET /api/velocity
 * Response: { sprints: SprintVelocity[] }
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

// Velocity data shape for chart display
interface SprintVelocity {
  SprintId: number;
  SprintName: string;
  TeamVelocity: number;
  Status: "Completed" | "Active";
  CompletedPoints: number;
  PlannedPoints: number;
}

export async function GET() {
  try {
    // Fetch all sprints for velocity trend chart
    const result = await executeQuery<SprintVelocity>(`
      SELECT 
        SprintId,
        SprintName,
        TeamVelocity,
        Status,
        CompletedPoints,
        PlannedPoints
      FROM Sprints
      ORDER BY SprintId ASC
    `);

    return NextResponse.json(
      { sprints: result.recordset },
      {
        status: 200,
        headers: {
          // Enable 30-second revalidation for live updates
          "Cache-Control": "s-maxage=30, stale-while-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching velocity data:", error);
    return NextResponse.json(
      { error: "Failed to fetch velocity data", sprints: [] },
      { status: 500 }
    );
  }
}
