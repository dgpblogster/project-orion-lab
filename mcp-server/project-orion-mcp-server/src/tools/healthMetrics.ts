/**
 * Health Metrics Tool Handlers
 *
 * MCP tool handlers for project health metrics queries.
 * These tools provide insights into overall project health and release readiness.
 */

import {
  queryLatestHealthMetrics,
  queryHealthMetricsTrend,
  HealthMetric,
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

interface LatestHealthMetricsResponse {
  metrics: HealthMetric;
  interpretation: {
    releaseReadiness: "Healthy" | "At Risk" | "Critical";
    recommendations: string[];
  };
}

interface HealthMetricsTrendResponse {
  days: number;
  metrics: HealthMetric[];
  trend: {
    readinessDirection: "Improving" | "Stable" | "Declining";
    startScore: number;
    endScore: number;
    changePercent: number;
  };
}

// =============================================================================
// Tool Handlers
// =============================================================================

/**
 * get_latest_health_metrics
 *
 * Returns the most recent project health snapshot including release readiness
 * score, critical bug count, blocker count, and velocity trend.
 *
 * Use this tool when:
 * - The user asks about overall project health
 * - You need to determine if a project is ready for release
 * - You want a quick summary of the project's current state
 *
 * @returns Latest health metrics with interpretation
 */
export async function handleGetLatestHealthMetrics(): Promise<
  ToolResponse<LatestHealthMetricsResponse>
> {
  try {
    const metrics = await queryLatestHealthMetrics();

    if (!metrics) {
      return {
        success: true,
        message: "No health metrics found",
        data: undefined,
      };
    }

    // Interpret the metrics
    const releaseReadiness = interpretReleaseReadiness(
      metrics.releaseReadinessScore
    );
    const recommendations = generateRecommendations(metrics);

    return {
      success: true,
      data: {
        metrics,
        interpretation: {
          releaseReadiness,
          recommendations,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get latest health metrics",
    };
  }
}

/**
 * get_health_metrics_trend
 *
 * Returns the release readiness score trend over the last N days to show
 * whether project health is improving or declining.
 *
 * Use this tool when:
 * - The user asks about project health trends
 * - You need to see if the project is getting better or worse
 * - You want to analyze historical health data
 *
 * @param days - Number of days of history to return (default: 14)
 * @returns Health metrics over time with trend analysis
 */
export async function handleGetHealthMetricsTrend(
  days: number = 14
): Promise<ToolResponse<HealthMetricsTrendResponse>> {
  try {
    const metrics = await queryHealthMetricsTrend(days);

    if (metrics.length === 0) {
      return {
        success: true,
        message: `No health metrics found for the last ${days} days`,
        data: {
          days,
          metrics: [],
          trend: {
            readinessDirection: "Stable",
            startScore: 0,
            endScore: 0,
            changePercent: 0,
          },
        },
      };
    }

    // Calculate trend
    const startScore = metrics[0].releaseReadinessScore;
    const endScore = metrics[metrics.length - 1].releaseReadinessScore;
    const changePercent =
      startScore > 0
        ? Math.round(((endScore - startScore) / startScore) * 100)
        : 0;

    let readinessDirection: "Improving" | "Stable" | "Declining";
    if (changePercent > 5) {
      readinessDirection = "Improving";
    } else if (changePercent < -5) {
      readinessDirection = "Declining";
    } else {
      readinessDirection = "Stable";
    }

    return {
      success: true,
      data: {
        days,
        metrics,
        trend: {
          readinessDirection,
          startScore,
          endScore,
          changePercent,
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get health metrics trend",
    };
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Interprets the release readiness score into a status. Thresholds match the
 * dashboard's status pill so the agent and the screen use the same words:
 *   75 and above: Healthy
 *   50 to 74:     At Risk
 *   below 50:     Critical
 */
function interpretReleaseReadiness(
  score: number
): "Healthy" | "At Risk" | "Critical" {
  if (score >= 75) return "Healthy";
  if (score >= 50) return "At Risk";
  return "Critical";
}

/**
 * Generates actionable recommendations based on current metrics.
 */
function generateRecommendations(metrics: HealthMetric): string[] {
  const recommendations: string[] = [];

  if (metrics.bugCriticalCount > 0) {
    recommendations.push(
      `Address ${metrics.bugCriticalCount} critical bug(s) immediately before release.`
    );
  }

  if (metrics.blockerCount > 0) {
    recommendations.push(
      `Resolve ${metrics.blockerCount} blocker(s) to unblock team progress.`
    );
  }

  if (metrics.velocityTrend === "Declining") {
    recommendations.push(
      "Investigate declining velocity - consider team capacity or scope issues."
    );
  }

  if (metrics.releaseReadinessScore < 75) {
    recommendations.push(
      "Release readiness is below the Healthy threshold (75). Review critical path items and address gaps."
    );
  }

  if (metrics.bugOpenCount > 10) {
    recommendations.push(
      "High number of open bugs. Consider a bug bash or dedicated bug-fixing sprint."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Project health looks good. Continue current pace toward release."
    );
  }

  return recommendations;
}
