# Project Orion: Same Agent, Two Architectures

## A Hands-On Lab for Copilot Studio + MCP

This lab is the companion to the session **"Same Agent, Two Architectures: When MCP Wins (And When It Doesn't)"** presented at Community Summit NA 2026 in Nashville, TN.

You will build everything you saw on stage: a connector-based Copilot Studio agent, a custom TypeScript MCP Server, a GitHub-connected agent, and a Next.js project health dashboard. By the end, you will have a working demonstration of when MCP earns its place in a Copilot Studio architecture, and when a connector is the right tool for the job.

**Session presented by:** Mariano Gomez Bent, Chief Product & Technology Officer at Mekorma

---

## What You Will Build

| Component | Technology | Purpose |
|---|---|---|
| Project Orion database | SQL Server | Stores sprint metrics, work items, health data |
| GitHub repository | GitHub | Tracks issues correlated to SQL data |
| Connector agent | Copilot Studio | Demo Part 1: SQL Server and GitHub connectors, every tool configured in the agent |
| Custom MCP Server | TypeScript, Node.js | Exposes SQL data to Copilot Studio |
| MCP agent | Copilot Studio | Demo Part 2: a server-side change reaches the agent without republishing |
| Project health dashboard | Next.js, React | Visualizes SQL data and hosts the forecast tool switch |

---

## Repo Structure

```
project-orion-lab/
├── README.md                                        # This file
├── docs/
│   └── project-orion-lab-guide.pdf                  # Earlier PDF guide (this README is current)
├── sql/
│   └── project-orion-setup.sql                      # Database schema and seed data
├── github/
│   └── create-github-issues.sh                      # Creates all 35 GitHub issues
├── mcp-server/
│   ├── copilot-mcp-scaffold-prompt.md               # Prompt: generate the MCP Server with Copilot
│   └── project-orion-mcp-server/                    # Reference code: the server shown on stage
├── dashboard/
│   ├── copilot-nextjs-dashboard-prompt.md           # Prompt: generate the dashboard with Copilot
│   └── project-orion-dashboard/                     # Reference code: the dashboard shown on stage
└── copilot-studio/
    ├── copilot-studio-connector-agent-prompt.md     # Prompt: connector agent (Demo Part 1)
    └── copilot-studio-agent-prompt.md               # Prompt: MCP agent (Demo Part 2)
```

---

## Prerequisites

Before starting, confirm you have the following installed and configured:

- **VS Code** 1.82 or later
- **Node.js** 18 or later with npm
- **TypeScript** installed globally (`npm install -g typescript`)
- **GitHub CLI** (`winget install --id GitHub.cli` on Windows)
- **Git** with Git Bash (Windows users)
- **SQL Server** running locally (SQL Server Express is free and sufficient)
- **SQL Server Management Studio (SSMS)** or Azure Data Studio
- **Azure Dev Tunnels CLI** (`winget install Microsoft.DevTunnel` on Windows)
- A **GitHub account** (personal account is fine)
- A **Microsoft Copilot Studio license** (trial available at copilotstudio.microsoft.com)
- A **GitHub Personal Access Token** with `repo` scope

---

## Architecture Overview

The session contrasts two approaches to building the same agent:

**Version 1: Connector Agent**
The agent uses standard connectors: the SQL Server connector (through the on-premises data gateway, calling 7 stored procedures) and the GitHub connector. It reasons across both sources and answers the project health questions well. The cost is change: every tool is added, configured and described in the agent, so a new capability means editing and republishing this agent, and every other agent that needs it.

**Version 2: MCP Agent**
The same agent rebuilt with two MCP Servers: the GitHub MCP Server for issue data and a custom TypeScript MCP Server that queries the Project Orion SQL database. The tools are defined once, on the server. When the server gains a new tool (the release forecast, switched on live from the dashboard), the agent picks it up without being edited or republished.

**The key distinction:** in both versions the agent decides when to call a tool. What changes is who owns the tools: each agent (connector) or the server (MCP).

**The decision signal:**
> "When many agents need the same tools, and those tools keep changing, that's your MCP signal."

---

## Lab Steps

---

### Step 1: Set Up the SQL Server Database

