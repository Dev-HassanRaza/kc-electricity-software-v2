// ============================================================
// API: /api/bills/[serial]
// GET    — get a single bill by serial
// DELETE — delete a single bill by serial and sync Prev readings
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne, execute, sql } from "@/lib/db"
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

// DELETE /api/bills/[serial]
export async function DELETE(
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
      "SELECT idno, rdate FROM [dbo].[Ledger] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 })

    // 1. Delete from Ledger
    await execute(
      "DELETE FROM [dbo].[Ledger] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )

    // 2. Delete matching reading in Prev
    if (bill.rdate) {
      const rdateVal = bill.rdate
      await execute(
        "DELETE FROM [dbo].[Prev] WHERE idno = @idno AND vdate = @rdate",
        (r) => {
          r.input("idno",  sql.Int,  bill.idno)
          r.input("rdate", sql.Date, new Date(rdateVal))
        }
      )
    }

    return NextResponse.json({ message: "Bill deleted successfully" })
  } catch (err) {
    console.error("[/api/bills/[serial] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete bill" }, { status: 500 })
  }
}

