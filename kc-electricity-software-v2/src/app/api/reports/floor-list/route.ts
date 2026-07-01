// ============================================================
// API: /api/reports/floor-list
// GET — All shops/parties listed per floor
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"

interface FloorListRow {
  idno:    number
  shop:    string
  floor:   string
  meterno: string
  pstat:   string
  status:  string
  stat:    string
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter = searchParams.get("floor")

  try {
    let sqlText = `
      SELECT
        p.idno,
        p.shop,
        p.floor,
        ISNULL(m.meterno, '') AS meterno,
        ISNULL(m.pstat,   '') AS pstat,
        ISNULL(m.status,  '') AS status,
        p.stat
      FROM [dbo].[Add_party] p
      LEFT JOIN [dbo].[Add_Meter] m ON p.idno = m.idno
      WHERE 1=1
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = []

    if (floorFilter) {
      sqlText += " AND p.floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }

    sqlText += " ORDER BY p.floor, p.shop"

    const rows = await query<FloorListRow>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error("[/api/reports/floor-list]", err)
    return NextResponse.json({ error: "Failed to generate floor list" }, { status: 500 })
  }
}
