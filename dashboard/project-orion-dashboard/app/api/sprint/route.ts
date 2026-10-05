/**
 * Sprint API Route
 *
 * Returns the current active sprint data from the Sprints table.
 * Used by the Sprint Health panel to display completion progress.
 *
 * GET /api/sprint
 * Response: { sprint: Sprint | null }
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

// Sprint data shape from the database
interface Sprint {
  SprintId: number;
  SprintName: string;
  StartDate: Date;
  EndDate: Date;
  Status: "Completed" | "Active";
  PlannedPoints: number;
  CompletedPoints: number;
  RolloverPoints: number;
  TeamVelocity: number;
  Notes: string | null;
}

export async function GET() {
  try {
    // Fetch the currently active sprint
    const result = await executeQuery<Sprint>(`
      SELECT TOP 1 
        SprintId,
        SprintName,
        StartDate,
        EndDate,
        Status,
        PlannedPoints,
        CompletedPoints,
        RolloverPoints,
        TeamVelocity,
        Notes
      FROM Sprints 
      WHERE Status = 'Active'
    `);

    const sprint = result.recordset[0] || null;

    return NextResponse.json(
      { sprint },
      {
        status: 200,
        headers: {
          // Enable 30-second revalidation for live updates
          "Cache-Control": "s-maxage=30, stale-while-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching sprint data:", error);
    return NextResponse.json(
      { error: "Failed to fetch sprint data", sprint: null },
      { status: 500 }
    );
  }
}
