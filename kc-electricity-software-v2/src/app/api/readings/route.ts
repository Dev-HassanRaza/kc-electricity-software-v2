// ============================================================
// API: /api/readings
// GET  — list all meter readings (Prev table)
// POST — submit a new meter reading
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, queryOne, sql } from "@/lib/db"
import { z } from "zod"
import type { PrevReading } from "@/types"

const createReadingSchema = z.object({
  idno:    z.number().int().positive(),
  shop:    z.string().min(1).max(100),
  floor:   z.string().min(1).max(100),
  meterno: z.string().min(1).max(100),
  pstat:   z.string().default("Consumer"),
  reading: z.number().min(0),
  arr:     z.number().min(0).default(0),
  vdate:   z.string().optional(),
  ext:     z.string().default(""),
})

// GET /api/readings?floor=GROUND&idno=5
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter = searchParams.get("floor")
  const idnoFilter  = searchParams.get("idno")

  try {
    let sqlText = "SELECT * FROM [dbo].[Prev] WHERE 1=1"
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }
    if (idnoFilter) {
      sqlText += " AND idno = @idno"
      bindings.push({ name: "idno", type: sql.Int, value: parseInt(idnoFilter, 10) })
    }

    sqlText += " ORDER BY vdate DESC, shop"

    const readings = await query<PrevReading>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: readings })
  } catch (err) {
    console.error("[/api/readings GET]", err)
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 })
  }
}

// POST /api/readings
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createReadingSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { idno, shop, floor, meterno, pstat, reading, arr, vdate, ext } = parsed.data

  try {
    // Get the latest previous reading to compute useunit
    const prevReading = await queryOne<PrevReading>(
      `SELECT TOP 1 reading FROM [dbo].[Prev]
       WHERE idno = @idno ORDER BY vdate DESC, serial DESC`,
      (r) => r.input("idno", sql.Int, idno)
    )

    const previousReading = prevReading?.reading ?? 0
    const useunit = Math.max(0, reading - previousReading)

    await execute(
      `INSERT INTO [dbo].[Prev] (idno, shop, floor, meterno, pstat, reading, arr, vdate, ext)
       VALUES (@idno, @shop, @floor, @meterno, @pstat, @reading, @arr, @vdate, @ext)`,
      (r) => {
        r.input("idno",    sql.Int,         idno)
        r.input("shop",    sql.VarChar(100), shop)
        r.input("floor",   sql.VarChar(100), floor)
        r.input("meterno", sql.VarChar(100), meterno)
        r.input("pstat",   sql.VarChar(50),  pstat)
        r.input("reading", sql.Decimal(10, 2), reading)
        r.input("arr",     sql.Decimal(10, 2), arr)
        r.input("vdate",   sql.Date, vdate ? new Date(vdate) : new Date())
        r.input("ext",     sql.VarChar(255), ext)
      }
    )

    return NextResponse.json(
      { data: { useunit, previousReading, currentReading: reading }, message: "Reading submitted successfully" },
      { status: 201 }
    )
  } catch (err) {
    console.error("[/api/readings POST]", err)
    return NextResponse.json({ error: "Failed to submit reading" }, { status: 500 })
  }
}
