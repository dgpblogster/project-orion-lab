/**
 * Release Forecast Tool Handler (feature-flagged)
 *
 * get_release_forecast answers "will we make the release at our current pace?"
 * It is only listed and callable when FeatureFlags.ForecastToolEnabled = 1.
 * Flipping that flag is the "server-side change" in Demo Part 2.
 */

import { getPool } from "../db/connection.js";

interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ReleaseForecast {
  releaseName: string;
  targetDate: string;
  remainingPoints: number;
  sprintsRemaining: number;
  currentVelocity: number;
  avg3Velocity: number;
  projectedPointsAtCurrentPace: number;
  shortfallPoints: number;
  requiredVelocity: number | null;
  projectedFinishDateAtCurrentPace: string | null;
  onTrack: boolean;
  summary: string;
}

const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * get_release_forecast
 *
 * Use this tool when the user asks whether the release will land on time,
 * when the team will finish at the current pace, or what velocity is needed
 * to hit the target date.
 */
export async function handleGetReleaseForecast(): Promise<ToolResponse<ReleaseForecast>> {
  try {
    const pool = await getPool();

    // One round trip: release plan, completed points, current sprint end,
    // most recent completed velocity, and the average of the last 3.
    const result = await pool.request().query(`
      SELECT TOP 1
        r.ReleaseName,
        r.TargetDate,
        r.TotalScopePoints,
        r.SprintLengthDays,
        (SELECT SUM(CompletedPoints) FROM Sprints)                               AS CompletedToDate,
        (SELECT TOP 1 EndDate FROM Sprints WHERE Status = 'Active')              AS CurrentSprintEnd,
        (SELECT TOP 1 TeamVelocity FROM Sprints
           WHERE Status = 'Completed' ORDER BY SprintId DESC)                    AS CurrentVelocity,
        (SELECT AVG(TeamVelocity) FROM (SELECT TOP 3 TeamVelocity FROM Sprints
           WHERE Status = 'Completed' ORDER BY SprintId DESC) t)                 AS Avg3Velocity
      FROM ReleasePlan r
      ORDER BY r.ReleaseId
    `);

    if (result.recordset.length === 0) {
      return { success: true, message: "No release plan found" };
    }

    const row = result.recordset[0];
    const targetDate: Date = row.TargetDate;
    const currentSprintEnd: Date = row.CurrentSprintEnd;
    const sprintLength: number = row.SprintLengthDays;
    const currentVelocity = Number(row.CurrentVelocity);
    const avg3Velocity = Math.round(Number(row.Avg3Velocity) * 10) / 10;
    const remainingPoints = row.TotalScopePoints - row.CompletedToDate;

    const daysToTarget = Math.round(
      (targetDate.getTime() - currentSprintEnd.getTime()) / 86_400_000
    );
    const sprintsRemaining = Math.max(0, Math.floor(daysToTarget / sprintLength));

    const projectedPointsAtCurrentPace = currentVelocity * sprintsRemaining;
    const shortfallPoints = Math.max(0, remainingPoints - projectedPointsAtCurrentPace);
    const requiredVelocity =
      sprintsRemaining > 0 ? Math.round((remainingPoints / sprintsRemaining) * 10) / 10 : null;

    let projectedFinishDateAtCurrentPace: string | null = null;
    if (currentVelocity > 0) {
      const sprintsNeeded = Math.ceil(remainingPoints / currentVelocity);
      const finish = new Date(currentSprintEnd.getTime() + sprintsNeeded * sprintLength * 86_400_000);
      projectedFinishDateAtCurrentPace = toIsoDate(finish);
    }

    const onTrack = sprintsRemaining > 0 && projectedPointsAtCurrentPace >= remainingPoints;

    const summary =
      sprintsRemaining === 0
        ? `The target date ${toIsoDate(targetDate)} has passed or falls within the current sprint.`
        : onTrack
        ? `On track: ${projectedPointsAtCurrentPace} points projected against ${remainingPoints} remaining.`
        : `Not on track at the current pace of ${currentVelocity} points per sprint: ` +
          `${shortfallPoints} points short across ${sprintsRemaining} sprints. ` +
          `Hitting ${toIsoDate(targetDate)} requires about ${requiredVelocity} points per sprint ` +
          `(recent 3-sprint average: ${avg3Velocity}).`;

    return {
      success: true,
      data: {
        releaseName: row.ReleaseName,
        targetDate: toIsoDate(targetDate),
        remainingPoints,
        sprintsRemaining,
        currentVelocity,
        avg3Velocity,
        projectedPointsAtCurrentPace,
        shortfallPoints,
        requiredVelocity,
        projectedFinishDateAtCurrentPace,
        onTrack,
        summary,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to compute release forecast",
    };
  }
}
