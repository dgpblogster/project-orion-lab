/**
 * Critical Items API Route
 *
 * Open Critical-priority work items in the active sprint, with the detail the
 * flyout panel shows: owner, status, points, age and notes.
 *
 * GET /api/critical -> { repo: string, items: CriticalItem[] }
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CriticalItem {
  WorkItemId: number;
  Title: string;
  Type: string;
  Status: string;
  AssignedTo: string | null;
  StoryPoints: number | null;
  GitHubIssueRef: string | null;
  CreatedDate: Date;
  DaysOpen: number;
  Notes: string | null;
}

export async function GET() {
  try {
    const result = await executeQuery<CriticalItem>(`
      SELECT
        wi.WorkItemId, wi.Title, wi.Type, wi.Status, wi.AssignedTo,
        wi.StoryPoints, wi.GitHubIssueRef, wi.CreatedDate,
        DATEDIFF(day, wi.CreatedDate, (SELECT MAX(RecordedDate) FROM HealthMetrics)) AS DaysOpen,
        wi.Notes
      FROM WorkItems wi
      JOIN Sprints s ON wi.SprintId = s.SprintId
      WHERE s.Status = 'Active'
        AND wi.Priority = 'Critical'
        AND wi.Status NOT IN ('Resolved', 'Closed')
      ORDER BY wi.CreatedDate
    `);
    return NextResponse.json({
      repo: process.env.GITHUB_REPO || "dgpblogster/project-orion",
      items: result.recordset,
    });
  } catch (error) {
    console.error("Error fetching critical items:", error);
    return NextResponse.json({ error: "Failed to fetch critical items", items: [] }, { status: 500 });
  }
}
