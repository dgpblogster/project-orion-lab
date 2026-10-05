/**
 * Release API Route
 *
 * Returns the release target from the ReleasePlan table and the number of
 * days left until the target date (counted from today).
 *
 * GET /api/release
 * Response: { release: { ReleaseName, TargetDate, TotalScopePoints, DaysRemaining } | null }
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Release {
  ReleaseName: string;
  TargetDate: Date;
  TotalScopePoints: number;
  DaysRemaining: number;
}

export async function GET() {
  try {
    const result = await executeQuery<Release>(`
      SELECT TOP 1
        ReleaseName,
        TargetDate,
        TotalScopePoints,
        DATEDIFF(day, CAST(GETDATE() AS DATE), TargetDate) AS DaysRemaining
      FROM ReleasePlan
      ORDER BY ReleaseId
    `);

    return NextResponse.json({ release: result.recordset[0] || null });
  } catch (error) {
    console.error("Error fetching release plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch release plan", release: null },
      { status: 500 }
    );
  }
}
