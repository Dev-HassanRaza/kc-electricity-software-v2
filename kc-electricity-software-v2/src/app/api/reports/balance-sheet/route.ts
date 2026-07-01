// ============================================================
// API: /api/reports/balance-sheet
// GET — Outstanding balance per shop/party
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { BalanceSheetRow } from "@/types"

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
        SUM(gamt) AS totalGamt,
        SUM(dbt)  AS totalDbt,
        SUM(bal)  AS totalBal,
        SUM(arr)  AS totalArr
      FROM [dbo].[Ledger]
      WHERE 1=1
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }

    sqlText += " GROUP BY idno, shop, floor ORDER BY floor, shop"

    const rows = await query<BalanceSheetRow>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("[/api/reports/balance-sheet]", err)
    return NextResponse.json({ error: "Failed to generate balance sheet" }, { status: 500 })
  }
}
