# Project Orion MCP Server

The custom TypeScript MCP server used in **Demo Part 2** of "Same Agent, Two Architectures". It exposes Project Orion's SQL Server data as tools for a Copilot Studio agent, over Streamable HTTP.

This is the exact code shown on stage. To generate your own version with GitHub Copilot instead, use `../copilot-mcp-scaffold-prompt.md`.

## Tools

| Tool | Purpose |
|---|---|
| `get_current_sprint` | Active sprint details, completion and velocity |
| `get_sprint_history` | Velocity trend across completed sprints |
| `get_critical_work_items` | Open Critical and High priority items |
| `get_work_items_by_sprint` | Work items filtered by sprint and status |
| `get_stalled_work_items` | Items with no recent activity |
| `get_latest_health_metrics` | Latest health snapshot and readiness score |
| `get_health_metrics_trend` | Readiness score trend over N days |
| `get_release_forecast` | **Feature-flagged.** Projected finish date against the release target |

### The feature-flagged tool

`get_release_forecast` is the server-side change in the demo. On every request the server reads `FeatureFlags.ForecastToolEnabled` from SQL (`src/db/featureFlags.ts`):

- **Off:** `tools/list` returns 7 tools, and a direct `tools/call` to the forecast is refused.
- **On:** `tools/list` returns 8 tools. The Copilot Studio agent discovers the new tool on its next turn, with no edit and no republish.

The dashboard's "MCP forecast tool" switch flips that flag. You can also flip it in SQL:

```sql
UPDATE FeatureFlags SET IsEnabled = 1, UpdatedAt = SYSUTCDATETIME()
WHERE FlagName = 'ForecastToolEnabled';
```

The forecast math lives in `src/tools/release.ts`: remaining points from `ReleasePlan.TotalScopePoints`, sprints left to the target date, current and 3-sprint average velocity, projected shortfall, required velocity and projected finish date.

## Project layout

```
src/
├── index.ts              # Tool definitions, MCP handlers, HTTP and stdio transports
├── db/
│   ├── connection.ts     # mssql connection pool from .env
│   ├── queries.ts        # SQL for each tool (mirrored by the stored procedures)
│   └── featureFlags.ts   # isFeatureEnabled(), read on every request
└── tools/
    ├── sprints.ts
    ├── workItems.ts
    ├── healthMetrics.ts
    └── release.ts        # get_release_forecast
```

## Prerequisites

- Node.js 18 or later
- The `ProjectOrion` database, created by `../../sql/project-orion-setup.sql`

## Run it

```bash
npm install
cp .env.example .env      # then set your connection details
npm run build
npm start                 # http://localhost:3000/mcp, health check at /health
```

Rebuild (`npm run build`) after any change to `src`. The server is stateless: each request gets a fresh MCP server instance, which is what lets a flag change show up immediately.

### Configuration (`.env`)

```env
DB_SERVER=localhost
DB_DATABASE=ProjectOrion
DB_TRUSTED_CONNECTION=true          # or false with DB_USER / DB_PASSWORD
DB_TRUST_SERVER_CERTIFICATE=true

MCP_SERVER_NAME=project-orion-mcp-server
MCP_SERVER_VERSION=1.0.0
MCP_HTTP_PORT=3000
MCP_TRANSPORT=http
```

For Azure SQL, set `DB_SERVER=<server>.database.windows.net`, SQL credentials, `DB_ENCRYPT=true` and `DB_TRUST_SERVER_CERTIFICATE=false`.

## Connecting Copilot Studio

Copilot Studio needs a public HTTPS endpoint. For the local demo, a Dev Tunnel on port 3000 provides one; see Step 4 of the lab README. That tunnel is a demo convenience only. A production design hosts the server in Azure (for example App Service or Container Apps) with OAuth in front of it.

---

*Fictional sample data for a conference demo.*
