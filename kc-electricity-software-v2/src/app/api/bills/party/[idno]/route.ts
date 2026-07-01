// ============================================================
// API: /api/bills/party/[idno]
// GET — full bill history for a specific party
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { LedgerEntry } from "@/types"

// GET /api/bills/party/[idno]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idno: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { idno } = await params
  const idnoNum = parseInt(idno, 10)
  if (isNaN(idnoNum)) return NextResponse.json({ error: "Invalid idno" }, { status: 400 })

  try {
    const bills = await query<LedgerEntry>(
      `SELECT * FROM [dbo].[Ledger]
       WHERE idno = @idno
       ORDER BY bdate DESC, serial DESC`,
      (r) => r.input("idno", sql.Int, idnoNum)
    )
    return NextResponse.json({ data: bills })
  } catch (err) {
    console.error("[/api/bills/party/[idno] GET]", err)
    return NextResponse.json({ error: "Failed to fetch bill history" }, { status: 500 })
  }
}
