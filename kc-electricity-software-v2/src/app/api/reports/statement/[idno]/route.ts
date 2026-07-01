// ============================================================
// API: /api/reports/statement/[idno]
// GET — Full account statement for a specific party
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, queryOne, sql } from "@/lib/db"
import type { LedgerEntry, Party } from "@/types"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ idno: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { idno } = await params
  const idnoNum = parseInt(idno, 10)
  if (isNaN(idnoNum)) return NextResponse.json({ error: "Invalid idno" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const fromDate = searchParams.get("from")
  const toDate   = searchParams.get("to")

  try {
    // Get party info for the header
    const party = await queryOne<Party>(
      "SELECT * FROM [dbo].[Add_party] WHERE idno = @idno",
      (r) => r.input("idno", sql.Int, idnoNum)
    )

    let sqlText = `
      SELECT * FROM [dbo].[Ledger]
      WHERE idno = @idno
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = [
      { name: "idno", type: sql.Int, value: idnoNum },
    ]

    if (fromDate) {
      sqlText += " AND bdate >= @fromDate"
      bindings.push({ name: "fromDate", type: sql.Date, value: new Date(fromDate) })
    }
    if (toDate) {
      sqlText += " AND bdate <= @toDate"
      bindings.push({ name: "toDate", type: sql.Date, value: new Date(toDate) })
    }

    sqlText += " ORDER BY bdate ASC, serial ASC"

    const statement = await query<LedgerEntry>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: { party, statement } })
  } catch (err) {
    console.error("[/api/reports/statement/[idno]]", err)
    return NextResponse.json({ error: "Failed to generate statement" }, { status: 500 })
  }
}
