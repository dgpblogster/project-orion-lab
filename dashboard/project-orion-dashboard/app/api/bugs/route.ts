/**
 * Bugs API Route
 *
 * Returns open bug counts grouped by priority for the current active sprint.
 * Also includes a list of critical/high priority issues for display.
 *
 * GET /api/bugs
 * Response: { bugs: BugPriority[] }
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

// Bug count data by priority
interface BugPriority {
  Priority: "Critical" | "High" | "Medium" | "Low";
  Count: number;
  TopIssues: string | null; // Pipe-separated list of critical/high bugs
}

export async function GET() {
  try {
    // Fetch open bugs grouped by priority for the active sprint
    const result = await executeQuery<BugPriority>(`
      SELECT
        wi.Priority,
        COUNT(*) AS Count,
        STRING_AGG(
          CASE WHEN wi.Priority IN ('Critical','High')
          THEN wi.Title + ISNULL(' (' + wi.GitHubIssueRef + ')','')
          END, '|'
        ) AS TopIssues
      FROM WorkItems wi
      JOIN Sprints s ON wi.SprintId = s.SprintId
      WHERE s.Status = 'Active'
        AND wi.Type = 'Bug'
        AND wi.Status NOT IN ('Resolved','Closed')
      GROUP BY wi.Priority
    `);

    return NextResponse.json(
      { bugs: result.recordset },
      {
        status: 200,
        headers: {
          // Enable 30-second revalidation for live updates
          "Cache-Control": "s-maxage=30, stale-while-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching bug data:", error);
    return NextResponse.json(
      { error: "Failed to fetch bug data", bugs: [] },
      { status: 500 }
    );
  }
}
