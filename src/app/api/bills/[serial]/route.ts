// ============================================================
// API: /api/bills/[serial]
// GET — get a single bill by serial
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne, sql } from "@/lib/db"
import type { LedgerEntry } from "@/types"

// GET /api/bills/[serial]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serial } = await params
  const serialNum = parseInt(serial, 10)
  if (isNaN(serialNum)) return NextResponse.json({ error: "Invalid serial" }, { status: 400 })

  try {
    const bill = await queryOne<LedgerEntry>(
      "SELECT * FROM [dbo].[Ledger] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 })

    return NextResponse.json({ data: bill })
  } catch (err) {
    console.error("[/api/bills/[serial] GET]", err)
    return NextResponse.json({ error: "Failed to fetch bill" }, { status: 500 })
  }
}
