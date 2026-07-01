// ============================================================
// KC Electricity Software v2 — Bill Calculator
// Exact port of legacy VB6 billing formula
//
// Formula (from legacy docs):
//   useunit = currentReading − previousReading
//   amt     = (useunit × puc) + mrent + scharge + pasige
//   tax     = amt × (taxRate / 100)
//   gamt    = amt + tax + arr
//   bal     = gamt − dbt  (dbt=0 at bill creation → bal=gamt)
//   arr     = carried forward from previous unpaid bal
// ============================================================

import type { BillCalculationParams, BillCalculationResult } from "@/types"

/**
 * Calculates all billing fields for a single consumer.
 * Call this for every active meter when generating bills.
 */
export function calculateBill(params: BillCalculationParams): BillCalculationResult {
  const { currentReading, previousReading, previousArr, rates, taxRate } = params

  // Units consumed this period
  const useunit = Math.max(0, currentReading - previousReading)

  // Base amount = unit cost + fixed charges
  const amt =
    useunit * rates.puc +  // per-unit charge
    rates.mr +              // meter rent
    rates.sc +              // service charge
    rates.pc                // fixed charge (pasige in Ledger)

  // Tax on base amount
  const tax = amt * (taxRate / 100)

  // Gross amount = base + tax + arrears from last cycle
  const gamt = amt + tax + previousArr

  // Balance at bill creation (no payment yet)
  const bal = gamt

  return {
    useunit,
    amt:     roundTwoDecimals(amt),
    tax:     roundTwoDecimals(tax),
    gamt:    roundTwoDecimals(gamt),
    bal:     roundTwoDecimals(bal),
    arr:     roundTwoDecimals(previousArr),
  }
}

/**
 * Recalculates balance after a payment is recorded.
 * Status becomes 'Cleared' when bal <= 0.
 */
export function applyPayment(gamt: number, dbt: number, disc: number = 0) {
  const bal = roundTwoDecimals(gamt - dbt - disc)
  const status = bal <= 0 ? "Cleared" : "Uncleared"
  return { bal, status }
}

function roundTwoDecimals(n: number): number {
  return Math.round(n * 100) / 100
}
