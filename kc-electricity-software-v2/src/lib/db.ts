// ============================================================
// KC Electricity Software v2 — MSSQL Database Client
// Singleton connection pool for Microsoft SQL Server
// Target DB: [Electircity] (legacy spelling preserved)
// ============================================================

import * as sql from "mssql"

const config: sql.config = {
  server:   process.env.MSSQL_SERVER   ?? "localhost",
  database: process.env.MSSQL_DATABASE ?? "Electircity",
  user:     process.env.MSSQL_USER     ?? "sa",
  password: process.env.MSSQL_PASSWORD ?? "",
  port:     parseInt(process.env.MSSQL_PORT ?? "1433", 10),
  options: {
    trustServerCertificate: true,   // required for local / self-signed certs
    enableArithAbort:       true,
    encrypt:                process.env.MSSQL_ENCRYPT === "true",
  },
  pool: {
    max:              10,
    min:              0,
    idleTimeoutMillis: 30_000,
  },
  connectionTimeout: 30_000,
  requestTimeout:    30_000,
}

// ── Singleton Pool ────────────────────────────────────────────
// Next.js hot-reloads in dev, so we attach the pool to the
// global object to avoid "Too many connections" errors.
declare global {
  // eslint-disable-next-line no-var
  var __mssqlPool: sql.ConnectionPool | undefined
}

async function getPool(): Promise<sql.ConnectionPool> {
  if (global.__mssqlPool?.connected) {
    return global.__mssqlPool
  }

  const pool = new sql.ConnectionPool(config)

  pool.on("error", (err: Error) => {
    console.error("[DB] Pool error:", err)
  })

  await pool.connect()
  global.__mssqlPool = pool
  return pool
}

// ── Typed Query Helper ────────────────────────────────────────
/**
 * Execute a parameterized SQL query and return typed rows.
 *
 * Usage:
 *   const rows = await query<Floor>(
 *     "SELECT * FROM Add_Floor WHERE idno = @idno",
 *     (req) => req.input("idno", sql.Int, 5)
 *   )
 */
export async function query<T>(
  sqlText: string,
  bindParams?: (req: sql.Request) => void
): Promise<T[]> {
  const pool = await getPool()
  const request = pool.request()
  if (bindParams) bindParams(request)

  const result = await request.query<T>(sqlText)
  return result.recordset
}

/**
 * Execute a query that returns a single row (or null).
 */
export async function queryOne<T>(
  sqlText: string,
  bindParams?: (req: sql.Request) => void
): Promise<T | null> {
  const rows = await query<T>(sqlText, bindParams)
  return rows[0] ?? null
}

/**
 * Execute an INSERT / UPDATE / DELETE and return rows affected.
 */
export async function execute(
  sqlText: string,
  bindParams?: (req: sql.Request) => void
): Promise<number> {
  const pool = await getPool()
  const request = pool.request()
  if (bindParams) bindParams(request)

  const result = await request.query(sqlText)
  return result.rowsAffected[0] ?? 0
}

export { sql }
export default getPool
