````markdown
# GitHub Copilot Prompt: Project Orion Custom MCP Server

## How to use this prompt
1. Open GitHub Copilot Chat in VS Code (`Ctrl+Alt+I`)
2. Copy everything under the "PROMPT" section below
3. Paste it into Copilot Chat and send
4. Copilot will scaffold the full project structure
5. Follow any additional instructions Copilot provides to install dependencies and run the server

---

## PROMPT

I need you to scaffold a custom Model Context Protocol (MCP) Server in TypeScript using Node.js. This MCP Server will be used as a data provider for a Microsoft Copilot Studio agent. The server connects to a local SQL Server database called **ProjectOrion** and exposes structured project health data as queryable MCP tools.

### Project name
`project-orion-mcp-server`

### Tech stack
- TypeScript (strict mode, ES2022 target, NodeNext module resolution)
- Node.js >= 18.0.0
- `@modelcontextprotocol/sdk` (latest)
- `mssql` package for SQL Server connectivity
- `dotenv` for environment configuration
- `zod` for input validation on MCP tool parameters
- `express` for HTTP server (required for Copilot Studio remote access)
- `cors` for cross-origin request handling

### Transport Configuration
**IMPORTANT**: Copilot Studio requires HTTP transport, not stdio. The server must:
1. Use `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`
2. Run in **stateless mode** (`sessionIdGenerator: undefined`) - this is critical for Copilot Studio compatibility
3. Create a fresh transport and server instance for each incoming request
4. Expose the MCP endpoint at `/mcp` (Copilot Studio default)
5. Include a `/health` endpoint for connectivity testing

### Database context
The SQL Server database is named `ProjectOrion` and contains five tables:

**Sprints**
```sql
SprintId, SprintName, StartDate, EndDate, Status (Completed|Active),
PlannedPoints, CompletedPoints, RolloverPoints, TeamVelocity, Notes
```

**WorkItems**
```sql
WorkItemId, SprintId, Title, Type (Task|Bug|Story), Priority (Critical|High|Medium|Low),
Status (New|Active|Resolved|Closed|Blocked), AssignedTo, StoryPoints,
GitHubIssueRef, CreatedDate, ResolvedDate, Notes
```

**HealthMetrics**
```sql
MetricId, RecordedDate, SprintId, BugOpenCount, BugCriticalCount,
SprintCompletionRate, VelocityTrend (Rising|Stable|Declining),
BlockerCount, ReleaseReadinessScore (0-100), Notes
```

**ReleasePlan**
```sql
ReleaseId, ReleaseName, TargetDate, TotalScopePoints, SprintLengthDays, Notes
```

**FeatureFlags**
```sql
FlagName (PK), IsEnabled (bit), Description, UpdatedAt
```

### MCP Tools to expose
Expose the following tools so the Copilot Studio agent can call them:

1. **get_current_sprint**
   - Description: "Returns the current active sprint details including planned vs completed points, rollover points, and team velocity."
   - No parameters required
   - Query: SELECT the single sprint WHERE Status = 'Active'

2. **get_sprint_history**
   - Description: "Returns the velocity and completion rate history for all completed sprints to identify trends."
   - No parameters required
   - Query: SELECT all sprints WHERE Status = 'Completed', ordered by SprintId ASC

3. **get_critical_work_items**
   - Description: "Returns all open work items with Critical or High priority, including any that are blocked, to identify release blockers."
   - No parameters required
   - Query: SELECT work items WHERE Priority IN ('Critical', 'High') AND Status NOT IN ('Resolved', 'Closed'), joined with Sprints

4. **get_work_items_by_sprint**
   - Description: "Returns all work items for a specific sprint, optionally filtered by status."
   - Parameters:
     - `sprint_id` (number, required): The SprintId to query
     - `status` (string, optional): Filter by status value
   - Query: SELECT work items WHERE SprintId = sprint_id, optionally filtered by status

5. **get_latest_health_metrics**
   - Description: "Returns the most recent project health snapshot including release readiness score, critical bug count, blocker count, and velocity trend."
   - No parameters required
   - Query: SELECT TOP 1 from HealthMetrics joined with Sprints, ORDER BY RecordedDate DESC

6. **get_health_metrics_trend**
   - Description: "Returns the release readiness score trend over the last N days to show whether project health is improving or declining."
   - Parameters:
     - `days` (number, optional, default 14): Number of days of history to return
   - Query: SELECT from HealthMetrics WHERE RecordedDate >= DATEADD(day, -days, GETDATE()), ORDER BY RecordedDate ASC

7. **get_stalled_work_items**
   - Description: "Returns work items that are still in Active or New status but have not been updated recently, indicating potential blockers or abandoned work."
   - Parameters:
     - `stale_days` (number, optional, default 7): Number of days without update to consider stale
   - Query: SELECT work items WHERE Status IN ('Active', 'New') AND CreatedDate <= DATEADD(day, -stale_days, GETDATE()) AND ResolvedDate IS NULL