The Project Orion database is the foundation of everything. Set this up first.

**1.1 Run the setup script**

Open SQL Server Management Studio or Azure Data Studio and execute:

```
sql/project-orion-setup.sql
```

This script:
- Creates the `ProjectOrion` database
- Creates five tables: `Sprints`, `WorkItems`, `HealthMetrics`, `ReleasePlan`, `FeatureFlags`
- Seeds 5 sprints of history, 70 work items, and 25 daily health snapshots
- Seeds the Orion 1.0 release (target **15 Feb 2027**, 488 points of scope) and the `ForecastToolEnabled` flag (off)
- **Rolls every date forward so the latest health snapshot is today.** Tools such as `get_health_metrics_trend` and `get_stalled_work_items` filter by today's date, so run the script on the day of your demo (or the day before). Re-running it resets the flag to off.
- Runs verification queries to confirm data loaded correctly

> **Presenting this live? Pin the date.** By default the script rolls every date to the day you run it. To avoid reseeding on presentation day, set the demo date once, ahead of time: near the end of `sql/project-orion-setup.sql`, in section 7d, change
> ```sql
> DECLARE @AsOf   DATE = CAST(GETDATE() AS DATE);
> ```
> to your session date, for example
> ```sql
> DECLARE @AsOf   DATE = '2026-10-13';
> ```
> Run the script once. The latest health snapshot will carry that date, and you can rehearse beforehand without reseeding. Re-running it also resets the forecast tool switch to off, which is handy after a rehearsal.

**1.2 Verify the data**

After running the script, confirm the following verification query outputs:

| Sprint | Status | PlannedPoints | CompletedPoints | RolloverPoints |
|---|---|---|---|---|
| Sprint 1 | Completed | 42 | 40 | 2 |
| Sprint 2 | Completed | 44 | 43 | 1 |
| Sprint 3 | Completed | 45 | 38 | 7 |
| Sprint 4 | Completed | 44 | 33 | 11 |
| Sprint 5 | Active | 46 | 14 | 0 |

The latest health metric should show:
- `ReleaseReadinessScore`: 52
- `BugCriticalCount`: 3
- `BlockerCount`: 3
- `VelocityTrend`: Declining

The release forecast query should show 320 remaining points and 8 or 9 sprints remaining (depending on the run date), with a shortfall at the current pace of 33 points per sprint.

**1.3 Connection string reference**

Local SQL Server (demo environment):
```
Server=localhost;Database=ProjectOrion;Trusted_Connection=True;TrustServerCertificate=True;
```

Azure SQL (production story):
```
Server=<your-server>.database.windows.net;Database=ProjectOrion;User Id=<username>;Password=<password>;Encrypt=True;
```

---

### Step 2: Create the GitHub Repository and Issues

**2.1 Authenticate with GitHub CLI**

Open VS Code terminal (Git Bash on Windows) and run:

```bash
gh auth login
```

Select: GitHub.com, HTTPS, Yes, Login with a web browser. Complete the browser flow.

**2.2 Update the script**

Open `github/create-github-issues.sh` and update line 22:

```bash
REPO="your-github-username/project-orion"
```

Replace `your-github-username` with your actual GitHub username.

**2.3 Run the script**

```bash
chmod +x github/create-github-issues.sh
./github/create-github-issues.sh
```

The script runs four steps automatically:
- Creates the `project-orion` repository
- Creates 11 labels (bug, critical, blocked, performance, etc.)
- Creates all 35 issues with full descriptions, labels, and state
- Prints a summary with the correlation map

**2.4 Verify the issues**

Go to `https://github.com/your-username/project-orion/issues` and confirm:
- 10 open issues, including #25, #26 and #27 labeled `critical` (#25 is also labeled `blocked`)
- 25 closed issues representing Sprint 1-4 completed work
- Issue #28 open and labeled `blocked` (the stalled feature)

**The SQL to GitHub correlation:**

| SQL Record | GitHub Issue |
|---|---|
| Critical blocker: auth token refresh | #25 |
| Critical blocker: dashboard regression | #26 |
| Critical blocker: data sync drops records | #27 |
| Stalled feature: notification preferences UI | #28 |
| Performance theme across Sprint 3-5 | #13, #18, #26, #29, #31 |

