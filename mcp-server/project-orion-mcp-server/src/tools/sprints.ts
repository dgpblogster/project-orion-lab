/**
 * Sprint Tool Handlers
 *
 * MCP tool handlers for sprint-related queries.
 * These tools help understand team velocity and sprint progress.
 */

import { queryCurrentSprint, querySprintHistory, Sprint } from "../db/queries.js";

// =============================================================================
// Response Types
// =============================================================================

interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface CurrentSprintResponse {
  sprint: Sprint;
  summary: {
    daysRemaining: number;
    completionPercentage: number;
    isOnTrack: boolean;
  };
}

interface SprintHistoryResponse {
  sprints: Sprint[];
  summary: {
    totalSprints: number;
    averageVelocity: number;
    averageCompletionRate: number;
  };
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * get_current_sprint
 *
 * Returns the current active sprint details including planned vs completed points,
 * rollover points, and team velocity.
 *
 * Use this tool when:
 * - The user asks about the current sprint status
 * - You need to understand what the team is working on now
 * - You want to check sprint progress or completion percentage
 *
 * @returns The active sprint with summary metrics
 */
export async function handleGetCurrentSprint(): Promise<
  ToolResponse<CurrentSprintResponse>
> {
  try {
    const sprint = await queryCurrentSprint();

    if (!sprint) {
      return {
        success: true,
        message: "No active sprint found",
        data: undefined,
      };
    }

    // Calculate additional metrics
    const now = new Date();
    const endDate = new Date(sprint.endDate);
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    const completionPercentage =
      sprint.plannedPoints > 0
        ? Math.round((sprint.completedPoints / sprint.plannedPoints) * 100)
        : 0;

    // Simple on-track heuristic: >50% complete means on track
    const isOnTrack = completionPercentage >= 50 || daysRemaining > 7;

    return {
      success: true,
      data: {
        sprint,
        summary: {
          daysRemaining,
          completionPercentage,
          isOnTrack,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get current sprint",
    };
  }
}

/**
 * get_sprint_history
 *
 * Returns the velocity and completion rate history for all completed sprints
 * to identify trends.
 *
 * Use this tool when:
 * - The user asks about team velocity trends
 * - You need to analyze historical sprint performance
 * - You want to understand if the team is improving or declining
 *
 * @returns All completed sprints with aggregate summary statistics
 */
export async function handleGetSprintHistory(): Promise<
  ToolResponse<SprintHistoryResponse>
> {
  try {
    const sprints = await querySprintHistory();

    if (sprints.length === 0) {
      return {
        success: true,
        message: "No completed sprints found",
        data: {
          sprints: [],
          summary: {
            totalSprints: 0,
            averageVelocity: 0,
            averageCompletionRate: 0,
          },
        },
      };
    }

    // Calculate aggregate metrics
    const totalVelocity = sprints.reduce((sum, s) => sum + s.teamVelocity, 0);
    const totalCompletionRate = sprints.reduce((sum, s) => {
      const rate =
        s.plannedPoints > 0 ? (s.completedPoints / s.plannedPoints) * 100 : 0;
      return sum + rate;
    }, 0);

    return {
      success: true,
      data: {
        sprints,
        summary: {
          totalSprints: sprints.length,
          averageVelocity: Math.round(totalVelocity / sprints.length),
          averageCompletionRate: Math.round(totalCompletionRate / sprints.length),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to get sprint history",
    };
  }
}
