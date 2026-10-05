/**
 * Feature Flags
 *
 * Reads switches from the FeatureFlags table. The flag is read on EVERY call
 * (no caching) so a change made from the dashboard takes effect on the very
 * next MCP request, with no server restart.
 */

import sql from "mssql";
import { getPool } from "./connection.js";

/**
 * Returns true when the named flag exists and is enabled.
 * Returns false if the row is missing or the query fails, so a database
 * problem can never accidentally expose a tool.
 */
export async function isFeatureEnabled(flagName: string): Promise<boolean> {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("flagName", sql.NVarChar(100), flagName)
      .query<{ IsEnabled: boolean }>(
        "SELECT IsEnabled FROM FeatureFlags WHERE FlagName = @flagName"
      );
    const enabled = result.recordset.length > 0 && result.recordset[0].IsEnabled === true;
    console.error(`[MCP] ${flagName} = ${enabled}`);
    return enabled;
  } catch (error) {
    console.error(`[MCP] Could not read flag ${flagName}, treating as off:`, error);
    return false;
  }
}