---

### Step 3: Build the Custom MCP Server

> **Shortcut:** the exact server shown on stage is in `mcp-server/project-orion-mcp-server`. To use it, run `npm install`, copy `.env.example` to `.env`, then `npm run build` and `npm start`, and skip to Step 4. Follow 3.1 onward to generate your own with GitHub Copilot.

**3.1 Create the project folder**

In VS Code, create a new folder called `project-orion-mcp-server` and open it.

**3.2 Scaffold with GitHub Copilot**

Open Copilot Chat (`Ctrl+Alt+I`), paste the contents of:
```
mcp-server/copilot-mcp-scaffold-prompt.md
```

Copilot will scaffold the full project including:
- TypeScript project structure
- Seven MCP tools querying the SQL database, plus a feature-flagged eighth tool (`get_release_forecast`)
- Environment configuration with local and Azure SQL connection strings
- README with setup instructions

**3.3 Install dependencies and build**

```bash
npm install
npm run build
```

**3.4 Configure the environment**

Copy `.env.example` to `.env` and update with your local SQL Server settings:

```
# SQL Authentication (required - Windows Auth often fails in Node.js)
DB_SERVER=localhost
DB_DATABASE=ProjectOrion
DB_USER=sa
DB_PASSWORD=your-sql-password

# MCP Server
MCP_SERVER_NAME=project-orion-mcp-server
MCP_SERVER_VERSION=1.0.0
MCP_HTTP_PORT=3000
MCP_TRANSPORT=http
```

**3.5 Test the server locally**

```bash
npm start
```

Expected output (HTTP mode):
```
[MCP] Starting Project Orion MCP Server...
[MCP] Transport: HTTP (Stateless StreamableHTTP)
[MCP] Listening on port 3000
[MCP] MCP endpoint:    http://localhost:3000/mcp
[MCP] Health endpoint: http://localhost:3000/health
```

**3.6 Add HTTP transport**

Copilot Studio requires HTTP transport to connect to the MCP Server over the network. Open Copilot Chat and paste the contents of:
```
mcp-server/copilot-mcp-scaffold-prompt.md
```

After Copilot applies the changes:

```bash
npm run build
npm run start:http
```

Expected output:
```
[MCP] Starting Project Orion MCP Server...
[MCP] Transport: HTTP (Stateless StreamableHTTP)
[MCP] Listening on port 3000
[MCP] MCP endpoint:    http://localhost:3000/mcp
[MCP] Health endpoint: http://localhost:3000/health
```

**The seven MCP tools exposed:**

| Tool | Description |
|---|---|
| `get_current_sprint` | Active sprint details and completion rate |
| `get_sprint_history` | Velocity trend across all completed sprints |
| `get_critical_work_items` | All open Critical and High priority blockers |
| `get_work_items_by_sprint` | Work items filtered by sprint and status |
| `get_latest_health_metrics` | Most recent health snapshot and readiness score |
| `get_health_metrics_trend` | Release readiness score trend over N days |
| `get_stalled_work_items` | Items with no recent activity |
| `get_release_forecast` | Release forecast against the target date. **Only listed when `ForecastToolEnabled` is on** |

The server reads `FeatureFlags` on every request. Because it is stateless and creates a fresh server instance per request, flipping the flag changes the tool list immediately with no restart.

---

### Step 4: Expose the MCP Server via Dev Tunnels

Copilot Studio is a cloud service and cannot reach your localhost directly. Azure Dev Tunnels creates a secure bridge.

**4.1 Install the Dev Tunnels CLI**

```powershell
winget install Microsoft.DevTunnel
```

Restart your terminal after installation.

**4.2 Authenticate**

```bash
devtunnel user login
```

Sign in with the same Microsoft account you use for Copilot Studio.

**4.3 Make sure the MCP Server is running in HTTP mode**

```bash
npm run start:http
```

**4.4 Expose port 3000**

In a separate terminal:

```bash
devtunnel host -p 3000 --allow-anonymous
```

You will receive a tunnel URL:
```
https://xxxxxxxx-3000.devtunnels.ms
```

