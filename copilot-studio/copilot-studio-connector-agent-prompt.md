# Copilot Studio Prompt: Project Orion Connector Agent (Demo Part 1)

## How to use this prompt
1. Go to copilotstudio.microsoft.com
2. Click "Create" to start a NEW agent (separate from the MCP agent)
3. When the agent builder asks "What should your agent do?", paste the
   AGENT CREATION PROMPT below
4. After the agent is created, follow the POST-CREATION STEPS to wire
   up the GitHub connector
5. This agent is intentionally LIMITED. That limitation IS the demo.

---

## AGENT CREATION PROMPT

Create a project assistant called **Project Orion GitHub Assistant**.

This agent answers questions about Project Orion, a customer-facing
enterprise web application, by querying GitHub Issues data only.

### Agent purpose
The agent helps team members get a quick read on code-level activity
in the Project Orion repository. It answers questions about open and
closed issues, bug reports, and feature work tracked in GitHub.

### Tone and personality
- Helpful and direct
- Answers based strictly on what is available in GitHub Issues
- If asked about sprint health, release readiness scores, velocity
  trends, or work item metrics, the agent should acknowledge it does
  not have access to that data and can only speak to what is visible
  in GitHub Issues

### Example questions this agent should handle well
- "What critical bugs are open in Project Orion?"
- "How many issues are currently open?"
- "What issues are labeled as blocked?"
- "What was the last issue closed in the repository?"
- "Are there any performance related issues open?"

### Instructions for the agent
1. Answer all questions using only data available from GitHub Issues
2. Be specific: include issue numbers, titles, and labels in answers
3. If asked a question that requires data beyond GitHub Issues such as
   sprint completion rates, release readiness scores, velocity trends,
   or work item status from a project management tool, respond with:
   "I can only see GitHub Issues data. For full project health
   including sprint metrics and release readiness, you would need
   access to the project health database."
4. Do not speculate or estimate values not present in GitHub Issues

### What this agent intentionally cannot do
This agent has no access to:
- Sprint health metrics
- Release readiness scores
- Team velocity data
- Work item status from project management tools
- Cross-system pattern analysis

This is by design. The agent is scoped to GitHub Issues only.

---

## POST-CREATION STEPS: Wire up the GitHub Connector

### Step 1: Add the GitHub connector
In your agent go to:
Tools > Add a tool > Connector

Search for **GitHub** and select it.

### Step 2: Configure the connection
When prompted, authenticate with your GitHub account. Use the same
account that owns the project-orion repository.

### Step 3: Scope the agent to Project Orion
In the agent instructions, confirm the repository reference is:
```
your-github-username/project-orion
```

### Step 4: Test the connector is working
Run this prompt in the test window:
```
How many issues are currently open in Project Orion?
```
Expected: Agent returns a count matching the 10 open issues in the
repository (#20, #25, #26, #27, #28, #29, #30, #31, #32, #33).

---

## DEMO PART 1: TEST SEQUENCE

Run these prompts in order during demo preparation. They are designed
to show the connector working well first, then hitting its ceiling.

### Prompt 1: Scoped question (connector wins)
```
What critical bugs are currently open in Project Orion?
```
Expected: Agent correctly returns issues #25, #26, #27 with titles
and labels. Clean, accurate, fast. This is the connector doing
exactly what it was designed to do. Say it out loud on stage:
"This is the right tool for this job."

### Prompt 2: Slightly broader (connector still holds)
```
Are there any performance related issues open in Project Orion?
```
Expected: Agent returns #26 (dashboard regression), #29 (CDN
configuration), #31 (WebSocket memory leak). Still accurate.
Connector is still earning its place.

### Prompt 3: The ceiling moment (connector struggles)
```
What is the overall health of Project Orion right now?
```
Expected: Agent can only speak to GitHub Issues. It will describe
open bugs and labels but cannot provide release readiness score,
sprint completion rate, or velocity trend. The answer is incomplete
and the agent should acknowledge the gap.

This is your transition moment. The connector did exactly what it
was designed to do. The problem outgrew the tool.

---

## STAGE TRANSITION SCRIPT

After Prompt 3 lands, use this line to bridge to Demo Part 2:

> "Notice what just happened. The connector gave us a perfectly
> accurate answer about GitHub. But the question asked about overall
> project health. That requires sprint metrics, release readiness
> scores, and velocity trends that live in a completely separate
> system. The connector can't see that. It wasn't designed to.
>
> The question changed. Now let's change the architecture."

Then switch to the Project Orion MCP Assistant agent and run:
```
What is the overall health of Project Orion right now?
```

The contrast should be immediate and obvious.

---

## NAMING REFERENCE

| Agent | Name | Purpose |
|---|---|---|
| Demo Part 1 | Project Orion GitHub Assistant | Connector only, GitHub Issues |
| Demo Part 2 | Project Orion Assistant | MCP, cross-source reasoning |

Keep both agents in your Copilot Studio environment so you can
switch between them live on stage without rebuilding anything.
