// ============================================================
// API: /api/readings/party/[idno]
// GET — reading history for a specific party
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, sql } from "@/lib/db"
import type { PrevReading } from "@/types"

// GET /api/readings/party/[idno]
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
    const readings = await query<PrevReading>(
      `SELECT * FROM [dbo].[Prev]
       WHERE idno = @idno
       ORDER BY vdate DESC, serial DESC`,
      (r) => r.input("idno", sql.Int, idnoNum)
    )
    return NextResponse.json({ data: readings })
  } catch (err) {
    console.error("[/api/readings/party/[idno] GET]", err)
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 })
  }
}