Your MCP endpoint for Copilot Studio is:
```
https://xxxxxxxx-3000.devtunnels.ms/mcp
```

Keep this terminal open while testing Copilot Studio. The tunnel closes when you close the terminal.

**Note on security:** the tunnel exists only so a cloud service can reach a server on your laptop during the demo. `--allow-anonymous` is acceptable here because the data is fictional. A tunnel is not part of a production design: host the MCP server in Azure, connect it to Azure SQL with a managed identity, and require Entra ID OAuth from Copilot Studio.

---

### Step 5: Build the Connector Agent (Demo Part 1)

Full instructions, tool descriptions and the test sequence are in:
```
copilot-studio/copilot-studio-connector-agent-prompt.md
```

**5.1 Create the agent**

Go to [copilotstudio.microsoft.com](https://copilotstudio.microsoft.com), click **Create**, paste the AGENT CREATION PROMPT, then replace the generated instructions with the AGENT INSTRUCTIONS from the prompt file.

**5.2 Set up the on-premises data gateway**

The SQL Server connector reaches your local database through the on-premises data gateway. "Execute a SQL query (V2)" is not supported through a gateway, so the agent calls the 7 stored procedures that Step 1 created (`usp_get_current_sprint`, `usp_get_sprint_history`, `usp_get_critical_work_items`, `usp_get_work_items_by_sprint`, `usp_get_stalled_work_items`, `usp_get_latest_health_metrics`, `usp_get_health_metrics_trend`). They run the same queries as the MCP server's tools. There is no forecast procedure.

**5.3 Add the SQL tools**

In your agent: **Tools > Add a tool > Connector > SQL Server > Execute stored procedure (V2)**. Add it once per procedure: set server and database as Custom values, pick the procedure from the list so its parameters load, leave parameters as Fill with AI, then rename and describe the tool.

**5.4 Add the GitHub connector**

**Tools > Add a tool > Connector > GitHub**, signed in with OAuth.

**5.5 Test the connector agent**

| Question | Expected |
|---|---|
| What is the current release readiness score? | 52/100, declining, 3 blockers |
| What critical bugs are open in GitHub? | #25, #26, #27, matched to SQL by issue number |
| What is blocking the release? | #25, #26, #27, #28 stalled, smoke tests and rollback plan not done |
| At our current pace, will we make the Orion 1.0 release? | No forecast tool. It says so |

The connector agent handles cross-source questions. The lesson comes when you ask what it would take to add a forecast: a new procedure, a new tool, its inputs and description, updated instructions, a test, a republish, and the same again in every agent that needs it.

---

### Step 6: Build the MCP Agent (Demo Part 2)

**6.1 Create the agent**

In Copilot Studio, create a NEW agent (separate from the connector agent).

Paste the contents of:
```
copilot-studio/copilot-studio-agent-prompt.md
```

into the agent builder.

**6.2 Add the custom MCP Server**

In your agent: **Tools > Add a tool > Model Context Protocol**

Enter your Dev Tunnel MCP endpoint:
```
https://xxxxxxxx-3000.devtunnels.ms/mcp
```

Select **No authentication**. Copilot Studio will discover all seven tools automatically. Keep the whole server enabled rather than hand-picking tools, so the forecast tool can appear later without changes to the agent.

**6.3 Create a GitHub OAuth App**

GitHub MCP requires a GitHub OAuth App for authentication. Complete this before configuring Copilot Studio.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click **OAuth Apps** then **New OAuth App**
3. Fill in the fields:
   - **Application name:** Project Orion MCP (or any name you prefer)
   - **Homepage URL:** `http://localhost:3000` (placeholder, not validated)
   - **Authorization callback URL:** This field is required. Use the following template as a placeholder, replacing `<your-connection-id>` with any short identifier (e.g. `github-mcp`):
     ```
     https://global.consent.azure-apim.net/redirect/<your-connection-id>
     ```
     For example: `https://global.consent.azure-apim.net/redirect/github-mcp`
     You will replace this with the exact URL Copilot Studio generates in the next step.
4. Click **Register application**
5. On the app page, click **Generate a new client secret**
6. Copy and save both the **Client ID** and **Client Secret** before leaving the page

**6.4 Add the GitHub MCP Server in Copilot Studio**

In your agent: **Tools > Add a tool > Model Context Protocol**

> **Important:** GitHub does not publish an OIDC discovery document, so the
> **Dynamic Discovery** option will fail with an "Invalid URI" error. You must
> use **Manual** configuration instead.

In the MCP tool dialog:
1. Select **Manual** (not Dynamic Discovery)
2. Enter the GitHub MCP endpoint URL:
```
https://api.githubcopilot.com/mcp/
```
3. Select **OAuth** as the authentication type
4. Copy the **Redirect URL** shown by Copilot Studio. It will look like:
   ```
   https://global.consent.azure-apim.net/redirect/<generated-id>
   ```
5. Go back to your GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers), replace the placeholder Authorization callback URL with this exact Redirect URL, then save
6. Back in Copilot Studio, enter:

