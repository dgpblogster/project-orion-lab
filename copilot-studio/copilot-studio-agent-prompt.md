# Copilot Studio Prompt: Project Orion Agent

## How to use this prompt
1. Go to copilotstudio.microsoft.com
2. Click "Create" to start a new agent
3. When the agent builder asks "What should your agent do?", paste the
   AGENT CREATION PROMPT below
4. After the agent is created, follow the POST-CREATION STEPS to wire
   up the MCP Server tools

---

## AGENT CREATION PROMPT

Create an intelligent project health agent called **Project Orion Assistant**.

This agent helps engineering teams and project stakeholders understand the
current health of Project Orion, a customer-facing enterprise web application
that is mid-way through a major release cycle.

### Agent purpose
The agent answers natural language questions about project health by reasoning
across two live data sources simultaneously:
- GitHub Issues: tracks code-level activity, bugs, and feature work
- A SQL database: tracks sprint metrics, work item status, and release
  readiness scores

### Tone and personality
- Professional but direct
- Concise answers with clear structure
- Proactively flags risks and blockers without being asked
- Never speculates. If data is unavailable, says so clearly

### Example questions this agent should handle
- "What is blocking the Project Orion release?"
- "What is the current release readiness score?"
- "Are there any patterns between our open GitHub issues and our sprint health?"
- "What is the overall health of Project Orion right now?"
- "Which work items have been stalled the longest?"
- "How has our team velocity trended over the last four sprints?"
- "What critical bugs are currently open?"
- "Is the project on track for release?"

### Agent instructions
After the agent is created, replace its generated instructions with
these. Rules 1-4, 6-8 match the connector agent, so the only
difference the audience sees is the architecture.

```
You are the Project Orion Assistant. You answer questions about the
health of Project Orion and its Orion 1.0 release.

Sources
- The Project Orion MCP server tools for sprints, work items, health
  metrics and release readiness.
- GitHub Issues for <your-github-username>/project-orion. Always use
  owner "<your-github-username>" and repo "project-orion".
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
   make it" projections from sprint or velocity data. Only report a
   forecast when a forecasting tool returns one. If none is
   available, say so, and offer the current readiness score and
   velocity trend instead.
6. For readiness trends, request at least 35 days of history.
7. Only answer questions about Project Orion.
8. Do not mention tool names, IDs or raw JSON in answers.
```

Rule 5 matters most: without it, the agent may compute its own
forecast from velocity data before the switch is flipped, and the
before-and-after moment in Step 6 is lost.

### Agent settings
- Turn off web search (Knowledge > Public websites > Search all
  websites) and, where available, ungrounded / general knowledge
  responses
- Turn off Memory
- Use the same model as the connector agent

---

## POST-CREATION STEPS: Wire up the MCP Server

After the agent is created, follow these steps to connect the
Project Orion MCP Server tools:

### Step 1: Add MCP Server tool
In your agent go to:
Tools > Add a tool > Model Context Protocol

### Step 2: Enter the MCP endpoint
```
https://your-tunnel-id-3000.devtunnels.ms/mcp
```

### Step 3: Enable all tools from this server
Copilot Studio will discover and list these tools automatically.
Keep the whole server enabled rather than hand-picking individual
tools, so a tool added on the server later (see Step 6) becomes
available to the agent:

| Tool | Purpose |
|---|---|
| get_current_sprint | Active sprint details, completion rate, velocity |
| get_sprint_history | Velocity trend across all completed sprints |
| get_critical_work_items | All open Critical and High priority items |
| get_work_items_by_sprint | Work items filtered by sprint and status |
| get_latest_health_metrics | Most recent health snapshot and readiness score |
| get_health_metrics_trend | Release readiness score trend over N days |
| get_stalled_work_items | Items with no recent activity |

An eighth tool, `get_release_forecast`, is not listed yet. It only
appears when the `ForecastToolEnabled` flag is switched on from the
dashboard (see Step 6).

