/**
 * MCP Forecast API Route
 *
 * Calls the MCP server's own get_release_forecast tool (JSON-RPC tools/call),
 * exactly as the Copilot Studio agent does. While the forecast switch is off
 * the server refuses, and the dashboard shows the panel as locked. The
 * dashboard is simply a second client of the same server-side tool.
 *
 * GET /api/mcp-forecast -> { available: boolean, online: boolean, forecast?: {...} }
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MCP_URL = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

function parseRpcPayload(body: string): any {
  const trimmed = body.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    try {
      const parsed = JSON.parse(line.slice(5).trim());
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
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "get_release_forecast", arguments: {} },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    const payload = parseRpcPayload(await res.text());
    const text: string | undefined = payload?.result?.content?.[0]?.text;
    const toolResult = text ? JSON.parse(text) : null;

    if (!toolResult?.success || !toolResult?.data) {
      return NextResponse.json({ online: true, available: false });
    }
    return NextResponse.json({ online: true, available: true, forecast: toolResult.data });
  } catch (error) {
    console.error("MCP forecast call failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ online: false, available: false });
  }
}