| Setting | Value |
|---|---|
| Authorization URL | `https://github.com/login/oauth/authorize` |
| Token URL | `https://github.com/login/oauth/access_token` |
| Refresh URL | `https://github.com/login/oauth/access_token` |
| Scope | `repo read:org` |
| Client ID | From your GitHub OAuth App |
| Client Secret | From your GitHub OAuth App |

7. Save and test the connection. When prompted, authorize the OAuth app with your GitHub account.

**6.5 Test the MCP agent**

Run these prompts in order:

**Prompt 1: SQL only**
```
What is the current release readiness score for Project Orion?
```
Expected: Score of 52, declining trend, BlockerCount = 3.

**Prompt 2: GitHub only**
```
What critical bugs are currently open in Project Orion?
```
Expected: Issues #25, #26, #27 with full descriptions.

**Prompt 3: Cross-source reasoning (the money shot)**
```
What is blocking the Project Orion release right now?
```
Expected: Agent correlates GitHub critical issues with SQL
BlockerCount = 3 and ReleaseReadinessScore = 52 in a single
coherent answer referencing both sources.

**Prompt 4: Pattern detection**
```
Are there any patterns between our open GitHub issues and our sprint health metrics?
```
Expected: Agent surfaces the performance theme across multiple
GitHub issues and connects it to the velocity decline in sprint data.

**Prompt 5: Stalled work**
```
Which work items have been stalled the longest?
```
Expected: Notification preferences UI, GitHub #28, stalled 12+ days.

**Prompt 6: The server-side change (the money shot)**

With the dashboard switch set to **Off**:
```
At our current pace, will we make the Orion 1.0 release?
```
Expected: The agent says no release forecast is available.

Flip the dashboard's **MCP forecast tool** switch to **Deployed**. Do not touch the agent. Ask the same question again.

Expected: The agent calls `get_release_forecast`: not at the current pace (33 points per sprint), 320 points remaining against 15 Feb 2027, required pace roughly 36-40 points per sprint, dependent on clearing #25, #26 and #27.

Rehearse this. If the agent does not see the new tool on the next message, start a new test conversation. If it still does not appear, open the MCP tool on the agent's Tools page to refresh the list.

---

### Step 7: Build the Next.js Dashboard

> **Shortcut:** the exact dashboard shown on stage is in `dashboard/project-orion-dashboard`. Run `npm install`, copy `.env.example` to `.env.local`, then `npm run dev -- -p 3001`. Follow 7.1 onward to generate your own with GitHub Copilot.

**7.1 Create the project folder**

Create a new folder called `project-orion-dashboard` and open it in VS Code.

**7.2 Scaffold with GitHub Copilot**

Open Copilot Chat and paste the contents of:
```
dashboard/copilot-nextjs-dashboard-prompt.md
```

Copilot will scaffold the full Next.js application including:
- A light, projector-friendly layout that follows the agent questions
- A live strip of the MCP server's tools and a forecast panel that calls the server
- The forecast tool switch and a critical-bugs flyout
- API routes connecting to SQL Server, refreshed every 30 seconds

**7.3 Configure the environment**

Copy `.env.example` to `.env.local` and update with your SQL Server settings:

