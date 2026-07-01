// ============================================================
// API: /api/bills/[serial]/discount
// PATCH — Apply a discount to a bill and recalculate balance
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne, execute, sql } from "@/lib/db"
import { applyPayment } from "@/lib/bill-calculator"
import { z } from "zod"
import type { LedgerEntry } from "@/types"

const discountSchema = z.object({
  disc: z.number().min(0),
})

// PATCH /api/bills/[serial]/discount
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serial } = await params
  const serialNum = parseInt(serial, 10)
  if (isNaN(serialNum)) return NextResponse.json({ error: "Invalid serial" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = discountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { disc } = parsed.data

  try {
    const bill = await queryOne<LedgerEntry>(
      "SELECT serial, gamt, dbt, disc FROM [dbo].[Ledger] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 })

    const { bal, status } = applyPayment(bill.gamt, bill.dbt ?? 0, disc)

    await execute(
      `UPDATE [dbo].[Ledger]
       SET disc = @disc, bal = @bal, Status = @status
       WHERE serial = @serial`,
      (r) => {
        r.input("disc",   sql.Decimal(10, 2), disc)
        r.input("bal",    sql.Decimal(10, 2), bal)
        r.input("status", sql.VarChar(50),    status)
        r.input("serial", sql.Int,            serialNum)
      }
    )

    return NextResponse.json({
      data: { disc, bal, status },
      message: "Discount applied successfully",
    })
  } catch (err) {
    console.error("[/api/bills/[serial]/discount PATCH]", err)
    return NextResponse.json({ error: "Failed to apply discount" }, { status: 500 })
  }
}
