// ============================================================
// API: /api/bills
// GET  — list all bills with optional filters
// POST — create a single manual or average bill
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, queryOne, sql } from "@/lib/db"
import { z } from "zod"
import type { LedgerEntry, Floor, Party, Meter, UnitRate, PrevReading } from "@/types"

// GET /api/bills?floor=GROUND&status=Uncleared&from=2024-01-01&to=2024-12-31
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const floorFilter  = searchParams.get("floor")
  const statusFilter = searchParams.get("status")
  const fromDate     = searchParams.get("from")
  const toDate       = searchParams.get("to")
  const limitParam   = searchParams.get("limit")
  const limit        = limitParam ? parseInt(limitParam, 10) : 500

  try {
    let sqlText = `
      SELECT TOP (@limit) *
      FROM [dbo].[Ledger]
      WHERE 1=1
    `
    const bindings: Array<{ name: string; type: unknown; value: unknown }> = [
      { name: "limit", type: sql.Int, value: limit },
    ]

    if (floorFilter) {
      sqlText += " AND floor = @floor"
      bindings.push({ name: "floor", type: sql.VarChar(100), value: floorFilter })
    }
    if (statusFilter) {
      sqlText += " AND Status = @status"
      bindings.push({ name: "status", type: sql.VarChar(50), value: statusFilter })
    }
    if (fromDate) {
      sqlText += " AND bdate >= @fromDate"
      bindings.push({ name: "fromDate", type: sql.Date, value: new Date(fromDate) })
    }
    if (toDate) {
      sqlText += " AND bdate <= @toDate"
      bindings.push({ name: "toDate", type: sql.Date, value: new Date(toDate) })
    }

    sqlText += " ORDER BY bdate DESC, floor, shop"

    const bills = await query<LedgerEntry>(sqlText, (r) => {
      bindings.forEach((b) => r.input(b.name, b.type as sql.ISqlType, b.value))
    })

    return NextResponse.json({ data: bills })
  } catch (err) {
    console.error("[/api/bills GET]", err)
    return NextResponse.json({ error: "Failed to fetch bills" }, { status: 500 })
  }
}

const createManualBillSchema = z.object({
  idno:        z.number().int().positive(),
  bdate:       z.string().min(1), // billing month/date (ISO string)
  rdate:       z.string().min(1), // reading date
  isdate:      z.string().min(1), // issue date
  duedate:     z.string().min(1), // due date
  reding:      z.number().min(0), // present reading
  unit:        z.number().min(0), // previous reading
  isAverage:   z.boolean().default(false),
  averageUnit: z.number().min(0).optional(),
})

