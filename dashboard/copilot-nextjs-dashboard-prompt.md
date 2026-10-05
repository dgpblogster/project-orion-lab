# GitHub Copilot Prompt: Project Orion Next.js Dashboard

## How to use this prompt
1. Open a new folder called `project-orion-dashboard` in VS Code
2. Open GitHub Copilot Chat (`Ctrl+Alt+I`)
3. Copy everything under the "PROMPT" section below
4. Paste it into Copilot Chat and send
5. Follow any additional instructions Copilot provides to install
   dependencies and run the app


> **Reference implementation:** the dashboard shown on stage is in `project-orion-dashboard/` next to this file.

---

## PROMPT

I need you to scaffold a Next.js read-only dashboard called
**Project Orion Dashboard**. This is a conference demo application
that visualizes project health data from a SQL Server database.
The dashboard is shown on stage alongside two Copilot Studio agents.
It is laid out in the order the agents are questioned, so the
audience can see each answer on screen as the agent gives it. It
also holds the switch that "deploys" a new MCP server tool live.

### Project name
`project-orion-dashboard`

### Tech stack
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts for data visualization
- `mssql` package for SQL Server connectivity
- `geist` font package for typography
- `dotenv` for environment configuration

### Design direction
Light theme, modern and calm, tuned for a conference projector. Rounded
white cards on a soft gray-blue background, soft shadows, generous
spacing, large numbers. Not flat and static: numbers count up on load,
cards rise in with a short stagger, and live indicators pulse gently.
The page should still communicate "this project is under pressure"
through amber and red accents, not through a dark theme.

Color palette (define as Tailwind theme colors):
- background: #F4F6FA
- surface: #FFFFFF
- border: #E3E7EF
- text-primary: #0B1324
- text-muted: #5B6578
- brand: #4338CA, brand-soft: #EEF0FF
- accent-green: #059669 (healthy, completed)
- accent-yellow: #D97706 (warning, at risk)
- accent-red: #DC2626 (critical, blocked)
- accent-blue: #2563EB (neutral data, charts)
- Card shadow: `0 1px 2px rgba(16,24,40,0.04), 0 10px 28px -14px rgba(16,24,40,0.16)`

Typography: the `geist` package (Geist Sans and Geist Mono).

### Database context
Connect to a local SQL Server database called `ProjectOrion`.
The database has five tables:

**Sprints**
```sql
SprintId, SprintName, StartDate, EndDate, Status (Completed|Active),
PlannedPoints, CompletedPoints, RolloverPoints, TeamVelocity, Notes
```

**WorkItems**
```sql
WorkItemId, SprintId, Title, Type (Task|Bug|Story), Priority
(Critical|High|Medium|Low), Status (New|Active|Resolved|Closed|Blocked),
AssignedTo, StoryPoints, GitHubIssueRef, CreatedDate, ResolvedDate, Notes
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

### Environment configuration
Create a `.env.local` file with:
```
# MCP server (tools strip and forecast panel)
MCP_SERVER_URL=http://localhost:3000/mcp

# Local SQL Server with SQL Authentication
DB_SERVER=localhost
DB_USER=sa
DB_PASSWORD=<your-password>
DB_DATABASE=ProjectOrion
DB_TRUSTED_CONNECTION=false
DB_TRUST_SERVER_CERTIFICATE=true

# Local SQL Server with Windows Authentication (alternative)
# DB_SERVER=localhost
# DB_DATABASE=ProjectOrion
# DB_TRUSTED_CONNECTION=true
# DB_TRUST_SERVER_CERTIFICATE=true

