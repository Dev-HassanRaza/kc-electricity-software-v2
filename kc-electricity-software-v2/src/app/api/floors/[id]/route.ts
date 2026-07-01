// ============================================================
// API: /api/floors/[id]
// PUT    — update floor name
// DELETE — delete floor (blocked if parties exist on it)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, sql } from "@/lib/db"
import { z } from "zod"
import type { Floor } from "@/types"

const updateFloorSchema = z.object({
  floor: z.string().min(1).max(100),
})

// PUT /api/floors/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const idno = parseInt(id, 10)
  if (isNaN(idno)) return NextResponse.json({ error: "Invalid floor ID" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = updateFloorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { floor } = parsed.data

  try {
    // Check if floor exists
    const existing = await query<Floor>(
      "SELECT idno FROM [dbo].[Add_Floor] WHERE idno = @idno",
      (req) => req.input("idno", sql.Int, idno)
    )
    if (existing.length === 0) {
      return NextResponse.json({ error: "Floor not found" }, { status: 404 })
    }

    await execute(
      "UPDATE [dbo].[Add_Floor] SET floor = @floor WHERE idno = @idno",
      (req) => {
        req.input("floor", sql.VarChar(100), floor)
        req.input("idno", sql.Int, idno)
      }
    )

    return NextResponse.json({ message: "Floor updated successfully" })
  } catch (err) {
    console.error("[/api/floors/[id] PUT]", err)
    return NextResponse.json({ error: "Failed to update floor" }, { status: 500 })
  }
}

// DELETE /api/floors/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const idno = parseInt(id, 10)
  if (isNaN(idno)) return NextResponse.json({ error: "Invalid floor ID" }, { status: 400 })

  try {
    // Get the floor name first
    const floorRows = await query<Floor>(
      "SELECT floor FROM [dbo].[Add_Floor] WHERE idno = @idno",
      (req) => req.input("idno", sql.Int, idno)
    )
    if (floorRows.length === 0) {
      return NextResponse.json({ error: "Floor not found" }, { status: 404 })
    }

    const floorName = floorRows[0].floor

    // Block delete if parties exist on this floor
    const partiesOnFloor = await query<{ cnt: number }>(
      "SELECT COUNT(*) AS cnt FROM [dbo].[Add_party] WHERE floor = @floor",
      (req) => req.input("floor", sql.VarChar(100), floorName)
    )
    if ((partiesOnFloor[0]?.cnt ?? 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete floor: parties/shops are assigned to it. Remove all shops first." },
        { status: 409 }
      )
    }

    // Also block if unit rates exist for this floor
    await execute(
      "DELETE FROM [dbo].[Add_unit] WHERE floor = @floor",
      (req) => req.input("floor", sql.VarChar(100), floorName)
    )

    await execute(
      "DELETE FROM [dbo].[Add_Floor] WHERE idno = @idno",
      (req) => req.input("idno", sql.Int, idno)
    )

    return NextResponse.json({ message: "Floor deleted successfully" })
  } catch (err) {
    console.error("[/api/floors/[id] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete floor" }, { status: 500 })
  }
}
