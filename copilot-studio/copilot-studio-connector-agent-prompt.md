# Copilot Studio Prompt: Project Orion Connector Agent (Demo Part 1)

## What this agent shows
This agent reasons across **both** sources, SQL Server and GitHub,
using only standard connectors. It answers the same questions the MCP
agent answers. That is the point: connectors are not the weak option.

The lesson is the **cost of change**. Every SQL tool is a stored
procedure that was added, configured and described by hand in this
agent. To give it a new capability, such as a release forecast, you
would write a new procedure, add it as a tool, configure its inputs,
describe it, update the instructions, test, **republish the agent**,
and then repeat all of that in every other agent that needs it.

## How to use this prompt
1. Go to copilotstudio.microsoft.com
2. Click "Create" to start a NEW agent (separate from the MCP agent)
3. Paste the AGENT CREATION PROMPT below when asked what the agent
   should do
4. Replace the generated instructions with the AGENT INSTRUCTIONS
   below
5. Follow the POST-CREATION STEPS to add the tools

---

## AGENT CREATION PROMPT

Create a project health assistant called **Project Orion Connector
Assistant**.

It answers questions about Project Orion, a customer-facing
enterprise web application mid-way through its Orion 1.0 release, by
using two sources together:
- A SQL Server database with sprints, work items, health metrics and
  release readiness scores
- GitHub Issues in the project-orion repository

Tone: professional, direct and brief. Lead with the answer, include
specific numbers and issue references, and never speculate.

---

## AGENT INSTRUCTIONS

Paste this into the agent's **Instructions** field.

```
You are the Project Orion Connector Assistant. You answer questions
about the health of Project Orion and its Orion 1.0 release.

Sources
- SQL tools (stored procedures) for sprints, work items, health
  metrics and release readiness.
- GitHub tools for issues in the project-orion repository.
- SQL work items carry a GitHubIssueRef such as "#25". Use it to
  match a work item to its GitHub issue.

Rules
1. Always use the tools. Never answer from general knowledge or
   invent values.
2. When a question spans both sources, call both and connect them
   by issue number.
3. Lead with the direct answer, then the supporting facts: scores,
   counts, dates, owners and issue numbers.
4. Keep every answer to one screen: a one-line answer, then no more
   than 5 short bullets. No tables unless asked.
5. Do not calculate release forecasts, completion dates or "will we
   make it" projections from sprint or velocity data. You have no
   forecasting tool. If asked, say that no release forecast is
   available, and offer the current readiness score and velocity
   trend instead.
6. Only answer questions about Project Orion.
```

---

## POST-CREATION STEPS

### Step 1: Install the on-premises data gateway
The SQL Server connector reaches a local database through the
on-premises data gateway. Install it on (or near) the SQL Server
machine and register it in the same region as your Power Platform
environment.

The setup script already created the 7 stored procedures in section
7e. "Execute a SQL query (V2)" is not supported through the gateway,
which is why the agent calls stored procedures instead.

### Step 2: Create the SQL Server connection
In your agent go to **Tools > Add a tool > Connector**, search for
**SQL Server**, and choose **Execute stored procedure (V2)**.

Create the connection with:
- Authentication type: SQL Server Authentication (or Windows
  Authentication)
- SQL server name and database name: your server and `ProjectOrion`
- Gateway: the gateway from Step 1

### Step 3: Add one tool per stored procedure
Add **Execute stored procedure (V2)** seven times, once per
procedure. For each tool:

1. Set **Server name** and **Database name** as Custom values (your
   server, `ProjectOrion`). The connector looks these up from the
   gateway with its standard "list servers / list databases" calls.
2. Pick the **Procedure name** from the list. Picking it from the
   list is what loads its parameters. Through the gateway, the
   parameters show as optional.
3. Leave procedure parameters as **Fill with AI** (dynamic) so the
   agent supplies them.
4. Rename the tool and give it the description below. The
   orchestrator chooses tools by these descriptions.

| Tool name | Procedure | Parameters | Description |
|---|---|---|---|
| Get current sprint | `dbo.usp_get_current_sprint` | none | The active sprint: dates, planned, completed and rollover points, velocity and notes. |
| Get sprint history | `dbo.usp_get_sprint_history` | none | All completed sprints in order, with velocity. Use for velocity trends. |
| Get critical work items | `dbo.usp_get_critical_work_items` | none | Open Critical and High priority work items, blocked first, with GitHub issue refs. |
| Get work items by sprint | `dbo.usp_get_work_items_by_sprint` | `sprint_id` (int), `status` (optional) | Work items in one sprint, optionally filtered by status. Status is one of New, Active, Resolved, Closed, Blocked. |
| Get stalled work items | `dbo.usp_get_stalled_work_items` | `stale_days` (int, default 7) | Active or New items older than N days with no resolution. |
| Get latest health metrics | `dbo.usp_get_latest_health_metrics` | none | The latest health snapshot: release readiness score, critical bugs, blockers, completion rate and velocity trend. |
| Get health metrics trend | `dbo.usp_get_health_metrics_trend` | `days` (int, default 14) | Daily health snapshots for the last N days. Use for readiness trends. |

There is deliberately no forecast procedure. The forecast is the
server-side change shown in Demo Part 2.

**Server name resets:** if the server name clears when you reopen a
tool to edit it, select it again before saving.

### Step 4: Add the GitHub connector
**Tools > Add a tool > Connector**, search for **GitHub**, and sign in
with OAuth using the account that owns the project-orion repository.
Add the issue actions you need (for example "List issues" and "Get
issue"), with owner and repository set as Custom values.

### Step 5: Publish
Publish the agent, then test it in the test pane.

---

## DEMO PART 1: TEST SEQUENCE

Ask these in order. Expected answers assume the database is seeded
for the session date.

| # | Question | Expected |
|---|---|---|
| 1 | What is the current release readiness score? | 52/100, declining, 3 blockers |
| 2 | What critical bugs are open in GitHub? | #25, #26, #27, matched to SQL by issue number |
| 3 | What is blocking the release? | #25, #26, #27 (13 pts), #28 stalled, smoke tests and rollback plan not done |
| 4 | What's the main pattern between our GitHub issues and sprint health? | Fixes creating regressions (#18 led to #26); velocity 43, 38, 33 |
| 5 | At our current pace, will we make the Orion 1.0 release? | No forecast tool. It says so |

Question 5 is the turn. Name what it would take to add a forecast to
this agent, then switch to Demo Part 2.

---

## STAGE TRANSITION

> "This agent reasoned across SQL and GitHub just fine. But every one
> of those seven tools was added, configured and described by hand,
> in this agent. To add a forecast, I'd edit, republish, and repeat
> in every agent that needs it. Let's see what happens when the
> server owns the tools."

---

## NAMING REFERENCE

| Agent | Name | Tools |
|---|---|---|
| Demo Part 1 | Project Orion Connector Assistant | SQL Server connector (7 stored procedures) + GitHub connector |
| Demo Part 2 | Project Orion Assistant | Project Orion MCP Server + GitHub MCP Server |
