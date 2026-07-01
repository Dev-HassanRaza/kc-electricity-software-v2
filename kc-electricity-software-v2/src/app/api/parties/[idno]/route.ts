// ============================================================
// API: /api/parties/[idno]
// GET    — get single party by idno
// PUT    — update party details
// DELETE — delete party (cascades: Meter, Ledger, Prev)
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, queryOne, sql } from "@/lib/db"
import { z } from "zod"
import type { Party } from "@/types"

const updatePartySchema = z.object({
  shop:  z.string().min(1).max(100).optional(),
  floor: z.string().min(1).max(100).optional(),
  stat:  z.string().optional(),
  vdate: z.string().optional(),
})

// GET /api/parties/[idno]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ idno: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { idno } = await params
  const idnoNum = parseInt(idno, 10)
  if (isNaN(idnoNum)) return NextResponse.json({ error: "Invalid idno" }, { status: 400 })

  try {
    const party = await queryOne<Party>(
      "SELECT * FROM [dbo].[Add_party] WHERE idno = @idno",
      (r) => r.input("idno", sql.Int, idnoNum)
    )
    if (!party) return NextResponse.json({ error: "Party not found" }, { status: 404 })

    return NextResponse.json({ data: party })
  } catch (err) {
    console.error("[/api/parties/[idno] GET]", err)
    return NextResponse.json({ error: "Failed to fetch party" }, { status: 500 })
  }
}

// PUT /api/parties/[idno]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ idno: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { idno } = await params
  const idnoNum = parseInt(idno, 10)
  if (isNaN(idnoNum)) return NextResponse.json({ error: "Invalid idno" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const parsed = updatePartySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const fields: string[] = []
  const { shop, floor, stat, vdate } = parsed.data

  try {
    const setParts: string[] = []
    if (shop  !== undefined) setParts.push("shop = @shop")
    if (floor !== undefined) setParts.push("floor = @floor")
    if (stat  !== undefined) setParts.push("stat = @stat")
    if (vdate !== undefined) setParts.push("vdate = @vdate")

    if (setParts.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    await execute(
      `UPDATE [dbo].[Add_party] SET ${setParts.join(", ")} WHERE idno = @idno`,
      (r) => {
        r.input("idno", sql.Int, idnoNum)
        if (shop  !== undefined) r.input("shop",  sql.VarChar(100), shop)
        if (floor !== undefined) r.input("floor", sql.VarChar(100), floor)
        if (stat  !== undefined) r.input("stat",  sql.VarChar(50),  stat)
        if (vdate !== undefined) r.input("vdate", sql.Date,         new Date(vdate))
      }
    )

    return NextResponse.json({ message: "Party updated successfully" })
  } catch (err) {
    console.error("[/api/parties/[idno] PUT]", err)
    return NextResponse.json({ error: "Failed to update party" }, { status: 500 })
  }
}

// DELETE /api/parties/[idno]
// Cascade order: Prev → Ledger → Add_Meter → Add_party
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ idno: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { idno } = await params
  const idnoNum = parseInt(idno, 10)
  if (isNaN(idnoNum)) return NextResponse.json({ error: "Invalid idno" }, { status: 400 })

  try {
    const existing = await queryOne<Party>(
      "SELECT idno FROM [dbo].[Add_party] WHERE idno = @idno",
      (r) => r.input("idno", sql.Int, idnoNum)
    )
    if (!existing) return NextResponse.json({ error: "Party not found" }, { status: 404 })

    // Cascade deletes (same order as legacy delete_shops.txt)
    await execute("DELETE FROM [dbo].[Prev]      WHERE idno = @idno", (r) => r.input("idno", sql.Int, idnoNum))
    await execute("DELETE FROM [dbo].[Ledger]    WHERE idno = @idno", (r) => r.input("idno", sql.Int, idnoNum))
    await execute("DELETE FROM [dbo].[Add_Meter] WHERE idno = @idno", (r) => r.input("idno", sql.Int, idnoNum))
    await execute("DELETE FROM [dbo].[Add_party] WHERE idno = @idno", (r) => r.input("idno", sql.Int, idnoNum))

    return NextResponse.json({ message: "Party and all related records deleted" })
  } catch (err) {
    console.error("[/api/parties/[idno] DELETE]", err)
    return NextResponse.json({ error: "Failed to delete party" }, { status: 500 })
  }
}
