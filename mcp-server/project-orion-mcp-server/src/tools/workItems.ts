/**
 * Work Items Tool Handlers
 *
 * MCP tool handlers for work item queries.
 * These tools help identify blockers, track progress, and surface stalled work.
 */

import {
  queryCriticalWorkItems,
  queryWorkItemsBySprint,
  queryStalledWorkItems,
  WorkItem,
} from "../db/queries.js";

// =============================================================================
// Response Types
// =============================================================================

interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface CriticalWorkItemsResponse {
  workItems: WorkItem[];
  summary: {
    totalCount: number;
    criticalCount: number;
    highCount: number;
    blockedCount: number;
  };
}

interface WorkItemsBySprintResponse {
  sprintId: number;
  workItems: WorkItem[];
  summary: {
    totalCount: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    totalStoryPoints: number;
  };
}

interface StalledWorkItemsResponse {
  staleDays: number;
  workItems: WorkItem[];
  summary: {
    totalCount: number;
    byAssignee: Record<string, number>;
    totalStoryPointsAtRisk: number;
  };
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * get_critical_work_items
 *
 * Returns all open work items with Critical or High priority, including any
 * that are blocked, to identify release blockers.
 *
 * Use this tool when:
 * - The user asks about blockers or critical issues
 * - You need to identify what's preventing a release
 * - You want to see high-priority unresolved work
 *
 * @returns Critical and high priority work items with summary
 */
export async function handleGetCriticalWorkItems(): Promise<
  ToolResponse<CriticalWorkItemsResponse>
> {
  try {
    const workItems = await queryCriticalWorkItems();

    const summary = {
      totalCount: workItems.length,
      criticalCount: workItems.filter((w) => w.priority === "Critical").length,
      highCount: workItems.filter((w) => w.priority === "High").length,
      blockedCount: workItems.filter((w) => w.status === "Blocked").length,
    };

    return {
      success: true,
      data: {
        workItems,
        summary,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get critical work items",
    };
  }
}

/**
 * get_work_items_by_sprint
 *
 * Returns all work items for a specific sprint, optionally filtered by status.
 *
 * Use this tool when:
 * - The user asks about work in a specific sprint
 * - You need to see all tasks/bugs/stories in a sprint
 * - You want to filter work by status (New, Active, Resolved, Closed, Blocked)
 *
 * @param sprintId - The SprintId to query
 * @param status - Optional status filter
 * @returns Work items for the sprint with summary statistics
 */
export async function handleGetWorkItemsBySprint(
  sprintId: number,
  status?: string
): Promise<ToolResponse<WorkItemsBySprintResponse>> {
  try {
    const workItems = await queryWorkItemsBySprint(sprintId, status);

    // Calculate summary statistics
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let totalStoryPoints = 0;

    for (const item of workItems) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalStoryPoints += item.storyPoints || 0;
    }

    return {
      success: true,
      data: {
        sprintId,
        workItems,
        summary: {
          totalCount: workItems.length,
          byStatus,
          byType,
          totalStoryPoints,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get work items by sprint",
    };
  }
}

/**
 * get_stalled_work_items
 *
 * Returns work items that are still in Active or New status but have not been
 * updated recently, indicating potential blockers or abandoned work.
 *
 * Use this tool when:
 * - The user asks about stale or abandoned work
 * - You need to identify work that may be blocked without being marked as such
 * - You want to find items that need attention or reassignment
 *
 * @param staleDays - Number of days without update to consider stale (default: 7)
 * @returns Stalled work items with assignee breakdown
 */
export async function handleGetStalledWorkItems(
  staleDays: number = 7
): Promise<ToolResponse<StalledWorkItemsResponse>> {
  try {
    const workItems = await queryStalledWorkItems(staleDays);

    // Calculate summary by assignee
    const byAssignee: Record<string, number> = {};
    let totalStoryPointsAtRisk = 0;

    for (const item of workItems) {
      const assignee = item.assignedTo || "Unassigned";
      byAssignee[assignee] = (byAssignee[assignee] || 0) + 1;
      totalStoryPointsAtRisk += item.storyPoints || 0;
    }

    return {
      success: true,
      data: {
        staleDays,
        workItems,
        summary: {
          totalCount: workItems.length,
          byAssignee,
          totalStoryPointsAtRisk,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get stalled work items",
    };
  }
}