### Step 4: Add GitHub MCP Server
In your agent go to:
Tools > Add a tool > Model Context Protocol

GitHub does not support OIDC Dynamic Discovery, so you cannot use
the automatic OAuth option. Use Manual OAuth configuration instead.

**Manual OAuth settings:**

| Setting | Value |
|---|---|
| Authorization URL | https://github.com/login/oauth/authorize |
| Token URL | https://github.com/login/oauth/access_token |
| Refresh URL | https://github.com/login/oauth/access_token |
| Scope | repo read:org |
| Client ID | From your GitHub OAuth App |
| Client Secret | From your GitHub OAuth App |

**To create a GitHub OAuth App:**
1. Go to github.com > Settings > Developer Settings > OAuth Apps
2. Click New OAuth App
3. Copy the Redirect URL from Copilot Studio into the app settings
4. Copy the Client ID and Client Secret back into Copilot Studio

### Step 5: Test with the showcase queries
Once wired up, test the agent with these queries in order.
Each one is designed to validate a specific capability:

**Query 1: Single source (SQL only)**
```
What is the current release readiness score for Project Orion?
```
Expected: Agent returns score of 52 from HealthMetrics, flags declining trend.

**Query 2: Single source (GitHub only)**
```
What critical bugs are currently open in Project Orion?
```
Expected: Agent returns issues #25, #26, #27 with descriptions.

**Query 3: Cross-source reasoning**
```
What is blocking the Project Orion release right now?
```
Expected: Agent correlates GitHub critical issues #25, #26, #27
with SQL BlockerCount=3 and ReleaseReadinessScore=52. Answer
references both sources in a single coherent response.

**Query 4: Pattern detection**
```
Are there any patterns between our open GitHub issues and our sprint health metrics?
```
Expected: Agent surfaces the performance issue theme across multiple
GitHub issues and connects it to the velocity decline in the Sprints table.

**Query 5: Stalled work**
```
Which work items have been stalled the longest?
```
Expected: Agent identifies the notification preferences feature
(GitHub #28, 12 days no activity) correlated with the stalled
work item in Sprint 5.

### Step 6: The server-side change (the money shot)
Confirm `ForecastToolEnabled` is OFF in the dashboard header first.

**Query 6a: Before the change**
```
At our current pace, will we make the Orion 1.0 release?
```
Expected: Agent says no release forecast is available. It must not
estimate one from velocity data.

**Flip the "MCP forecast tool" switch in the dashboard to Deployed.**
Do not touch the agent in Copilot Studio.

**Query 6b: After the change**
```
At our current pace, will we make the Orion 1.0 release?
```
Expected: Agent calls `get_release_forecast` and answers: not at the
current pace (33 pts/sprint). 320 points remain against a 15 Feb 2027
target, with 8 or 9 sprints left depending on the date the database
was seeded. Required pace is roughly 36-40 pts/sprint, which depends
on clearing #25, #26 and #27.

**Rehearse this step.** How quickly Copilot Studio picks up the new
tool can vary. If the agent does not see it on the next message, start
a new test conversation and ask again. If it still does not appear,
open the MCP tool in the agent's Tools page to refresh the tool list.
Keep a recording of a successful run as a backup.

---

## DEMO NOTES

### The connector version (Demo Part 1)
Before showing this MCP agent, first demonstrate a simpler
Copilot Studio agent that uses only a single connector pointed
at the GitHub API. When asked "What is the overall health of
Project Orion?", that agent will give an incomplete answer
because it can only see GitHub issues, not the SQL health data.

This sets up the contrast that makes the MCP agent impressive.

### The transition line
Use this line between Demo Part 1 and Demo Part 2:
"The question changed. Now let's change the architecture."

### The decision anchor
After Query 6b lands, say:
"Nobody touched this agent. The server changed, and the agent
followed. When many agents need the same tools, and those tools
keep changing, that's your MCP signal."
