// ============================================================
// API: /api/floors
// GET  — list all floors
// POST — create a new floor
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, sql } from "@/lib/db"
import { z } from "zod"
import type { Floor } from "@/types"

const createFloorSchema = z.object({
  floor: z.string().min(1).max(100),
})

// GET /api/floors
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const floors = await query<Floor>(
      "SELECT idno, floor FROM [dbo].[Add_Floor] ORDER BY floor"
    )
    return NextResponse.json({ data: floors })
  } catch (err) {
    console.error("[/api/floors GET]", err)
    return NextResponse.json({ error: "Failed to fetch floors" }, { status: 500 })
  }
}

// POST /api/floors
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createFloorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { floor } = parsed.data

  try {
    // Check for duplicate floor name
    const existing = await query<Floor>(
      "SELECT idno FROM [dbo].[Add_Floor] WHERE floor = @floor",
      (req) => req.input("floor", sql.VarChar(100), floor)
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: "Floor already exists" }, { status: 409 })
    }

    await execute(
      "INSERT INTO [dbo].[Add_Floor] (floor) VALUES (@floor)",
      (req) => req.input("floor", sql.VarChar(100), floor)
    )

    return NextResponse.json({ message: "Floor created successfully" }, { status: 201 })
  } catch (err) {
    console.error("[/api/floors POST]", err)
    return NextResponse.json({ error: "Failed to create floor" }, { status: 500 })
  }
}