8. **get_release_forecast** (feature-flagged, see below)
   - Description: "Forecasts whether the release will land on its target date at the team's current pace. Returns remaining scope, sprints left before the target date, current and recent average velocity, projected shortfall, the velocity required to hit the date, and the projected finish date at the current pace. Use for questions like 'Will we make the release?' or 'At our current pace, when will we finish?'"
   - No parameters required
   - Logic (compute in SQL or TypeScript, keep it readable):
     - `CompletedToDate` = SUM(Sprints.CompletedPoints)
     - `RemainingPoints` = ReleasePlan.TotalScopePoints - CompletedToDate
     - `CurrentSprintEnd` = EndDate of the sprint WHERE Status = 'Active'
     - `SprintsRemaining` = FLOOR(DATEDIFF(day, CurrentSprintEnd, TargetDate) / SprintLengthDays). If the target date has passed, return 0 and say so
     - `CurrentVelocity` = TeamVelocity of the most recent Completed sprint
     - `Avg3Velocity` = average TeamVelocity of the last 3 Completed sprints
     - `ProjectedPointsAtCurrentPace` = CurrentVelocity * SprintsRemaining
     - `ShortfallPoints` = MAX(0, RemainingPoints - ProjectedPointsAtCurrentPace)
     - `RequiredVelocity` = RemainingPoints / SprintsRemaining, rounded to 1 decimal
     - `ProjectedFinishDateAtCurrentPace` = CurrentSprintEnd + CEILING(RemainingPoints / CurrentVelocity) * SprintLengthDays days
     - `OnTrack` = ProjectedPointsAtCurrentPace >= RemainingPoints
   - Return all of the above plus ReleaseName and TargetDate as a flat JSON object

### Feature-flagged tool registration (Demo Part 2)

`get_release_forecast` must only be visible to clients when the flag is on. This is how the demo shows a server-side change reaching the agent without touching Copilot Studio.

- Add `db/featureFlags.ts` with `isFeatureEnabled(flagName: string): Promise<boolean>` that runs `SELECT IsEnabled FROM FeatureFlags WHERE FlagName = @flagName` (parameterized). Return `false` if the row is missing or the query fails.
- In the `ListToolsRequestSchema` handler, always return tools 1-7. Append `get_release_forecast` only when `await isFeatureEnabled("ForecastToolEnabled")` is `true`. Read the flag on every call; do NOT cache it.
- In the `CallToolRequestSchema` handler, check the flag again before running `get_release_forecast`. If it is off, return a structured error: `"get_release_forecast is not currently enabled on this server."`
- Because the server is stateless and a fresh `Server` instance is created per request, no restart is needed when the flag changes.
- Log each flag read to the console (`[MCP] ForecastToolEnabled = true`) so the change is visible in the terminal on stage.

### Environment configuration
Create a `.env` file with the following variables and a `.env.example` as a template:

```env
# SQL Server Connection
DB_SERVER=localhost
DB_DATABASE=ProjectOrion

# Authentication: Choose ONE of the following approaches:

# Option 1: Windows Authentication (trusted connection - local dev)
DB_TRUSTED_CONNECTION=true

# Option 2: SQL Server Authentication (username/password)
# DB_TRUSTED_CONNECTION=false
# DB_USER=sa
# DB_PASSWORD=YourPassword

# Option 3: Microsoft Entra ID Authentication (Azure SQL production)
# DB_TRUSTED_CONNECTION=false
# DB_AUTH_TYPE=azure-active-directory-default
# Note: Uses DefaultAzureCredential - works with managed identity, Azure CLI, VS Code, etc.

# SSL/TLS Settings
DB_TRUST_SERVER_CERTIFICATE=true
# DB_ENCRYPT=true  # Enable for Azure SQL

# MCP Server Configuration
MCP_SERVER_NAME=project-orion-mcp-server
MCP_SERVER_VERSION=1.0.0
MCP_HTTP_PORT=3000
MCP_TRANSPORT=http
```

### Project structure
Scaffold the following folder and file structure:

```
project-orion-mcp-server/
├── src/
│   ├── index.ts              # MCP server entry point, HTTP/stdio transport, tool registration
│   ├── db/
│   │   ├── connection.ts     # SQL Server connection pool using mssql
│   │   ├── featureFlags.ts   # isFeatureEnabled(): reads FeatureFlags on every call
│   │   └── queries.ts        # All SQL query functions, one per tool
│   └── tools/
│       ├── sprints.ts        # Tool handlers: get_current_sprint, get_sprint_history
│       ├── workItems.ts      # Tool handlers: get_critical_work_items, get_work_items_by_sprint, get_stalled_work_items
│       ├── healthMetrics.ts  # Tool handlers: get_latest_health_metrics, get_health_metrics_trend
│       └── release.ts        # Tool handler: get_release_forecast (feature-flagged)
├── .env                      # Local environment variables (gitignored)
├── .env.example              # Template for environment variables
├── .gitignore                # Ignore node_modules, .env, dist
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript config targeting Node.js
└── README.md                 # Setup and usage instructions
```

