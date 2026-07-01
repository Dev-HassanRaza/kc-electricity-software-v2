// ============================================================
// API: /api/reports/use-units
// GET — Unit consumption per party for a period
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { UseUnitsRow } from "@/types"

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
        idno,
        shop,
        floor,
        SUM(useunit) AS totalUnits,
        MIN(CONVERT(VARCHAR(10), bdate, 23)) + ' to ' + MAX(CONVERT(VARCHAR(10), bdate, 23)) AS period
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

    sqlText += " GROUP BY idno, shop, floor ORDER BY floor, totalUnits DESC"

    const rows = await query<UseUnitsRow>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("[/api/reports/use-units]", err)
    return NextResponse.json({ error: "Failed to generate use-units report" }, { status: 500 })
  }
}