# Azure SQL (production swap)
# DB_SERVER=<your-server>.database.windows.net
# DB_USER=<username>
# DB_PASSWORD=<password>
# DB_TRUSTED_CONNECTION=false
# DB_TRUST_SERVER_CERTIFICATE=false
```

Note: Set `DB_TRUSTED_CONNECTION=false` when using SQL Authentication
with DB_USER/DB_PASSWORD credentials.

### Project structure
```
project-orion-dashboard/
├── app/
│   ├── layout.tsx               # Root layout, light theme, Geist font
│   ├── page.tsx                 # Dashboard layout (client component)
│   ├── globals.css              # Tailwind base, "rise" entrance animation
│   └── api/
│       ├── health/route.ts      # GET health metrics trend
│       ├── sprint/route.ts      # GET active sprint
│       ├── velocity/route.ts    # GET all sprints for the velocity chart
│       ├── bugs/route.ts        # GET open bugs by priority
│       ├── critical/route.ts    # GET open critical items for the flyout
│       ├── stalled/route.ts     # GET stalled work in the active sprint
│       ├── release/route.ts     # GET release target and days remaining
│       ├── flags/route.ts       # GET / POST the ForecastToolEnabled flag
│       ├── mcp-tools/route.ts   # GET the MCP server's current tool list
│       └── mcp-forecast/route.ts # GET get_release_forecast from the MCP server
├── components/
│   ├── ForecastToolToggle.tsx   # Header switch that "deploys" the forecast tool
│   ├── StatusBadge.tsx          # Healthy / At Risk / Critical pill
│   └── v2/
│       ├── Panel.tsx            # Card shell, PanelTitle, QuestionTag
│       ├── ToolsStrip.tsx       # Live MCP tool chips
│       ├── ReadinessHero.tsx    # Score plus trend chart
│       ├── KpiTile.tsx          # KpiTile and ProgressRing
│       ├── BlockersPanel.tsx
│       ├── VelocityPanel.tsx
│       ├── ForecastPanel.tsx
│       └── CriticalFlyout.tsx   # Slide-in panel of critical items
├── lib/
│   ├── db.ts                    # SQL Server connection pool
│   └── useCountUp.ts            # Count-up hook, formatSqlDate (UTC)
├── .env.local                   # Local environment variables (gitignored)
├── .env.example
├── tailwind.config.ts
└── README.md
```

### Dashboard layout
One page, top to bottom. Each panel shows a small "question tag" with
the agent question it answers, controlled by a `SHOW_QUESTIONS`
constant in `Panel.tsx` so it can be turned off.

**Header**
- Brand mark, "Project Orion", and the line
  "Release health · Orion 1.0 target 15 Feb 2027 · N days left"
  (from `/api/release`; days left in amber)
- A pulsing green "Data as of <date>" indicator (latest
  HealthMetrics.RecordedDate)
- A status pill from ReleaseReadinessScore: >= 75 Healthy (green),
  >= 50 At Risk (amber), < 50 Critical (red)
- **Forecast tool toggle** (`ForecastToolToggle`):
  - A switch labeled "MCP forecast tool" with state text "Off" (muted)
    or "Deployed" (green)
  - Reads state from `GET /api/flags`; on click calls `POST /api/flags`
    and updates immediately. No confirmation dialog
  - At least 44px tall so it is easy to hit on stage
  - After a change, dispatch a `window` event `orion:tools-refresh`
    so the tools strip and forecast panel update right away
  - It only writes to SQL. It never calls the MCP server

**MCP tools strip** (`ToolsStrip`)
- One chip per tool name from `GET /api/mcp-tools`, plus the server
  name and an online/offline dot
- When `get_release_forecast` appears, it animates in and is
  highlighted as new
- Refreshes on `orion:tools-refresh` and every 30 seconds otherwise
  (slow on purpose, so the MCP server's terminal stays readable)

**Readiness hero** (8 of 12 columns) - "What is the current release
readiness score?"
- The latest score, large, counting up from 0, with "/100"
- A Recharts area or line chart of every daily snapshot from
  `/api/health`, oldest to newest, with dashed reference lines at 75
  (Healthy) and 50 (At Risk)
- Blocker count and velocity trend from the latest snapshot

**KPI column** (4 of 12 columns, three `KpiTile`s)
1. "Critical blockers": count of open Critical bugs in red, pulsing
   when above 0, with their GitHub refs (#25 · #26 · #27). Clickable,
   with a "View details" hint, opens the `CriticalFlyout`. Question
   tag: "What critical bugs are open?"
2. "<Sprint name> completion": CompletedPoints / PlannedPoints as a
   percentage with a `ProgressRing`, and "X of Y pts · ends <date>"
3. "Velocity, last sprint": the last completed sprint's velocity with
   "Down from a N pt peak"

**Bottom row** (three equal panels)
- `BlockersPanel` - "What is blocking the release?": open Critical and
  High bugs with GitHub refs (from `/api/bugs`), then stalled work
  (from `/api/stalled`) with owner and note. A "Details" link opens
  the flyout
- `VelocityPanel` - "Any patterns across issues and sprint health?":
  Recharts ComposedChart. Bars for completed sprints (TeamVelocity),
  the active sprint as points so far in amber, bar labels, and a
  3-sprint moving average line
- `ForecastPanel` - "At our current pace, will we make the release?":
  calls `/api/mcp-forecast`. While the tool is not available, show a
  locked state ("Forecast tool not deployed on the MCP server"). Once
  available, show On track / Not on track, projected finish date vs
  target, current vs required velocity, and the shortfall in points.
  Refresh on `orion:tools-refresh`

**CriticalFlyout**
- Slides in from the right over a dimmed backdrop. Esc or backdrop
  click closes it
- One card per open Critical item from `/api/critical`: title, GitHub
  issue link, owner, status, points, days open and notes

### API routes
Each route connects through the pool in `lib/db.ts`, returns clean
JSON, handles errors with proper status codes, and sets
`export const dynamic = "force-dynamic"`.

**GET /api/health**
```sql
SELECT TOP 30 RecordedDate, ReleaseReadinessScore, BugCriticalCount,
       BlockerCount, VelocityTrend, SprintCompletionRate
