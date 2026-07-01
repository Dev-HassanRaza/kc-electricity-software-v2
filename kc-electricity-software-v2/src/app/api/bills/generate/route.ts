// ============================================================
// API: /api/bills/generate
// POST — Core Billing Engine
//
// For each active meter:
//   1. Get last reading from Prev table
//   2. Get unit rates from Add_unit for the meter's floor
//   3. Calculate bill using bill-calculator.ts
//   4. Insert row into Ledger with Status = 'Uncleared'
// ============================================================

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { query, execute, queryOne, sql } from "@/lib/db"
import { calculateBill } from "@/lib/bill-calculator"
import { z } from "zod"
import type { Meter, PrevReading, UnitRate, LedgerEntry } from "@/types"

const generateSchema = z.object({
  billingDate: z.string().min(1), // ISO date
  readingDate: z.string().min(1),
  issueDate:   z.string().min(1),
  dueDate:     z.string().min(1),
  taxRate:     z.number().min(0).max(100).default(0),
  floorFilter: z.string().optional(), // optional: only generate for one floor
})

// POST /api/bills/generate
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }

  const { billingDate, readingDate, issueDate, dueDate, taxRate, floorFilter } = parsed.data

  try {
    // 1. Fetch all active meters (optionally filtered by floor)
    let meterSql = "SELECT * FROM [dbo].[Add_Meter] WHERE status = 'Active'"
    if (floorFilter) meterSql += " AND floor = @floor"

    const meters = await query<Meter>(meterSql, (r) => {
      if (floorFilter) r.input("floor", sql.VarChar(100), floorFilter)
    })

    if (meters.length === 0) {
      return NextResponse.json({ error: "No active meters found" }, { status: 404 })
    }

    let generated = 0
    let skipped   = 0
    const errors: string[] = []

    for (const meter of meters) {
      try {
        // 2. Check: bill for this meter already exists for this billing date?
        const existingBill = await queryOne<LedgerEntry>(
          `SELECT TOP 1 serial FROM [dbo].[Ledger]
           WHERE idno = @idno AND bdate = @bdate`,
          (r) => {
            r.input("idno",  sql.Int,  meter.idno)
            r.input("bdate", sql.Date, new Date(billingDate))
          }
        )
        if (existingBill) {
          skipped++
          continue
        }

        // 3. Get last reading from Prev
        const lastReading = await queryOne<PrevReading>(
          `SELECT TOP 1 reading, arr FROM [dbo].[Prev]
           WHERE idno = @idno ORDER BY vdate DESC, serial DESC`,
          (r) => r.input("idno", sql.Int, meter.idno)
        )

        const previousReading = lastReading?.reading ?? 0
        const previousArr     = lastReading?.arr     ?? 0

        // 4. Get latest reading for this billing cycle (most recent Prev entry)
        const currentReadingRow = await queryOne<PrevReading>(
          `SELECT TOP 1 reading FROM [dbo].[Prev]
           WHERE idno = @idno AND vdate >= @rdate
           ORDER BY vdate DESC, serial DESC`,
          (r) => {
            r.input("idno",  sql.Int,  meter.idno)
            r.input("rdate", sql.Date, new Date(readingDate))
          }
        )

        // If no current reading exists for this cycle, use previous as current (0 useunit)
        const currentReading = currentReadingRow?.reading ?? previousReading

        // 5. Get unit rates for the floor
        const rates = await queryOne<UnitRate>(
          "SELECT TOP 1 * FROM [dbo].[Add_unit] WHERE floor = @floor",
          (r) => r.input("floor", sql.VarChar(100), meter.floor)
        )

        const rateValues = {
          puc: rates?.puc ?? 0,
          pc:  rates?.pc  ?? 0,
          mr:  rates?.mr  ?? 0,
          sc:  rates?.sc  ?? 0,
        }

        // 6. Calculate bill
        const bill = calculateBill({
          currentReading,
          previousReading,
          previousArr,
          rates:   rateValues,
          taxRate,
        })

        // 7. Insert into Ledger
        await execute(
          `INSERT INTO [dbo].[Ledger]
            (idno, shop, floor, bdate, rdate, isdate, duedate, meterno, reding, unit,
             pasige, mrent, scharge, useunit, amt, tax, gamt, arr, crd, dbt, disc,
             porder, bal, ext, Status, pstat)
           VALUES
            (@idno, @shop, @floor, @bdate, @rdate, @isdate, @duedate, @meterno,
             @reding, @unit, @pasige, @mrent, @scharge, @useunit, @amt, @tax, @gamt,
             @arr, 0, 0, 0, '', @bal, '', 'Uncleared', @pstat)`,
          (r) => {
            r.input("idno",    sql.Int,           meter.idno)
            r.input("shop",    sql.VarChar(100),  meter.shop)
            r.input("floor",   sql.VarChar(100),  meter.floor)
            r.input("bdate",   sql.Date,          new Date(billingDate))
            r.input("rdate",   sql.Date,          new Date(readingDate))
            r.input("isdate",  sql.Date,          new Date(issueDate))
            r.input("duedate", sql.Date,          new Date(dueDate))
            r.input("meterno", sql.VarChar(100),  meter.meterno)
            r.input("reding",  sql.Decimal(10,2), currentReading)
            r.input("unit",    sql.Decimal(10,2), previousReading)
            r.input("pasige",  sql.Decimal(10,2), rateValues.pc)
            r.input("mrent",   sql.Decimal(10,2), rateValues.mr)
            r.input("scharge", sql.Decimal(10,2), rateValues.sc)
            r.input("useunit", sql.Decimal(10,2), bill.useunit)
            r.input("amt",     sql.Decimal(10,2), bill.amt)
            r.input("tax",     sql.Decimal(10,2), bill.tax)
            r.input("gamt",    sql.Decimal(10,2), bill.gamt)
            r.input("arr",     sql.Decimal(10,2), bill.arr)
            r.input("bal",     sql.Decimal(10,2), bill.bal)
            r.input("pstat",   sql.VarChar(50),   meter.pstat)
          }
        )

        generated++
      } catch (innerErr) {
        errors.push(`Shop ${meter.shop} (idno: ${meter.idno}): ${(innerErr as Error).message}`)
      }
    }

    return NextResponse.json({
      data: { generated, skipped, errors },
      message: `Bills generated: ${generated}, skipped (already existed): ${skipped}${errors.length ? `, ${errors.length} errors` : ""}`,
    }, { status: 201 })
  } catch (err) {
    console.error("[/api/bills/generate POST]", err)
    return NextResponse.json({ error: "Failed to generate bills" }, { status: 500 })
  }
}
