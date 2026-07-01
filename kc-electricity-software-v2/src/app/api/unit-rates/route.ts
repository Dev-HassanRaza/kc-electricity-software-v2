// ============================================================
// API: /api/unit-rates
// GET  — list all unit rates (per floor)
// POST — create rate for a floor
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, sql } from "@/lib/db"
import { z } from "zod"
import type { UnitRate } from "@/types"

const createRateSchema = z.object({
  floor: z.string().min(1).max(100),
  puc:   z.number().min(0), // per unit charge
  pc:    z.number().min(0), // fixed charge
  mr:    z.number().min(0), // meter rent
  sc:    z.number().min(0), // service charge
  avr:   z.number().min(0), // average rate
})

// GET /api/unit-rates?floor=GROUND
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter = searchParams.get("floor")

  try {
    let sqlText = "SELECT * FROM [dbo].[Add_unit] WHERE 1=1"
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }
    sqlText += " ORDER BY floor"

    const rates = await query<UnitRate>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rates })
  } catch (err) {
    console.error("[/api/unit-rates GET]", err)
    return NextResponse.json({ error: "Failed to fetch unit rates" }, { status: 500 })
  }
}

// POST /api/unit-rates
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createRateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { floor, puc, pc, mr, sc, avr } = parsed.data

  try {
    await execute(
      `INSERT INTO [dbo].[Add_unit] (floor, puc, pc, mr, sc, avr)
       VALUES (@floor, @puc, @pc, @mr, @sc, @avr)`,
      (r) => {
        r.input("floor", sql.VarChar(100), floor)
        r.input("puc",   sql.Decimal(10, 2), puc)
        r.input("pc",    sql.Decimal(10, 2), pc)
        r.input("mr",    sql.Decimal(10, 2), mr)
        r.input("sc",    sql.Decimal(10, 2), sc)
        r.input("avr",   sql.Decimal(10, 2), avr)
      }
    )
    return NextResponse.json({ message: "Unit rate created" }, { status: 201 })
  } catch (err) {
    console.error("[/api/unit-rates POST]", err)
    return NextResponse.json({ error: "Failed to create unit rate" }, { status: 500 })
  }
}
