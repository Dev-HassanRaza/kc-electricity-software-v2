// ============================================================
// API: /api/reports/recovery
// GET — Total recovered (payments) summarized by date and floor
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { RecoveryRow } from "@/types"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter = searchParams.get("floor")
  const fromDate    = searchParams.get("from")
  const toDate      = searchParams.get("to")

  try {
    let sqlText = `
      SELECT
        CONVERT(VARCHAR(10), ddate, 23) AS ddate,
        floor,
        SUM(dbt)   AS totalDbt,
        COUNT(*)   AS count
      FROM [dbo].[Ledger]
      WHERE dbt > 0 AND ddate IS NOT NULL
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }
    if (fromDate) {
      sqlText += " AND ddate >= @fromDate"
      bindings.push({ name: "fromDate", type: sql.Date, value: new Date(fromDate) })
    }
    if (toDate) {
      sqlText += " AND ddate <= @toDate"
      bindings.push({ name: "toDate", type: sql.Date, value: new Date(toDate) })
    }

    sqlText += " GROUP BY CONVERT(VARCHAR(10), ddate, 23), floor ORDER BY ddate DESC, floor"

    const rows = await query<RecoveryRow>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("[/api/reports/recovery]", err)
    return NextResponse.json({ error: "Failed to generate recovery report" }, { status: 500 })
  }
}