```
DB_SERVER=localhost
DB_DATABASE=ProjectOrion
DB_TRUSTED_CONNECTION=true
DB_TRUST_SERVER_CERTIFICATE=true
MCP_SERVER_URL=http://localhost:3000/mcp
```

**7.4 Install dependencies and run**

Start the MCP server first (it uses port 3000), then:

```bash
npm install
npm run dev -- -p 3001
```

Open `http://localhost:3001`.

**7.5 Verify the dashboard**

| Area | Expected |
|---|---|
| Header | Orion 1.0 target 15 Feb 2027 with days left, **At Risk** pill, **MCP forecast tool** switch reading **Off** |
| MCP tools strip | Server online, 7 tools |
| Readiness hero | 52/100 with a declining trend |
| KPI tiles | 3 critical blockers (#25 · #26 · #27), Sprint 5 at 30% (14 of 46 pts), velocity 33 pts, down from a 43 pt peak |
| Blockers panel | The critical and high bugs, plus #28 as stalled work |
| Forecast panel | Locked |

Click the critical blockers tile to check the flyout. Flip the switch to **Deployed**: `get_release_forecast` appears in the tools strip and the forecast panel unlocks (not on track, about 2 Mar 2027 against 15 Feb 2027). Flip it back to **Off** before presenting.

---

## Demo Flow Reference

Use this as a quick reference card on presentation day.

**Setup checklist (before going on stage):**
- Re-run `sql/project-orion-setup.sql` the morning of the session (dates roll to today, flag resets to Off)
- SQL Server running locally
- MCP Server running: `npm run start:http`
- Dev Tunnel active: `devtunnel host -p 3000 --allow-anonymous`
- Next.js dashboard running: `npm run dev -- -p 3001`, forecast switch showing **Off**
- Both Copilot Studio agents open in separate browser tabs
- GitHub issues visible in a third tab

**Demo Part 1: Connector Agent**

1. Show the Next.js dashboard briefly
2. Switch to the connector agent
3. Run: "What is the current release readiness score?" (SQL)
4. Run: "What critical bugs are open in GitHub?" (GitHub, matched to SQL)
5. Run: "What is blocking the release?" (both sources)
6. Run: "At our current pace, will we make the Orion 1.0 release?" (no forecast tool)
7. Walk through what adding a forecast would take: edit, republish, repeat in every agent

**Demo Part 2: MCP Agent**

1. Show the architecture slides (demo setup, then target cloud design)
2. Open VS Code, show the custom MCP Server tool definitions (30 seconds)
3. Switch to the MCP agent
4. Run: "What is the current release readiness score?" and "What critical bugs are currently open?" (both servers connected)
5. Run: "At our current pace, will we make the Orion 1.0 release?" (no forecast available)
6. Flip the dashboard switch to **Deployed**. Do not touch the agent
7. Run the same question again (the agent now forecasts)
8. Decision anchor: "Nobody touched this agent. The server changed, and the agent followed. When many agents need the same tools, and those tools keep changing, that's your MCP signal."

---

## Decision Framework

Use this to evaluate your own projects after the lab:

| Agents using these tools | How often the tools change | Recommendation |
|---|---|---|
| One | Stable | Connector wins. Simple, governed, done |
| One | Changing | Connector, republish as needed. With one agent, republishing is cheap |
| Many | Stable | Evaluate MCP. A shared custom connector may be enough |
| Many | Changing | MCP is right. Change it once, every agent follows |

**The honest warning:** The most expensive architectural mistake is reaching for MCP because it sounds modern. Complexity has a cost. Make sure your problem justifies it.

---

## Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [Copilot Studio Documentation](https://learn.microsoft.com/copilot-studio)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Azure Dev Tunnels](https://learn.microsoft.com/azure/developer/dev-tunnels)
- [Session slides and recording](#) *(link added after the conference)*

---

## About the Speaker

Mariano Gomez Bent is Chief Product & Technology Officer at Mekorma. He speaks regularly at Community Summit NA and Microsoft-focused developer conferences on AI-first development practices, Copilot Studio, and the Microsoft Power Platform.

---

*This lab was built for Community Summit NA 2026, Nashville, TN. October 11-15, 2026.*