// POST /api/bills
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = createManualBillSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { idno, bdate, rdate, isdate, duedate, reding, unit, isAverage, averageUnit } = parsed.data

  try {
    // 1. Fetch party info
    const party = await queryOne<Party>(
      "SELECT TOP 1 shop, floor, stat FROM [dbo].[Add_party] WHERE idno = @idno",
      (r) => r.input("idno", sql.Int, idno)
    )
    if (!party) {
      return NextResponse.json({ error: "Party/Shop not found" }, { status: 404 })
    }

    // 2. Fetch active meter
    const meter = await queryOne<Meter>(
      "SELECT TOP 1 meterno, pstat FROM [dbo].[Add_Meter] WHERE idno = @idno AND status = 'Active'",
      (r) => r.input("idno", sql.Int, idno)
    )
    const meterno = meter ? meter.meterno : "N/A"
    const pstat = meter ? meter.pstat : (party.stat || "Consumer")

    // 3. Fetch floor unit rates
    const rates = await queryOne<UnitRate>(
      "SELECT TOP 1 * FROM [dbo].[Add_unit] WHERE floor = @floor",
      (r) => r.input("floor", sql.VarChar(100), party.floor)
    )

    const puc = rates?.puc ?? 0
    const pc  = rates?.pc  ?? 0
    const mr  = rates?.mr  ?? 0
    const sc  = rates?.sc  ?? 0
    const avr = rates?.avr ?? 0

    // 4. Fetch previous arrears (latest ledger balance before current billing date, or latest Prev.arr)
    const lastLedger = await queryOne<LedgerEntry>(
      `SELECT TOP 1 bal FROM [dbo].[Ledger]
       WHERE idno = @idno AND bdate < @bdate
       ORDER BY bdate DESC, serial DESC`,
      (r) => {
        r.input("idno", sql.Int, idno)
        r.input("bdate", sql.Date, new Date(bdate))
      }
    )
    let previousArr = 0
    if (lastLedger) {
      previousArr = lastLedger.bal
    } else {
      const lastReading = await queryOne<PrevReading>(
        `SELECT TOP 1 arr FROM [dbo].[Prev]
         WHERE idno = @idno ORDER BY vdate DESC, serial DESC`,
        (r) => r.input("idno", sql.Int, idno)
      )
      previousArr = lastReading?.arr ?? 0
    }

    // 5. Compute usage & amounts
    let useunit = 0
    let rate = 0
    if (isAverage) {
      useunit = averageUnit ?? 0
      rate = avr > 0 ? avr : puc
    } else {
      useunit = Math.max(0, reding - unit)
      rate = puc
    }

    const amt = (useunit * rate) + mr + sc + pc
    const tax = 0 // Manual bills default tax to 0%
    const gamt = amt + tax + previousArr
    const bal = gamt

    // 6. Insert into Ledger
    await execute(
      `INSERT INTO [dbo].[Ledger]
        (idno, shop, floor, bdate, rdate, isdate, duedate, meterno, reding, unit,
         pasige, mrent, scharge, useunit, amt, tax, gamt, arr, crd, dbt, disc,
         porder, bal, ext, Status, pstat)
       VALUES
        (@idno, @shop, @floor, @bdate, @rdate, @isdate, @duedate, @meterno, @reding, @unit,
         @pasige, @mrent, @scharge, @useunit, @amt, @tax, @gamt, @arr, 0, 0, 0,
         '', @bal, @ext, 'Uncleared', @pstat)`,
      (r) => {
        r.input("idno",    sql.Int,           idno)
        r.input("shop",    sql.VarChar(100),  party.shop)
        r.input("floor",   sql.VarChar(100),  party.floor)
        r.input("bdate",   sql.Date,          new Date(bdate))
        r.input("rdate",   sql.Date,          new Date(rdate))
        r.input("isdate",  sql.Date,          new Date(isdate))
        r.input("duedate", sql.Date,          new Date(duedate))
        r.input("meterno", sql.VarChar(100),  meterno)
        r.input("reding",  sql.Decimal(10,2), reding)
        r.input("unit",    sql.Decimal(10,2), unit)
        r.input("pasige",  sql.Decimal(10,2), pc)
        r.input("mrent",   sql.Decimal(10,2), mr)
        r.input("scharge", sql.Decimal(10,2), sc)
        r.input("useunit", sql.Decimal(10,2), useunit)
        r.input("amt",     sql.Decimal(10,2), amt)
        r.input("tax",     sql.Decimal(10,2), tax)
        r.input("gamt",    sql.Decimal(10,2), gamt)
        r.input("arr",     sql.Decimal(10,2), previousArr)
        r.input("bal",     sql.Decimal(10,2), bal)
        r.input("ext",     sql.VarChar(255),  isAverage ? "Average Bill Manual" : "Manual Bill")
        r.input("pstat",   sql.VarChar(50),   pstat)
      }
    )

    // 7. Sync readings table (Prev)
    const existingPrev = await queryOne<PrevReading>(
      `SELECT TOP 1 serial FROM [dbo].[Prev]
       WHERE idno = @idno AND vdate = @vdate`,
      (r) => {
        r.input("idno",  sql.Int,  idno)
        r.input("vdate", sql.Date, new Date(rdate))
      }
    )

    if (existingPrev) {
      await execute(
        `UPDATE [dbo].[Prev]
         SET reading = @reading, arr = @arr
         WHERE serial = @serial`,
        (r) => {
          r.input("reading", sql.Decimal(10, 2), reding)
          r.input("arr",     sql.Decimal(10, 2), previousArr)
          r.input("serial",  sql.Int,            existingPrev.serial)
        }
      )
    } else {
      await execute(
        `INSERT INTO [dbo].[Prev] (idno, shop, floor, meterno, pstat, reading, arr, vdate, ext)
         VALUES (@idno, @shop, @floor, @meterno, @pstat, @reading, @arr, @vdate, @ext)`,
        (r) => {
          r.input("idno",    sql.Int,           idno)
          r.input("shop",    sql.VarChar(100),  party.shop)
          r.input("floor",   sql.VarChar(100),  party.floor)
          r.input("meterno", sql.VarChar(100),  meterno)
          r.input("pstat",   sql.VarChar(50),   pstat)
          r.input("reading", sql.Decimal(10, 2), reding)
          r.input("arr",     sql.Decimal(10, 2), previousArr)
          r.input("vdate",   sql.Date,          new Date(rdate))
          r.input("ext",     sql.VarChar(255),  isAverage ? "Average Bill Issued" : "Manual Bill Issued")
        }
      )
    }

    return NextResponse.json({
      data: { useunit, amt, gamt, bal },
      message: isAverage ? "Average bill issued successfully" : "Manual bill issued successfully"
    }, { status: 201 })

  } catch (err) {
    console.error("[/api/bills POST]", err)
    return NextResponse.json({ error: "Failed to create manual bill" }, { status: 500 })
  }
}

