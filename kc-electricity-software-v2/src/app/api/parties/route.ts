// ============================================================
// API: /api/parties
// GET  — list all parties (optionally filtered by floor)
// POST — create a new party/shop
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, sql } from "@/lib/db"
import { z } from "zod"
import type { Party } from "@/types"

const createPartySchema = z.object({
  idno:  z.number().int().positive(),
  shop:  z.string().min(1).max(100),
  floor: z.string().min(1).max(100),
  stat:  z.string().default("Active"),
  vdate: z.string().optional(), // ISO date string
})

// GET /api/parties?floor=GROUND&search=A-10
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter  = searchParams.get("floor")
  const searchFilter = searchParams.get("search")

  try {
    let sqlText = `
      SELECT p.serial, p.idno, p.shop, p.floor, p.stat, p.vdate
      FROM [dbo].[Add_party] p
      WHERE 1=1
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND p.floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }
    if (searchFilter) {
      sqlText += " AND (p.shop LIKE @search OR CAST(p.idno AS VARCHAR) LIKE @search)"
      bindings.push({ name: "search", type: sql.VarChar(110), value: `%${searchFilter}%` })
    }

    sqlText += " ORDER BY p.floor, p.shop"

    const parties = await query<Party>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: parties })
  } catch (err) {
    console.error("[/api/parties GET]", err)
    return NextResponse.json({ error: "Failed to fetch parties" }, { status: 500 })
  }
}

// POST /api/parties
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createPartySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { idno, shop, floor, stat, vdate } = parsed.data

  try {
    await execute(
      `INSERT INTO [dbo].[Add_party] (idno, shop, floor, stat, vdate)
       VALUES (@idno, @shop, @floor, @stat, @vdate)`,
      (r) => {
        r.input("idno",  sql.Int,         idno)
        r.input("shop",  sql.VarChar(100), shop)
        r.input("floor", sql.VarChar(100), floor)
        r.input("stat",  sql.VarChar(50),  stat)
        r.input("vdate", sql.Date,         vdate ? new Date(vdate) : new Date())
      }
    )
    return NextResponse.json({ message: "Party created successfully" }, { status: 201 })
  } catch (err) {
    console.error("[/api/parties POST]", err)
    return NextResponse.json({ error: "Failed to create party" }, { status: 500 })
  }
}
