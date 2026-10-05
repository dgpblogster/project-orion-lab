/**
 * SQL Server Database Connection Pool
 *
 * This module manages the connection pool to the ProjectOrion SQL Server database.
 * It supports both Windows Authentication (trusted connection) for local development
 * and SQL Server Authentication for Azure SQL production deployments.
 *
 * Environment variables:
 * - DB_SERVER: SQL Server hostname (e.g., localhost or your-server.database.windows.net)
 * - DB_DATABASE: Database name (ProjectOrion)
 * - DB_TRUSTED_CONNECTION: Set to "true" for Windows Auth (local dev)
 * - DB_USER / DB_PASSWORD: SQL credentials (Azure SQL production)
 * - DB_TRUST_SERVER_CERTIFICATE: Trust self-signed certs (local dev)
 */

import sql from "mssql";

// Build the connection configuration from environment variables
const getConfig = (): sql.config => {
  const server = process.env.DB_SERVER || "localhost";
  const database = process.env.DB_DATABASE || "ProjectOrion";
  const trustServerCertificate =
    process.env.DB_TRUST_SERVER_CERTIFICATE === "true";

  // Check if we're using Windows Authentication (trusted connection)
  const useTrustedConnection =
    process.env.DB_TRUSTED_CONNECTION === "true";

  if (useTrustedConnection) {
    // Windows Authentication configuration (local development)
    return {
      server,
      database,
      options: {
        trustServerCertificate,
        trustedConnection: true,
      },
    };
  } else {
    // SQL Server Authentication configuration (Azure SQL / production)
    return {
      server,
      database,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        trustServerCertificate,
        encrypt: true, // Required for Azure SQL
      },
    };
  }
};

// Global connection pool (singleton pattern)
let pool: sql.ConnectionPool | null = null;

/**
 * Get or create the SQL Server connection pool.
 * Uses a singleton pattern to reuse connections across requests.
 *
 * @returns Promise<sql.ConnectionPool> - The active connection pool
 * @throws Error if connection fails
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  try {
    const config = getConfig();
    pool = await sql.connect(config);
    console.log("✓ Connected to SQL Server:", config.server);
    return pool;
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    throw error;
  }
}

/**
 * Execute a SQL query and return the results.
 * Handles connection pooling automatically.
 *
 * @param query - The SQL query string to execute
 * @returns Promise<sql.IResult<T>> - Query results
 */
export async function executeQuery<T>(
  query: string
): Promise<sql.IResult<T>> {
  const pool = await getPool();
  return pool.request().query<T>(query);
}

// Export the sql module for type access
export { sql };
