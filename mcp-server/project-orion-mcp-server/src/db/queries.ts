/**
 * SQL Query Functions
 *
 * This module contains all SQL queries used by the MCP tools.
 * Each function corresponds to one MCP tool and returns clean, typed data.
 */

import sql from "mssql";
import { getPool } from "./connection.js";

// =============================================================================
// Type Definitions
// =============================================================================

/** Sprint record from the Sprints table */
export interface Sprint {
  sprintId: number;
  sprintName: string;
  startDate: Date;
  endDate: Date;
  status: "Completed" | "Active";
  plannedPoints: number;
  completedPoints: number;
  rolloverPoints: number;
  teamVelocity: number;
  notes: string | null;
}

/** Work item record from the WorkItems table */
export interface WorkItem {
  workItemId: number;
  sprintId: number;
  sprintName?: string;
  title: string;
  type: "Task" | "Bug" | "Story";
  priority: "Critical" | "High" | "Medium" | "Low";
  status: "New" | "Active" | "Resolved" | "Closed" | "Blocked";
  assignedTo: string | null;
  storyPoints: number | null;
  gitHubIssueRef: string | null;
  createdDate: Date;
  resolvedDate: Date | null;
  notes: string | null;
}

/** Health metrics record from the HealthMetrics table */
export interface HealthMetric {
  metricId: number;
  recordedDate: Date;
  sprintId: number;
  sprintName?: string;
  bugOpenCount: number;
  bugCriticalCount: number;
  sprintCompletionRate: number;
  velocityTrend: "Rising" | "Stable" | "Declining";
  blockerCount: number;
  releaseReadinessScore: number;
  notes: string | null;
}

// =============================================================================
// Sprint Queries
// =============================================================================

/**
 * Gets the current active sprint.
 * Returns the single sprint where Status = 'Active'.
 */
export async function queryCurrentSprint(): Promise<Sprint | null> {
  const pool = await getPool();

  const result = await pool.request().query<Sprint>(`
    SELECT 
      SprintId as sprintId,
      SprintName as sprintName,
      StartDate as startDate,
      EndDate as endDate,
      Status as status,
      PlannedPoints as plannedPoints,
      CompletedPoints as completedPoints,
      RolloverPoints as rolloverPoints,
      TeamVelocity as teamVelocity,
      Notes as notes
    FROM Sprints
    WHERE Status = 'Active'
  `);

  return result.recordset[0] || null;
}

/**
 * Gets the history of all completed sprints.
 * Returns sprints ordered by SprintId ascending to show progression.
 */
export async function querySprintHistory(): Promise<Sprint[]> {
  const pool = await getPool();

  const result = await pool.request().query<Sprint>(`
    SELECT 
      SprintId as sprintId,
      SprintName as sprintName,
      StartDate as startDate,
      EndDate as endDate,
      Status as status,
      PlannedPoints as plannedPoints,
      CompletedPoints as completedPoints,
      RolloverPoints as rolloverPoints,
      TeamVelocity as teamVelocity,
      Notes as notes
    FROM Sprints
    WHERE Status = 'Completed'
    ORDER BY SprintId ASC
  `);

  return result.recordset;
}

// =============================================================================
// Work Item Queries
// =============================================================================

/**
 * Gets all critical and high priority work items that are not resolved.
 * Includes blocked items to identify release blockers.
 */
export async function queryCriticalWorkItems(): Promise<WorkItem[]> {
  const pool = await getPool();

  const result = await pool.request().query<WorkItem>(`
    SELECT 
      w.WorkItemId as workItemId,
      w.SprintId as sprintId,
      s.SprintName as sprintName,
      w.Title as title,
      w.Type as type,
      w.Priority as priority,
      w.Status as status,
      w.AssignedTo as assignedTo,
      w.StoryPoints as storyPoints,
      w.GitHubIssueRef as gitHubIssueRef,
      w.CreatedDate as createdDate,
      w.ResolvedDate as resolvedDate,
      w.Notes as notes
    FROM WorkItems w
    INNER JOIN Sprints s ON w.SprintId = s.SprintId
    WHERE w.Priority IN ('Critical', 'High')
      AND w.Status NOT IN ('Resolved', 'Closed')
    ORDER BY 
      CASE w.Priority WHEN 'Critical' THEN 1 WHEN 'High' THEN 2 END,
      CASE w.Status WHEN 'Blocked' THEN 1 ELSE 2 END,
      w.CreatedDate ASC
  `);

  return result.recordset;
}

/**
 * Gets all work items for a specific sprint.
 * Optionally filters by status.
 */
