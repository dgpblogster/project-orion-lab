/**
 * Feature Flags API Route
 *
 * Reads and sets the ForecastToolEnabled flag. The MCP server reads this flag
 * on every request, so flipping it here "deploys" the get_release_forecast
 * tool without touching the Copilot Studio agent. This route only writes to
 * SQL; it never calls the MCP server.
 *
 * Local demo dashboard only. Do not expose the dashboard through a tunnel.
 *
 * GET  /api/flags                                   -> { forecastToolEnabled: boolean }
 * POST /api/flags  { "forecastToolEnabled": bool }  -> { forecastToolEnabled: boolean }
 */

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const FLAG_NAME = "ForecastToolEnabled";

async function readFlag(): Promise<boolean> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("flagName", sql.NVarChar(100), FLAG_NAME)
    .query<{ IsEnabled: boolean }>(
      "SELECT IsEnabled FROM FeatureFlags WHERE FlagName = @flagName"
    );
  return result.recordset.length > 0 && result.recordset[0].IsEnabled === true;
}

export async function GET() {
  try {
    return NextResponse.json({ forecastToolEnabled: await readFlag() });
  } catch (error) {
    console.error("Error reading feature flag:", error);
    return NextResponse.json({ error: "Failed to read feature flag" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  const enabled = (body as { forecastToolEnabled?: unknown })?.forecastToolEnabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json(
      { error: "forecastToolEnabled must be true or false" },
      { status: 400 }
    );
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("enabled", sql.Bit, enabled)
      .input("flagName", sql.NVarChar(100), FLAG_NAME)
      .query(
        "UPDATE FeatureFlags SET IsEnabled = @enabled, UpdatedAt = SYSUTCDATETIME() WHERE FlagName = @flagName"
      );
    console.log(`✓ ${FLAG_NAME} set to ${enabled}`);
    return NextResponse.json({ forecastToolEnabled: await readFlag() });
  } catch (error) {
    console.error("Error updating feature flag:", error);
    return NextResponse.json({ error: "Failed to update feature flag" }, { status: 500 });
  }
}