### HTTP Server Implementation (Critical for Copilot Studio)

The `src/index.ts` must implement the HTTP server as follows:

```typescript
import express, { Request, Response } from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListResourcesRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const app = express();

// CORS is required for Copilot Studio
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id'],
  exposedHeaders: ['Mcp-Session-Id'],
}));

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "project-orion-mcp-server" });
});

// MCP endpoint - MUST use stateless mode for Copilot Studio
app.all("/mcp", async (req: Request, res: Response) => {
  // Create stateless transport for each request
  // sessionIdGenerator: undefined = stateless mode (critical!)
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  // Create fresh server instance
  const server = createServer();
  await server.connect(transport);

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000);
```

### Server Capabilities (Important)

When creating the MCP Server, you MUST declare both `tools` and `resources` capabilities, even if resources returns empty. Copilot Studio may query for resources:

```typescript
const server = new Server(
  { name: "project-orion-mcp-server", version: "1.0.0" },
  {
    capabilities: {
      tools: {},
      resources: {},  // Required even if empty
    },
  }
);

// Must handle resources listing even if no resources exist
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});
```

### Additional requirements
- Support both HTTP and stdio transports (HTTP is default, stdio for local CLI testing)
- Connection pool should be initialized once on startup and reused across tool calls
- All tool handlers should return clean JSON-serializable objects, not raw SQL recordsets
- Include proper error handling: if a query fails, return a structured error message rather than throwing
- Add JSDoc comments on each tool explaining what it returns and when to use it
- Include SIGINT/SIGTERM handlers to close the database connection pool gracefully
- The README should include: prerequisites, installation steps, how to configure the .env, how to run locally, and dev tunnel setup for Copilot Studio

### Package.json scripts
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "start:stdio": "node dist/index.js stdio",
    "start:http": "node dist/index.js http",
    "dev": "tsc && node dist/index.js"
  }
}
```

### Required dependencies
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "cors": "^2.8.6",
    "dotenv": "^16.4.5",
    "express": "^5.2.1",
    "mssql": "^10.0.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/mssql": "^9.1.5",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3"
  }
}
```

### Dev Tunnel Setup for Copilot Studio

To expose the local server to Copilot Studio, use Azure Dev Tunnels:

1. Install: `winget install Microsoft.devtunnel`
2. Login: `devtunnel user login`
3. Create and host tunnel: `devtunnel host -p 3000 --allow-anonymous`
4. Use the generated HTTPS URL (e.g., `https://xxxxx-3000.use.devtunnels.ms/mcp`) in Copilot Studio

### Tone of the code
This is a conference demo. The code should be clean, readable, and well-commented. A developer in the audience seeing this for the first time should immediately understand the pattern. Favor clarity over cleverness.

### Common Pitfalls to Avoid
1. **Do NOT use SSEServerTransport** - It doesn't work reliably with Copilot Studio
2. **Do NOT use session tracking** - Copilot Studio works best with stateless mode
3. **Do NOT forget resources capability** - Even if empty, Copilot Studio may request it
4. **Do NOT hardcode credentials** - Always use .env and support both Windows Auth and SQL Auth
5. **Always test with the /health endpoint first** before testing MCP tools

### Future Expansion: Microsoft Entra ID Authentication

For production Azure SQL deployments, support Microsoft Entra ID (formerly Azure AD) authentication using the `@azure/identity` package:

**Additional dependency:**
```json
{
  "dependencies": {
    "@azure/identity": "^4.0.0"
  }
}
```

**Connection configuration update in `connection.ts`:**
```typescript
import { DefaultAzureCredential } from "@azure/identity";

function buildConfig(): sql.config {
  const config: sql.config = {
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_DATABASE || "ProjectOrion",
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };

  if (process.env.DB_AUTH_TYPE === "azure-active-directory-default") {
    // Use DefaultAzureCredential for Entra ID authentication
    // Works with: Managed Identity, Azure CLI, VS Code Azure extension, etc.
    config.authentication = {
      type: "azure-active-directory-default",
      options: {
        credential: new DefaultAzureCredential(),
      },
    };
  } else if (process.env.DB_TRUSTED_CONNECTION === "true") {
    config.options!.trustedConnection = true;
  } else {
    config.user = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
  }

  return config;
}
```

**Benefits of Entra ID authentication:**
- No passwords stored in configuration
- Works with Azure Managed Identity in production
- Supports local development via Azure CLI (`az login`)
- Automatic token refresh handled by the SDK
- Audit trail through Azure AD logs

````