export async function queryWorkItemsBySprint(
  sprintId: number,
  status?: string
): Promise<WorkItem[]> {
  const pool = await getPool();

  let query = `
    SELECT 
      w.WorkItemId as workItemId,
      w.SprintId as sprintId,
      s.SprintName as sprintName,
      w.Title as title,
      w.Type as type,
      w.Priority as priority,
      w.Status as status,
      w.AssignedTo as assignedTo,
      w.StoryPoints as storyPoints,
      w.GitHubIssueRef as gitHubIssueRef,
      w.CreatedDate as createdDate,
      w.ResolvedDate as resolvedDate,
      w.Notes as notes
    FROM WorkItems w
    INNER JOIN Sprints s ON w.SprintId = s.SprintId
    WHERE w.SprintId = @sprintId
  `;

  if (status) {
    query += ` AND w.Status = @status`;
  }

  query += ` ORDER BY w.Priority, w.CreatedDate ASC`;

  const request = pool.request().input("sprintId", sql.Int, sprintId);

  if (status) {
    request.input("status", sql.NVarChar, status);
  }

  const result = await request.query<WorkItem>(query);

  return result.recordset;
}

/**
 * Gets work items that appear stalled (in Active or New status without recent updates).
 * These may indicate blockers or abandoned work.
 */
export async function queryStalledWorkItems(
  staleDays: number = 7
): Promise<WorkItem[]> {
  const pool = await getPool();

  const result = await pool
    .request()
    .input("staleDays", sql.Int, staleDays).query<WorkItem>(`
    SELECT 
      w.WorkItemId as workItemId,
      w.SprintId as sprintId,
      s.SprintName as sprintName,
      w.Title as title,
      w.Type as type,
      w.Priority as priority,
      w.Status as status,
      w.AssignedTo as assignedTo,
      w.StoryPoints as storyPoints,
      w.GitHubIssueRef as gitHubIssueRef,
      w.CreatedDate as createdDate,
      w.ResolvedDate as resolvedDate,
      w.Notes as notes
    FROM WorkItems w
    INNER JOIN Sprints s ON w.SprintId = s.SprintId
    WHERE w.Status IN ('Active', 'New')
      AND w.CreatedDate <= DATEADD(day, -@staleDays, GETDATE())
      AND w.ResolvedDate IS NULL
    ORDER BY w.CreatedDate ASC
  `);

  return result.recordset;
}

// =============================================================================
// Health Metrics Queries
// =============================================================================

/**
 * Gets the most recent health metrics snapshot.
 * Includes sprint information for context.
 */
export async function queryLatestHealthMetrics(): Promise<HealthMetric | null> {
  const pool = await getPool();

  const result = await pool.request().query<HealthMetric>(`
    SELECT TOP 1
      h.MetricId as metricId,
      h.RecordedDate as recordedDate,
      h.SprintId as sprintId,
      s.SprintName as sprintName,
      h.BugOpenCount as bugOpenCount,
      h.BugCriticalCount as bugCriticalCount,
      h.SprintCompletionRate as sprintCompletionRate,
      h.VelocityTrend as velocityTrend,
      h.BlockerCount as blockerCount,
      h.ReleaseReadinessScore as releaseReadinessScore,
      h.Notes as notes
    FROM HealthMetrics h
    INNER JOIN Sprints s ON h.SprintId = s.SprintId
    ORDER BY h.RecordedDate DESC
  `);

  return result.recordset[0] || null;
}

/**
 * Gets the health metrics trend over a specified number of days.
 * Shows how project health is changing over time.
 */
export async function queryHealthMetricsTrend(
  days: number = 14
): Promise<HealthMetric[]> {
  const pool = await getPool();

  const result = await pool.request().input("days", sql.Int, days)
    .query<HealthMetric>(`
    SELECT 
      h.MetricId as metricId,
      h.RecordedDate as recordedDate,
      h.SprintId as sprintId,
      s.SprintName as sprintName,
      h.BugOpenCount as bugOpenCount,
      h.BugCriticalCount as bugCriticalCount,
      h.SprintCompletionRate as sprintCompletionRate,
      h.VelocityTrend as velocityTrend,
      h.BlockerCount as blockerCount,
      h.ReleaseReadinessScore as releaseReadinessScore,
      h.Notes as notes
    FROM HealthMetrics h
    INNER JOIN Sprints s ON h.SprintId = s.SprintId
    WHERE h.RecordedDate >= DATEADD(day, -@days, GETDATE())
    ORDER BY h.RecordedDate ASC
  `);

  return result.recordset;
}
