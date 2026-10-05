/**
 * MCP Tools API Route
 *
 * Asks the local Project Orion MCP server which tools it is offering right
 * now (a JSON-RPC "tools/list" call). The dashboard shows them as a strip of
 * chips, so the audience can watch get_release_forecast appear when the
 * forecast switch is flipped.
 *
 * Read-only. Talks to localhost only; set MCP_SERVER_URL in .env.local if the
 * server runs somewhere else.
 *
 * GET /api/mcp-tools -> { online: boolean, serverName?: string, tools: string[] }
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MCP_URL = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

/** Streamable HTTP may answer as plain JSON or as an SSE stream. Handle both. */
function parseRpcPayload(body: string): any {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  const dataLines = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());
  for (const line of dataLines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && (parsed.result || parsed.error)) return parsed;
    } catch {
      /* keep looking */
    }
  }
  throw new Error("No JSON-RPC payload in MCP response");
}

export async function GET() {
  try {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });

    const payload = parseRpcPayload(await res.text());
    const tools: string[] = (payload?.result?.tools ?? []).map((t: { name: string }) => t.name);

    return NextResponse.json({ online: true, tools });
  } catch (error) {
    console.error("MCP tools/list failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ online: false, tools: [] });
  }
}
