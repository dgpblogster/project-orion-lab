# GitHub Copilot Prompt: Project Orion Next.js Dashboard

## How to use this prompt
1. Open a new folder called `project-orion-dashboard` in VS Code
2. Open GitHub Copilot Chat (`Ctrl+Alt+I`)
3. Copy everything under the "PROMPT" section below
4. Paste it into Copilot Chat and send
5. Follow any additional instructions Copilot provides to install
   dependencies and run the app

---

## PROMPT

I need you to scaffold a Next.js read-only dashboard called
**Project Orion Dashboard**. This is a conference demo application
that visualizes project health data from a SQL Server database.
The dashboard will be shown on stage before an AI agent demo to
give the audience context for the data the agent will reason over.

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
Dark theme. Professional engineering dashboard aesthetic. Think
mission control: dark backgrounds, high-contrast data, status
indicators that feel live and urgent. The visual should immediately
communicate "this project is under pressure" without saying a word.

Color palette:
- Background: #0a0f1e (deep navy)
- Surface: #111827 (dark card backgrounds)
- Border: #1f2937
- Text primary: #f9fafb
- Text muted: #6b7280
- Accent green: #10b981 (healthy, completed)
- Accent yellow: #f59e0b (warning, at risk)
- Accent red: #ef4444 (critical, blocked)
- Accent blue: #3b82f6 (neutral data, charts)

Typography: Use the `Geist` font family (included with Next.js 14)
for a clean, technical feel.

### Database context
Connect to a local SQL Server database called `ProjectOrion`.
The database has three tables:

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

### Environment configuration
Create a `.env.local` file with:
```
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
│   ├── layout.tsx              # Root layout, dark theme, Geist font
│   ├── page.tsx                # Main dashboard page
│   ├── globals.css             # Tailwind base styles, custom scrollbar
│   └── api/
│       ├── sprint/route.ts     # GET current sprint data
│       ├── velocity/route.ts   # GET sprint history for velocity chart
│       ├── bugs/route.ts       # GET bug counts by priority
│       └── health/route.ts     # GET health metrics trend (last 30 days)
├── components/
│   ├── SprintHealthCard.tsx    # Current sprint completion panel
│   ├── BugTrackerCard.tsx      # Open bugs by priority panel
│   ├── ReleaseReadinessCard.tsx # Readiness score gauge panel
│   ├── VelocityChart.tsx       # Team velocity bar chart panel
│   ├── StatusBadge.tsx         # Reusable status indicator component
│   └── MetricCard.tsx          # Reusable stat card component
├── lib/
│   └── db.ts                   # SQL Server connection pool
├── .env.local                  # Local environment variables (gitignored)
├── .env.example                # Template
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs          # PostCSS configuration for Tailwind
├── next.config.mjs             # Next.js configuration
└── README.md
```

### Dashboard layout
Single page dashboard with a header and four panels in a 2x2 grid.

**Header:**
- Project name: "Project Orion" in large display text
- Subtitle: "Release Health Dashboard"
- Last updated timestamp (pulled from latest HealthMetrics.RecordedDate)
- A status pill showing overall health: green "Healthy" / yellow
  "At Risk" / red "Critical" based on ReleaseReadinessScore:
  - Score >= 75: Healthy (green)
  - Score >= 50: At Risk (yellow)
  - Score < 50: Critical (red)

**Panel 1: Sprint Health (top left)**
Data source: Sprints table, current active sprint
Show:
- Sprint name and date range
- Completion rate as a horizontal progress bar
  (CompletedPoints / PlannedPoints as percentage)
- Three stat rows: Planned Points, Completed Points, Rollover Points
- Rollover points highlighted in yellow if > 5, red if > 10
- VelocityTrend badge from latest HealthMetrics

**Panel 2: Bug Tracker (top right)**
Data source: WorkItems table, current sprint
Show:
- Total open bug count (large number, prominent)
- Breakdown by priority as a small horizontal bar chart:
  Critical (red), High (orange), Medium (yellow), Low (gray)
- Critical bug count highlighted with a red alert indicator
  if BugCriticalCount > 0
- List of up to 3 critical/high bugs by title with GitHub issue
  reference number if available (GitHubIssueRef field)

**Panel 3: Release Readiness (bottom left)**
Data source: HealthMetrics table, latest record
Show:
- Large score number (e.g. "52") positioned at bottom of gauge with "/100" in smaller text
- A semicircular gauge visualization using Recharts RadialBarChart
  Color the gauge based on score thresholds:
  - >= 75: green (#10b981)
  - >= 50: yellow (#f59e0b)
  - < 50: red (#ef4444)
- Blocker count below the gauge with a warning icon if > 0
- A one-line status message based on score:
  - >= 75: "Release tracking well"
  - >= 50: "Release at risk. Action required."
  - < 50: "Release in jeopardy. Critical blockers unresolved."

**Panel 4: Team Velocity (bottom right)**
Data source: Sprints table, all sprints ordered by SprintId
Show:
- Bar chart using Recharts BarChart
- X axis: sprint names (Sprint 1 through Sprint 5)
- Y axis: velocity points
- Bars colored: completed sprints in blue (#3b82f6), active sprint
  in yellow (#f59e0b)
- A trend line overlay showing the velocity trajectory
- Label each bar with its velocity value

### API routes
Each API route should:
- Connect to SQL Server using the connection pool in lib/db.ts
- Return clean JSON
- Handle errors gracefully with appropriate HTTP status codes

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

**GET /api/health**
```sql
SELECT TOP 30
  RecordedDate,
  ReleaseReadinessScore,
  BugCriticalCount,
  BlockerCount,
  VelocityTrend
FROM HealthMetrics
ORDER BY RecordedDate DESC
```

### Data refresh
- Dashboard data refreshes every 30 seconds using Next.js revalidation
- Add a subtle "Live" indicator with a pulsing green dot in the header
  to signal the data is refreshing automatically

### Additional requirements
- All panels should have loading skeleton states while data fetches
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
