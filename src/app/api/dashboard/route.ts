// ============================================================
// API: /api/dashboard
// GET — Aggregated stats for the dashboard
// ============================================================

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, queryOne } from "@/lib/db"
import type { DashboardStats, MonthlyChartPoint } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // 1. Total collected this calendar month
    const collectedRow = await queryOne<{ total: number }>(
      `SELECT ISNULL(SUM(dbt), 0) AS total FROM [dbo].[Ledger]
       WHERE MONTH(ddate) = MONTH(GETDATE()) AND YEAR(ddate) = YEAR(GETDATE())`
    )

    // 2. Total pending balance (uncleared bills)
    const pendingRow = await queryOne<{ total: number }>(
      `SELECT ISNULL(SUM(bal), 0) AS total FROM [dbo].[Ledger]
       WHERE Status = 'Uncleared' AND bal > 0`
    )

    // 3. Active consumers (active meters)
    const activeRow = await queryOne<{ count: number }>(
      `SELECT COUNT(*) AS count FROM [dbo].[Add_Meter] WHERE status = 'Active'`
    )

    // 4. Defaulters count (distinct parties with uncleared bills)
    const defaultersRow = await queryOne<{ count: number }>(
      `SELECT COUNT(DISTINCT idno) AS count FROM [dbo].[Ledger]
       WHERE Status = 'Uncleared' AND bal > 0`
    )

    // 5. Monthly chart — last 12 months (collected vs billed)
    const chartRows = await query<{ month: string; collected: number; billed: number }>(
      `SELECT
         FORMAT(bdate, 'MMM yyyy') AS month,
         ISNULL(SUM(dbt),  0)     AS collected,
         ISNULL(SUM(gamt), 0)     AS billed
       FROM [dbo].[Ledger]
       WHERE bdate >= DATEADD(MONTH, -11, DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
       GROUP BY FORMAT(bdate, 'MMM yyyy'), YEAR(bdate), MONTH(bdate)
       ORDER BY YEAR(bdate) ASC, MONTH(bdate) ASC`
    )

    const stats: DashboardStats = {
      totalCollectedThisMonth: collectedRow?.total  ?? 0,
      pendingBalance:          pendingRow?.total     ?? 0,
      activeConsumers:         activeRow?.count      ?? 0,
      defaultersCount:         defaultersRow?.count  ?? 0,
      monthlyChart:            chartRows as MonthlyChartPoint[],
    }

    return NextResponse.json({ data: stats })
  } catch (err) {
    console.error("[/api/dashboard]", err)
    return NextResponse.json({ error: "Failed to load dashboard stats" }, { status: 500 })
  }
}
