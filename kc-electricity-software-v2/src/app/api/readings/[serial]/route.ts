// ============================================================
// API: /api/readings/[serial]
// PUT — update previous reading
// DELETE — delete previous reading
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { execute, sql } from "@/lib/db"
import { z } from "zod"

const updateReadingSchema = z.object({
  reading: z.number().min(0).optional(),
  arr:     z.number().min(0).optional(),
  vdate:   z.string().optional(),
  ext:     z.string().optional(),
})

// PUT /api/readings/[serial]
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
  const parsed = updateReadingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { reading, arr, vdate, ext } = parsed.data

  try {
    const setParts: string[] = []
    if (reading !== undefined) setParts.push("reading = @reading")
    if (arr     !== undefined) setParts.push("arr = @arr")
    if (vdate   !== undefined) setParts.push("vdate = @vdate")
    if (ext     !== undefined) setParts.push("ext = @ext")

    if (setParts.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    await execute(
      `UPDATE [dbo].[Prev] SET ${setParts.join(", ")} WHERE serial = @serial`,
      (r) => {
        r.input("serial", sql.Int, serialNum)
        if (reading !== undefined) r.input("reading", sql.Decimal(10, 2), reading)
        if (arr     !== undefined) r.input("arr",     sql.Decimal(10, 2), arr)
        if (vdate   !== undefined) r.input("vdate",   sql.Date,         new Date(vdate))
        if (ext     !== undefined) r.input("ext",     sql.VarChar(255), ext)
      }
    )

    return NextResponse.json({ message: "Reading updated successfully" })
  } catch (err) {
    console.error("[/api/readings/[serial] PUT]", err)
    return NextResponse.json({ error: "Failed to update reading" }, { status: 500 })
  }
}

// DELETE /api/readings/[serial]
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
    await execute(
      "DELETE FROM [dbo].[Prev] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, serialNum)
    )
    return NextResponse.json({ message: "Reading deleted successfully" })
  } catch (err) {
    console.error("[/api/readings/[serial] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete reading" }, { status: 500 })
  }
}
