// ============================================================
// API: /api/reports/daily
// GET — Payments collected on a specific date (or date range)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { DailyReportRow } from "@/types"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date        = searchParams.get("date")      // single date
  const fromDate    = searchParams.get("from")
  const toDate      = searchParams.get("to")
  const floorFilter = searchParams.get("floor")

  try {
    let sqlText = `
      SELECT
        floor,
        shop,
        CONVERT(VARCHAR(10), ddate, 23) AS ddate,
        dbt,
        disc
      FROM [dbo].[Ledger]
      WHERE dbt > 0 AND ddate IS NOT NULL
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (date) {
      sqlText += " AND CAST(ddate AS DATE) = @date"
      bindings.push({ name: "date", type: sql.Date, value: new Date(date) })
    } else {
      if (fromDate) {
        sqlText += " AND ddate >= @fromDate"
        bindings.push({ name: "fromDate", type: sql.Date, value: new Date(fromDate) })
      }
      if (toDate) {
        sqlText += " AND ddate <= @toDate"
        bindings.push({ name: "toDate", type: sql.Date, value: new Date(toDate) })
      }
    }

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }

    sqlText += " ORDER BY ddate DESC, floor, shop"

    const rows = await query<DailyReportRow>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("[/api/reports/daily]", err)
    return NextResponse.json({ error: "Failed to generate daily report" }, { status: 500 })
  }
}
