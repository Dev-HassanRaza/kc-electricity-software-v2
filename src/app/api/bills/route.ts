// ============================================================
// API: /api/bills
// GET — list all bills with optional filters
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { LedgerEntry } from "@/types"

// GET /api/bills?floor=GROUND&status=Uncleared&from=2024-01-01&to=2024-12-31
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter  = searchParams.get("floor")
  const statusFilter = searchParams.get("status")
  const fromDate     = searchParams.get("from")
  const toDate       = searchParams.get("to")
  const limitParam   = searchParams.get("limit")
  const limit        = limitParam ? parseInt(limitParam, 10) : 500

  try {
    let sqlText = `
      SELECT TOP (@limit) *
      FROM [dbo].[Ledger]
      WHERE 1=1
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = [
      { name: "limit", type: sql.Int, value: limit },
    ]

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }
    if (statusFilter) {
      sqlText += " AND Status = @status"
      bindings.push({ name: "status", type: sql.VarChar(50), value: statusFilter })
    }
    if (fromDate) {
      sqlText += " AND bdate >= @fromDate"
      bindings.push({ name: "fromDate", type: sql.Date, value: new Date(fromDate) })
    }
    if (toDate) {
      sqlText += " AND bdate <= @toDate"
      bindings.push({ name: "toDate", type: sql.Date, value: new Date(toDate) })
    }

    sqlText += " ORDER BY bdate DESC, floor, shop"

    const bills = await query<LedgerEntry>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: bills })
  } catch (err) {
    console.error("[/api/bills GET]", err)
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 })
  }
}
