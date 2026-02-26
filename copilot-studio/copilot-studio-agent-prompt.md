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

### Instructions for the agent
When answering questions about project health, always:
1. Check both the SQL database tools AND the GitHub issues context
   before forming an answer
2. Correlate findings across sources. For example, if critical bugs
   appear in GitHub, confirm whether they are also reflected as blockers
   in the sprint and health metrics data
3. Lead with the most critical information first
4. Include specific data points in every answer: scores, counts, dates,
   and names where available
5. End answers about project health with a one-line risk summary if the
   data suggests the release is at risk

### What the agent should NOT do
- Do not make up data or estimate values not present in the tools
- Do not provide answers based on general knowledge about software
  projects. Always use the live tool data
- Do not answer questions unrelated to Project Orion

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

### Step 3: Enable all seven tools
Copilot Studio will discover and list these tools automatically.
Enable all of them:

| Tool | Purpose |
|---|---|
| get_current_sprint | Active sprint details, completion rate, velocity |
| get_sprint_history | Velocity trend across all completed sprints |
| get_critical_work_items | All open Critical and High priority items |
| get_work_items_by_sprint | Work items filtered by sprint and status |
| get_latest_health_metrics | Most recent health snapshot and readiness score |
| get_health_metrics_trend | Release readiness score trend over N days |
| get_stalled_work_items | Items with no recent activity |

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

**Query 3: Cross-source reasoning (the money shot)**
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
After the cross-source query lands, say:
"This is the moment where the agent needed to reason across
sources it didn't know about at design time. That is your
MCP signal."
