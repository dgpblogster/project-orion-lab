/**
 * SQL Server Connection Pool Manager
 *
 * This module establishes and manages the connection pool to the SQL Server database.
 * The pool is initialized once at startup and reused across all tool calls for efficiency.
 */

import sql from "mssql";

// Connection pool instance - initialized once and reused
let pool: sql.ConnectionPool | null = null;

/**
 * Builds the SQL Server configuration from environment variables.
 * Supports both Windows Authentication (trusted connection) and SQL Authentication.
 */
function buildConfig(): sql.config {
  const config: sql.config = {
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_DATABASE || "ProjectOrion",
    options: {
      trustServerCertificate:
        process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
      encrypt: process.env.DB_ENCRYPT === "true",
    },
  };

  // Use Windows Authentication if trusted connection is enabled
  if (process.env.DB_TRUSTED_CONNECTION === "true") {
    // For Windows Authentication, we use the trusted connection option
    // This requires the 'msnodesqlv8' driver in some environments
    config.options = {
      ...config.options,
      trustedConnection: true,
    };
  } else {
    // SQL Server Authentication with username/password
    config.user = process.env.DB_USER;
    config.password = process.env.DB_PASSWORD;
  }

  return config;
}

/**
 * Gets the database connection pool, creating it if it doesn't exist.
 * This ensures we maintain a single connection pool throughout the application lifecycle.
 *
 * @returns The SQL Server connection pool
 * @throws Error if connection cannot be established
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  const config = buildConfig();

  try {
    pool = await sql.connect(config);
    console.error("[DB] Connected to SQL Server:", config.server);
    return pool;
  } catch (error) {
    console.error("[DB] Failed to connect to SQL Server:", error);
    throw error;
  }
}

/**
 * Closes the database connection pool gracefully.
 * Should be called when the server shuts down.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      console.error("[DB] Connection pool closed");
    } catch (error) {
      console.error("[DB] Error closing connection pool:", error);
    }
  }
}

/**
 * Executes a SQL query and returns the result.
 * Provides a clean wrapper around the connection pool with error handling.
 *
 * @param queryFn - A function that takes a pool and returns a query result
 * @returns The query result or an error object
 */
export async function executeQuery<T>(
  queryFn: (pool: sql.ConnectionPool) => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const connectionPool = await getPool();
    const result = await queryFn(connectionPool);
    return { success: true, data: result };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    console.error("[DB] Query error:", errorMessage);
    return { success: false, error: errorMessage };
  }
}
