/**
 * Project Orion MCP Server
 *
 * This is the main entry point for the Model Context Protocol server.
 * It exposes project health data from SQL Server as queryable tools
 * for Microsoft Copilot Studio agents.
 *
 * Supports both stdio and HTTP transports:
 * - stdio: For local CLI usage
 * - HTTP (Streamable): For remote access via dev tunnels (default on port 3000)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";

// Load environment variables
dotenv.config();

// Import tool handlers
import {
  handleGetCurrentSprint,
  handleGetSprintHistory,
} from "./tools/sprints.js";
import {
  handleGetCriticalWorkItems,
  handleGetWorkItemsBySprint,
  handleGetStalledWorkItems,
} from "./tools/workItems.js";
import {
  handleGetLatestHealthMetrics,
  handleGetHealthMetricsTrend,
} from "./tools/healthMetrics.js";

import { handleGetReleaseForecast } from "./tools/release.js";

// Import database utilities for cleanup
import { closePool } from "./db/connection.js";
import { isFeatureEnabled } from "./db/featureFlags.js";

/** Feature flag that controls the get_release_forecast tool (Demo Part 2). */
const FORECAST_FLAG = "ForecastToolEnabled";

// =============================================================================
// Tool Definitions
// =============================================================================

/**
 * All available MCP tools exposed by this server.
 * Each tool has a name, description, and input schema for parameter validation.
 */
const TOOLS: Tool[] = [
  // Sprint Tools
  {
    name: "get_current_sprint",
    description:
      "Returns the current active sprint details including planned vs completed points, rollover points, and team velocity.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_sprint_history",
    description:
      "Returns the velocity and completion rate history for all completed sprints to identify trends.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },

  // Work Item Tools
  {
    name: "get_critical_work_items",
    description:
      "Returns all open work items with Critical or High priority, including any that are blocked, to identify release blockers.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_work_items_by_sprint",
    description:
      "Returns all work items for a specific sprint, optionally filtered by status.",
    inputSchema: {
      type: "object",
      properties: {
        sprint_id: {
          type: "number",
          description: "The SprintId to query",
        },
        status: {
          type: "string",
          description:
            "Filter by status value (New, Active, Resolved, Closed, Blocked)",
        },
      },
      required: ["sprint_id"],
    },
  },
  {
    name: "get_stalled_work_items",
    description:
      "Returns work items that are still in Active or New status but have not been updated recently, indicating potential blockers or abandoned work.",
    inputSchema: {
      type: "object",
      properties: {
        stale_days: {
          type: "number",
          description:
            "Number of days without update to consider stale (default: 7)",
        },
      },
      required: [],
    },
  },

  // Health Metrics Tools
  {
    name: "get_latest_health_metrics",
    description:
      "Returns the most recent project health snapshot including release readiness score, critical bug count, blocker count, and velocity trend.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_health_metrics_trend",
    description:
      "Returns the release readiness score trend over the last N days to show whether project health is improving or declining.",
    inputSchema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days of history to return (default: 14)",
        },
      },
      required: [],
    },
  },
];

/**
 * Feature-flagged tool. NOT in TOOLS: it is appended to the tool list only
 * while FeatureFlags.ForecastToolEnabled = 1. The flag is read on every
 * request, so flipping it in the dashboard changes what Copilot Studio sees
 * without restarting this server or touching the agent.
 */
const FORECAST_TOOL: Tool = {
  name: "get_release_forecast",
  description:
    "Forecasts whether the release will land on its target date at the team's current pace. Returns remaining scope, sprints left before the target date, current and recent average velocity, projected shortfall, the velocity required to hit the date, and the projected finish date at the current pace. Use for questions like 'Will we make the release?' or 'At our current pace, when will we finish?'",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

// =============================================================================
// Parameter Validation Schemas
// =============================================================================

const GetWorkItemsBySprintSchema = z.object({
  sprint_id: z.number().int().positive(),
  status: z.string().optional(),
});

const GetStalledWorkItemsSchema = z.object({
  stale_days: z.number().int().positive().default(7),
});

const GetHealthMetricsTrendSchema = z.object({
  days: z.number().int().positive().default(14),
});

// =============================================================================
// Server Setup
// =============================================================================

/**
 * Creates and configures the MCP server with all tool handlers.
 */
function createServer(): Server {
  const serverName = process.env.MCP_SERVER_NAME || "project-orion-mcp-server";
  const serverVersion = process.env.MCP_SERVER_VERSION || "1.0.0";

  const server = new Server(
    {
      name: serverName,
      version: serverVersion,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const forecastEnabled = await isFeatureEnabled(FORECAST_FLAG);
    return { tools: forecastEnabled ? [...TOOLS, FORECAST_TOOL] : TOOLS };
  });

  // Register resources listing handler (empty - we only expose tools)
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources: [] };
  });

  // Register tool execution handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: unknown;

      switch (name) {
        // Sprint tools
        case "get_current_sprint":
          result = await handleGetCurrentSprint();
          break;

        case "get_sprint_history":
          result = await handleGetSprintHistory();
          break;

        // Work item tools
        case "get_critical_work_items":
          result = await handleGetCriticalWorkItems();
          break;

        case "get_work_items_by_sprint": {
          const params = GetWorkItemsBySprintSchema.parse(args);
          result = await handleGetWorkItemsBySprint(
            params.sprint_id,
            params.status
          );
          break;
        }

        case "get_stalled_work_items": {
          const params = GetStalledWorkItemsSchema.parse(args);
          result = await handleGetStalledWorkItems(params.stale_days);
          break;
        }

        // Health metrics tools
        case "get_latest_health_metrics":
          result = await handleGetLatestHealthMetrics();
          break;

        case "get_health_metrics_trend": {
          const params = GetHealthMetricsTrendSchema.parse(args);
          result = await handleGetHealthMetricsTrend(params.days);
          break;
        }

        // Feature-flagged release forecast tool
        case "get_release_forecast": {
          if (!(await isFeatureEnabled(FORECAST_FLAG))) {
            result = {
              success: false,
              error: "get_release_forecast is not currently enabled on this server.",
            };
            break;
          }
          result = await handleGetReleaseForecast();
          break;
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: `Unknown tool: ${name}`,
                }),
              },
            ],
          };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: errorMessage,
            }),
          },
        ],
      };
    }
  });

  return server;
}

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Starts the MCP server with stdio transport.
 */
