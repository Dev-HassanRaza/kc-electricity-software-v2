// ============================================================
// API: /api/reports/monthly-summary
// GET — Units consumed & amounts billed per floor per month
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { MonthlySummaryRow } from "@/types"

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
        floor,
        LEFT(DATENAME(month, bdate), 3) + ' ' + CAST(YEAR(bdate) AS VARCHAR(4)) AS month,
        SUM(useunit) AS totalUnits,
        SUM(amt)     AS totalAmt,
        SUM(gamt)    AS totalGamt,
        SUM(dbt)     AS totalDbt
      FROM [dbo].[Ledger]
      WHERE 1=1
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }
    if (fromDate) {
      sqlText += " AND bdate >= @fromDate"
      bindings.push({ name: "fromDate", type: sql.Date, value: new Date(fromDate) })
    }
    if (toDate) {
      sqlText += " AND bdate <= @toDate"
      bindings.push({ name: "toDate", type: sql.Date, value: new Date(toDate) })
    }

    sqlText += " GROUP BY floor, LEFT(DATENAME(month, bdate), 3) + ' ' + CAST(YEAR(bdate) AS VARCHAR(4)), YEAR(bdate), MONTH(bdate)"
    sqlText += " ORDER BY YEAR(bdate) DESC, MONTH(bdate) DESC, floor"

    const rows = await query<MonthlySummaryRow>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("[/api/reports/monthly-summary]", err)
    return NextResponse.json({ error: "Failed to generate monthly summary" }, { status: 500 })
  }
}
