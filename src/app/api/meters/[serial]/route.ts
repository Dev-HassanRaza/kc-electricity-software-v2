// ============================================================
// API: /api/meters/[serial]
// GET — get single meter
// PUT — update meter info
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne, execute, sql } from "@/lib/db"
import { z } from "zod"
import type { Meter } from "@/types"

const updateMeterSchema = z.object({
  meterno: z.string().min(1).max(100).optional(),
  pstat:   z.string().optional(),
  vdate:   z.string().optional(),
})

// GET /api/meters/[serial]
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
    const meter = await queryOne<Meter>(
      "SELECT * FROM [dbo].[Add_Meter] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )
    if (!meter) return NextResponse.json({ error: "Meter not found" }, { status: 404 })

    return NextResponse.json({ data: meter })
  } catch (err) {
    console.error("[/api/meters/[serial] GET]", err)
    return NextResponse.json({ error: "Failed to fetch meter" }, { status: 500 })
  }
}

// PUT /api/meters/[serial]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serial } = await params
  const serialNum = parseInt(serial, 10)
  if (isNaN(serialNum)) return NextResponse.json({ error: "Invalid serial" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateMeterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { meterno, pstat, vdate } = parsed.data

  try {
    const setParts: string[] = []
    if (meterno !== undefined) setParts.push("meterno = @meterno")
    if (pstat   !== undefined) setParts.push("pstat = @pstat")
    if (vdate   !== undefined) setParts.push("vdate = @vdate")

    if (setParts.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    await execute(
      `UPDATE [dbo].[Add_Meter] SET ${setParts.join(", ")} WHERE serial = @serial`,
      (r) => {
        r.input("serial", sql.Int, serialNum)
        if (meterno !== undefined) r.input("meterno", sql.VarChar(100), meterno)
        if (pstat   !== undefined) r.input("pstat",   sql.VarChar(50),  pstat)
        if (vdate   !== undefined) r.input("vdate",   sql.Date,         new Date(vdate))
      }
    )

    return NextResponse.json({ message: "Meter updated successfully" })
  } catch (err) {
    console.error("[/api/meters/[serial] PUT]", err)
    return NextResponse.json({ error: "Failed to update meter" }, { status: 500 })
  }
}