FROM HealthMetrics
ORDER BY RecordedDate DESC
```

**GET /api/sprint**
```sql
SELECT TOP 1 * FROM Sprints WHERE Status = 'Active'
```

**GET /api/velocity**
```sql
SELECT SprintId, SprintName, TeamVelocity, Status,
       CompletedPoints, PlannedPoints
FROM Sprints
ORDER BY SprintId ASC
```

**GET /api/bugs**
```sql
SELECT
  wi.Priority,
  COUNT(*) AS Count,
  STRING_AGG(
    CASE WHEN wi.Priority IN ('Critical','High')
    THEN wi.Title + ISNULL(' (' + wi.GitHubIssueRef + ')','')
    END, '|'
  ) AS TopIssues
FROM WorkItems wi
JOIN Sprints s ON wi.SprintId = s.SprintId
WHERE s.Status = 'Active'
  AND wi.Type = 'Bug'
  AND wi.Status NOT IN ('Resolved','Closed')
GROUP BY wi.Priority
```

**GET /api/critical**
Open Critical items in the active sprint with WorkItemId, Title, Type,
Status, AssignedTo, StoryPoints, GitHubIssueRef, CreatedDate,
`DATEDIFF(day, CreatedDate, GETDATE()) AS DaysOpen` and Notes. Also
return the GitHub repo (owner/name) used to build issue links.

**GET /api/stalled**
```sql
SELECT TOP 3 wi.Title, wi.GitHubIssueRef, wi.AssignedTo, wi.Notes
FROM WorkItems wi
JOIN Sprints s ON wi.SprintId = s.SprintId
WHERE s.Status = 'Active'
  AND wi.Status IN ('Active', 'New')
  AND wi.Notes LIKE 'STALLED%'
```

**GET /api/release**
```sql
SELECT TOP 1 ReleaseName, TargetDate, TotalScopePoints,
       DATEDIFF(day, CAST(GETDATE() AS DATE), TargetDate) AS DaysRemaining
FROM ReleasePlan
ORDER BY ReleaseId
```

**GET /api/flags**
```sql
SELECT IsEnabled FROM FeatureFlags WHERE FlagName = 'ForecastToolEnabled'
```
Return `{ "forecastToolEnabled": true | false }`.

**POST /api/flags**
Body: `{ "forecastToolEnabled": true | false }`. Validate the body is a
boolean, then run a parameterized update:
```sql
UPDATE FeatureFlags
SET IsEnabled = @enabled, UpdatedAt = SYSUTCDATETIME()
WHERE FlagName = 'ForecastToolEnabled'
```
Return the new state. This route is for the local demo dashboard only.
Do not expose the dashboard through a tunnel.

**GET /api/mcp-tools** and **GET /api/mcp-forecast**
Call the MCP server at `MCP_SERVER_URL` with a JSON-RPC POST
(`tools/list`, or `tools/call` for `get_release_forecast` with empty
arguments). Send `Accept: application/json, text/event-stream` and
parse either a plain JSON body or an SSE stream (`data:` lines).
- `/api/mcp-tools` returns `{ online, serverName, tools: string[] }`
- `/api/mcp-forecast` returns `{ online, available, forecast }`.
  `available` is false when the server refuses the call because the
  flag is off
Both return `online: false` instead of failing when the server is down.

### Data refresh
- The page polls its API routes every 30 seconds (`fetch` with
  `cache: "no-store"`)
- Re-polling with unchanged values must not replay the count-up
  animations
- Format SQL dates in UTC (`formatSqlDate`) so they do not shift a day
  in US time zones

### Additional requirements
- Run the dashboard on port 3001 (`npm run dev -- -p 3001`); the MCP
  server uses 3000
- All panels should have loading states while data fetches
- Empty states handled gracefully if a query returns no results
- The dashboard should be fully responsive but optimized for a
  1920x1080 presentation display (widescreen laptop or external monitor)
- Add a small "Project Orion Demo" watermark in the bottom right corner
  so the audience knows this is demo data
- README should include: prerequisites, installation, .env setup,
  how to run locally, and the Azure SQL swap instructions

### Tone of the code
This is a conference demo. Code should be clean, well-commented, and
immediately readable. A developer in the audience seeing this for the
first time should understand exactly what each component does without
explanation. Favor clarity over cleverness.
