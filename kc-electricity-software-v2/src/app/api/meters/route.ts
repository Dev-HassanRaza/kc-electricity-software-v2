// ============================================================
// API: /api/meters
// GET  — list all meters (filter: status, floor)
// POST — assign a new meter to a party
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, queryOne, sql } from "@/lib/db"
import { z } from "zod"
import type { Meter } from "@/types"

const createMeterSchema = z.object({
  idno:    z.number().int().positive(),
  shop:    z.string().min(1).max(100),
  floor:   z.string().min(1).max(100),
  meterno: z.string().min(1).max(100),
  pstat:   z.string().default("Consumer"),
  status:  z.string().default("Active"),
  vdate:   z.string().optional(),
})

// GET /api/meters?status=Active&floor=GROUND
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const statusFilter = searchParams.get("status")
  const floorFilter  = searchParams.get("floor")

  try {
    let sqlText = "SELECT * FROM [dbo].[Add_Meter] WHERE 1=1"
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (statusFilter) {
      sqlText += " AND status = @status"
      bindings.push({ name: "status", type: sql.VarChar(50), value: statusFilter })
    }
    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }

    sqlText += " ORDER BY floor, shop"

    const meters = await query<Meter>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: meters })
  } catch (err) {
    console.error("[/api/meters GET]", err)
    return NextResponse.json({ error: "Failed to fetch meters" }, { status: 500 })
  }
}

// POST /api/meters
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createMeterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { idno, shop, floor, meterno, pstat, status, vdate } = parsed.data

  try {
    await execute(
      `INSERT INTO [dbo].[Add_Meter] (idno, shop, floor, meterno, pstat, status, vdate)
       VALUES (@idno, @shop, @floor, @meterno, @pstat, @status, @vdate)`,
      (r) => {
        r.input("idno",    sql.Int,         idno)
        r.input("shop",    sql.VarChar(100), shop)
        r.input("floor",   sql.VarChar(100), floor)
        r.input("meterno", sql.VarChar(100), meterno)
        r.input("pstat",   sql.VarChar(50),  pstat)
        r.input("status",  sql.VarChar(50),  status)
        r.input("vdate",   sql.Date,         vdate ? new Date(vdate) : new Date())
      }
    )
    return NextResponse.json({ message: "Meter assigned successfully" }, { status: 201 })
  } catch (err) {
    console.error("[/api/meters POST]", err)
    return NextResponse.json({ error: "Failed to assign meter" }, { status: 500 })
  }
}
