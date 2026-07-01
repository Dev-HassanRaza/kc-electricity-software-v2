// ============================================================
// API: /api/reports/defaulters
// GET — Parties with unpaid arrears (arr > 0 OR Status = Uncleared)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { DefaulterRow } from "@/types"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter = searchParams.get("floor")

  try {
    let sqlText = `
      SELECT
        idno,
        shop,
        floor,
        SUM(arr) AS arr,
        SUM(bal) AS bal,
        MAX(CONVERT(VARCHAR(10), bdate, 23)) AS lastBillDate
      FROM [dbo].[Ledger]
      WHERE Status = 'Uncleared' AND bal > 0
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }

    sqlText += " GROUP BY idno, shop, floor HAVING SUM(bal) > 0 ORDER BY SUM(bal) DESC"

    const rows = await query<DefaulterRow>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("[/api/reports/defaulters]", err)
    return NextResponse.json({ error: "Failed to generate defaulters report" }, { status: 500 })
  }
}
