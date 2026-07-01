// ============================================================
// API: /api/bills/[serial]/payment
// PATCH — Record a payment against a bill
//
// Logic:
//   bal    = gamt - dbt - disc
//   Status = 'Cleared' if bal <= 0, else 'Uncleared'
//   ddate  = today (payment date)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne, execute, sql } from "@/lib/db"
import { applyPayment } from "@/lib/bill-calculator"
import { z } from "zod"
import type { LedgerEntry } from "@/types"

const paymentSchema = z.object({
  dbt:    z.number().min(0),          // amount paid
  ddate:  z.string().optional(),      // payment date (defaults to today)
  porder: z.string().default(""),     // payment reference / order number
})

// PATCH /api/bills/[serial]/payment
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
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { dbt, ddate, porder } = parsed.data

  try {
    const bill = await queryOne<LedgerEntry>(
      "SELECT serial, gamt, dbt, disc, Status FROM [dbo].[Ledger] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )
    if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 })

    // Cumulative: add new payment to any existing payment
    const totalDbt  = (bill.dbt ?? 0) + dbt
    const { bal, status } = applyPayment(bill.gamt, totalDbt, bill.disc ?? 0)

    await execute(
      `UPDATE [dbo].[Ledger]
       SET dbt = @dbt, bal = @bal, Status = @status, ddate = @ddate, porder = @porder
       WHERE serial = @serial`,
      (r) => {
        r.input("dbt",    sql.Decimal(10, 2), totalDbt)
        r.input("bal",    sql.Decimal(10, 2), bal)
        r.input("status", sql.VarChar(50),    status)
        r.input("ddate",  sql.Date,           ddate ? new Date(ddate) : new Date())
        r.input("porder", sql.VarChar(100),   porder)
        r.input("serial", sql.Int,            serialNum)
      }
    )

    return NextResponse.json({
      data: { dbt: totalDbt, bal, status },
      message: status === "Cleared" ? "Payment recorded — bill fully cleared" : "Payment recorded — balance remaining",
    })
  } catch (err) {
    console.error("[/api/bills/[serial]/payment PATCH]", err)
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 })
  }
}
