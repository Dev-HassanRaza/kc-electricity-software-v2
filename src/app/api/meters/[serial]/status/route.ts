// ============================================================
// API: /api/meters/[serial]/status
// PATCH — toggle meter status: Active ↔ Inactive
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne, execute, sql } from "@/lib/db"
import type { Meter } from "@/types"

// PATCH /api/meters/[serial]/status
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serial } = await params
  const serialNum = parseInt(serial, 10)
  if (isNaN(serialNum)) return NextResponse.json({ error: "Invalid serial" }, { status: 400 })

  try {
    const meter = await queryOne<Meter>(
      "SELECT serial, status FROM [dbo].[Add_Meter] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )
    if (!meter) return NextResponse.json({ error: "Meter not found" }, { status: 404 })

    const newStatus = meter.status === "Active" ? "Inactive" : "Active"

    await execute(
      "UPDATE [dbo].[Add_Meter] SET status = @status WHERE serial = @serial",
      (r) => {
        r.input("status", sql.VarChar(50), newStatus)
        r.input("serial", sql.Int, serialNum)
      }
    )

    return NextResponse.json({ data: { status: newStatus }, message: `Meter set to ${newStatus}` })
  } catch (err) {
    console.error("[/api/meters/[serial]/status PATCH]", err)
    return NextResponse.json({ error: "Failed to update meter status" }, { status: 500 })
  }
}