async function runStdioServer(): Promise<void> {
  console.error("[MCP] Starting Project Orion MCP Server (stdio mode)...");
  console.error(`[MCP] Server: ${process.env.MCP_SERVER_NAME || "project-orion-mcp-server"}`);
  console.error(`[MCP] Version: ${process.env.MCP_SERVER_VERSION || "1.0.0"}`);

  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("[MCP] Server running on stdio transport");
}

/**
 * Starts the MCP server with Streamable HTTP transport for remote access.
 * Uses the modern MCP Streamable HTTP specification.
 */
async function runHttpServer(): Promise<void> {
  const port = parseInt(process.env.MCP_HTTP_PORT || "3000", 10);

  console.error("[MCP] Starting Project Orion MCP Server (HTTP mode)...");
  console.error(`[MCP] Server: ${process.env.MCP_SERVER_NAME || "project-orion-mcp-server"}`);
  console.error(`[MCP] Version: ${process.env.MCP_SERVER_VERSION || "1.0.0"}`);
  console.error(`[MCP] Port: ${port}`);

  const app = express();

  // Enable CORS for all origins (required for Copilot Studio)
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id'],
    exposedHeaders: ['Mcp-Session-Id'],
  }));

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: "project-orion-mcp-server" });
  });

  // Handle all MCP requests on /mcp endpoint (stateless mode for Copilot Studio)
  // Each request creates a fresh transport - no session tracking needed
  app.all("/mcp", async (req: Request, res: Response) => {
    console.error(`[MCP] ${req.method} /mcp received`);
    
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    console.error(`[MCP] Session ID from client: ${sessionId || "(none)"}`);

    // Create a stateless transport for each request
    // sessionIdGenerator: undefined = stateless mode (no session validation)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Connect a fresh MCP server to this transport
    const server = createServer();
    await server.connect(transport);
    console.error(`[MCP] Transport and server created for request`);

    // Let the transport handle the request
    try {
      await transport.handleRequest(req, res, req.body);
      console.error(`[MCP] Request handled successfully`);
    } catch (error) {
      console.error(`[MCP] Error handling request:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Also support /sse endpoint for compatibility - handle same as /mcp
  app.all("/sse", async (req: Request, res: Response) => {
    console.error(`[MCP] ${req.method} /sse received`);
    
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    console.error(`[MCP] /sse Session ID from client: ${sessionId || "(none)"}`);

    // Create a stateless transport for each request
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    const server = createServer();
    await server.connect(transport);

    try {
      await transport.handleRequest(req, res, req.body);
      console.error(`[MCP] /sse Request handled successfully`);
    } catch (error) {
      console.error(`[MCP] /sse Error handling request:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  });

  // Start HTTP server
  const httpServer = app.listen(port, () => {
    console.error(`[MCP] HTTP server listening on http://localhost:${port}`);
    console.error(`[MCP] MCP endpoint: http://localhost:${port}/mcp`);
    console.error(`[MCP] Health check: http://localhost:${port}/health`);
  });

  // Return cleanup function
  return new Promise((resolve) => {
    httpServer.on("close", resolve);
  });
}

/**
 * Main entry point - determines transport mode from args or env.
 */
async function main(): Promise<void> {
  const mode = process.argv[2] || process.env.MCP_TRANSPORT || "http";

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("[MCP] Shutting down...");
    await closePool();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("[MCP] Shutting down...");
    await closePool();
    process.exit(0);
  });

  if (mode === "stdio") {
    await runStdioServer();
  } else {
    await runHttpServer();
  }
}

// Run the server
main().catch((error) => {
  console.error("[MCP] Fatal error:", error);
  process.exit(1);
});
