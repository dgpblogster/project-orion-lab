/**
 * Stalled Work API Route
 *
 * Returns active-sprint work items flagged as stalled (Notes start with
 * "STALLED"), with their GitHub reference. Used by the Blockers panel.
 *
 * GET /api/stalled -> { items: { Title, GitHubIssueRef, AssignedTo, Notes }[] }
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export const dynamic = "force-dynamic";

interface StalledItem {
  Title: string;
  GitHubIssueRef: string | null;
  AssignedTo: string | null;
  Notes: string | null;
}

export async function GET() {
  try {
    const result = await executeQuery<StalledItem>(`
      SELECT TOP 3 wi.Title, wi.GitHubIssueRef, wi.AssignedTo, wi.Notes
      FROM WorkItems wi
      JOIN Sprints s ON wi.SprintId = s.SprintId
      WHERE s.Status = 'Active'
        AND wi.Status IN ('Active', 'New')
        AND wi.Notes LIKE 'STALLED%'
      ORDER BY wi.CreatedDate
    `);
    return NextResponse.json({ items: result.recordset });
  } catch (error) {
    console.error("Error fetching stalled work:", error);
    return NextResponse.json({ error: "Failed to fetch stalled work", items: [] }, { status: 500 });
  }
}
