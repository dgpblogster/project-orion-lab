# Project Orion Dashboard

The Next.js dashboard shown on stage in "Same Agent, Two Architectures". It gives the audience a visual of the data the agents reason over, laid out in the order the agents are questioned, and it holds the switch that "deploys" the MCP forecast tool.

This is the exact code shown on stage. To generate your own version with GitHub Copilot instead, use `../copilot-nextjs-dashboard-prompt.md`.

## What's on the page

| Area | Shows | Agent question it pairs with |
|---|---|---|
| Header | Release target, days left, data date, health status, **MCP forecast tool** switch | |
| MCP tools strip | The tools the MCP server offers right now, read live from `tools/list` | |
| Readiness hero | Readiness score with its daily trend and the 75 / 50 thresholds | "What is the current release readiness score?" |
| KPI tiles | Critical blockers (click for the flyout), sprint completion, last sprint velocity | "What critical bugs are open?" |
| Blockers panel | Open critical and high bugs plus stalled work | "What is blocking the release?" |
| Velocity panel | Velocity by sprint with a 3-sprint trend line | "Any patterns across issues and sprint health?" |
| Forecast panel | The answer from `get_release_forecast`. Locked until the switch is on | "At our current pace, will we make the release?" |

Each panel carries a small tag with its question. Set `SHOW_QUESTIONS` in `components/v2/Panel.tsx` to `false` to hide them.

### The forecast switch

The switch writes `FeatureFlags.ForecastToolEnabled` in SQL (`POST /api/flags`). It never calls the MCP server. The server reads the flag on every request, so the new tool appears in the tools strip, in the forecast panel, and in the Copilot Studio agent without anyone touching the agent.

The forecast panel calls the MCP server's own `get_release_forecast` tool (`/api/mcp-forecast`), so the dashboard is simply a second client of the same server-side tool.

## Prerequisites

- Node.js 18 or later
- The `ProjectOrion` database, created by `../../sql/project-orion-setup.sql`
- The Project Orion MCP server running locally (for the tools strip and forecast panel)

## Run it

```bash
npm install
cp .env.example .env.local    # then set your connection details
npm run dev -- -p 3001
```

Open http://localhost:3001. The MCP server uses port 3000, so start it first and run the dashboard on 3001.

If `npm run dev` exits right after "Ready", delete the `.next` folder and run it again. After changing `tailwind.config.ts`, restart the dev server.

### Configuration (`.env.local`)

```env
DB_SERVER=localhost
DB_DATABASE=ProjectOrion
DB_TRUSTED_CONNECTION=true          # or false with DB_USER / DB_PASSWORD
DB_TRUST_SERVER_CERTIFICATE=true

MCP_SERVER_URL=http://localhost:3000/mcp
```

The flag route writes to the database, so keep the dashboard local. Do not expose it through a tunnel.

## API routes

| Route | Method | Returns |
|---|---|---|
| `/api/health` | GET | Health metrics trend |
| `/api/sprint` | GET | Active sprint |
| `/api/velocity` | GET | All sprints for the velocity chart |
| `/api/bugs` | GET | Open bugs by priority in the active sprint |
| `/api/critical` | GET | Open critical items with owner, age and notes (flyout) |
| `/api/stalled` | GET | Stalled work in the active sprint |
| `/api/release` | GET | Release target and days remaining |
| `/api/flags` | GET, POST | Read or set `ForecastToolEnabled` |
| `/api/mcp-tools` | GET | The MCP server's current tool list |
| `/api/mcp-forecast` | GET | The result of `get_release_forecast`, or locked |

## Project layout

```
app/
├── page.tsx                  # Dashboard layout
├── layout.tsx, globals.css   # Light theme, Geist font
└── api/                      # Routes listed above
components/
├── ForecastToolToggle.tsx    # Header switch
├── StatusBadge.tsx
└── v2/
    ├── Panel.tsx             # Card shell and question tags
    ├── ToolsStrip.tsx
    ├── ReadinessHero.tsx
    ├── KpiTile.tsx           # KPI tile and progress ring
    ├── BlockersPanel.tsx
    ├── VelocityPanel.tsx
    ├── ForecastPanel.tsx
    └── CriticalFlyout.tsx
lib/
├── db.ts                     # mssql connection pool
└── useCountUp.ts             # Number animation and SQL date formatting
```

## Colors

Light theme tuned for conference projectors (`tailwind.config.ts`):

| Token | Hex |
|---|---|
| background | #F4F6FA |
| surface | #FFFFFF |
| border | #E3E7EF |
| text-primary | #0B1324 |
| text-muted | #5B6578 |
| brand | #4338CA |
| accent-green | #059669 |
| accent-yellow | #D97706 |
| accent-red | #DC2626 |
| accent-blue | #2563EB |

---

*Fictional sample data for a conference demo.*
