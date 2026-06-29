// ============================================================
// API: /api/unit-rates/[id]
// PUT — update unit rate for a floor
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { queryOne, execute, sql } from "@/lib/db"
import { z } from "zod"
import type { UnitRate } from "@/types"

const updateRateSchema = z.object({
  puc: z.number().min(0).optional(),
  pc:  z.number().min(0).optional(),
  mr:  z.number().min(0).optional(),
  sc:  z.number().min(0).optional(),
  avr: z.number().min(0).optional(),
})

// PUT /api/unit-rates/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const idNum = parseInt(id, 10)
  if (isNaN(idNum)) return NextResponse.json({ error: "Invalid rate ID" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateRateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { puc, pc, mr, sc, avr } = parsed.data

  try {
    const existing = await queryOne<UnitRate>(
      "SELECT serial FROM [dbo].[Add_unit] WHERE serial = @serial",
      (r) => r.input("serial", sql.Int, idNum)
    )
    if (!existing) return NextResponse.json({ error: "Unit rate not found" }, { status: 404 })

    const setParts: string[] = []
    if (puc !== undefined) setParts.push("puc = @puc")
    if (pc  !== undefined) setParts.push("pc = @pc")
    if (mr  !== undefined) setParts.push("mr = @mr")
    if (sc  !== undefined) setParts.push("sc = @sc")
    if (avr !== undefined) setParts.push("avr = @avr")

    if (setParts.length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 })

    await execute(
      `UPDATE [dbo].[Add_unit] SET ${setParts.join(", ")} WHERE serial = @serial`,
      (r) => {
        r.input("serial", sql.Int, idNum)
        if (puc !== undefined) r.input("puc", sql.Decimal(10, 2), puc)
        if (pc  !== undefined) r.input("pc",  sql.Decimal(10, 2), pc)
        if (mr  !== undefined) r.input("mr",  sql.Decimal(10, 2), mr)
        if (sc  !== undefined) r.input("sc",  sql.Decimal(10, 2), sc)
        if (avr !== undefined) r.input("avr", sql.Decimal(10, 2), avr)
      }
    )

    return NextResponse.json({ message: "Unit rate updated successfully" })
  } catch (err) {
    console.error("[/api/unit-rates/[id] PUT]", err)
    return NextResponse.json({ error: "Failed to update unit rate" }, { status: 500 })
  }
}
