// ============================================================
// KC Electricity Software v2 — TypeScript Interfaces
// Mirrors the legacy MSSQL schema exactly (table names preserved)
// ============================================================

// ── Add_Floor ────────────────────────────────────────────────
export interface Floor {
  idno: number
  floor: string
}

// ── Add_party ────────────────────────────────────────────────
export interface Party {
  serial: number
  idno: number
  shop: string
  floor: string
  stat: string
  vdate: Date | string | null
}

// ── Add_Meter ────────────────────────────────────────────────
export interface Meter {
  serial: number
  idno: number
  shop: string
  floor: string
  meterno: string
  pstat: string
  vdate: Date | string | null
  status: string
}

// ── Add_unit ─────────────────────────────────────────────────
export interface UnitRate {
  serial: number
  floor: string
  puc: number   // Per Unit Charge
  pc: number    // Fixed Charge (pasige)
  mr: number    // Meter Rent
  sc: number    // Service Charge
  avr: number   // Average Rate
}

// ── Ledger ───────────────────────────────────────────────────
export interface LedgerEntry {
  serial: number
  idno: number
  shop: string
  floor: string
  bdate: Date | string | null   // billing date
  rdate: Date | string | null   // reading date
  isdate: Date | string | null  // issue date
  duedate: Date | string | null // due date
  meterno: string
  reding: number                // current meter reading
  unit: number                  // previous reading (snapshot)
  pasige: number                // fixed charge
  mrent: number                 // meter rent
  scharge: number               // service charge
  useunit: number               // units consumed
  amt: number                   // base amount
  tax: number                   // tax amount
  gamt: number                  // gross amount (amt + tax + arr)
  arr: number                   // arrears carried forward
  crd: number                   // credit
  ddate: Date | string | null   // payment date
  dbt: number                   // payment received (debit)
  disc: number                  // discount applied
  porder: string                // payment order / reference
  bal: number                   // balance remaining
  ext: string                   // extra notes
  Status: string                // 'Active' | 'Uncleared' | 'Cleared'
  pstat: string                 // consumer type e.g. 'Consumer'
}

// ── Prev (Meter Readings) ────────────────────────────────────
export interface PrevReading {
  serial: number
  idno: number
  shop: string
  floor: string
  meterno: string
  pstat: string
  reading: number
  arr: number
  vdate: Date | string | null
  ext: string
}

// ── API Response Wrappers ─────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface ApiError {
  error: string
  details?: string
}

// ── Dashboard Stats ───────────────────────────────────────────
export interface DashboardStats {
  totalCollectedThisMonth: number
  pendingBalance: number
  activeConsumers: number
  defaultersCount: number
  monthlyChart: MonthlyChartPoint[]
}

export interface MonthlyChartPoint {
  month: string   // e.g. "Jan 2025"
  collected: number
  billed: number
}

// ── Bill Generation Input ─────────────────────────────────────
export interface BillGenerateInput {
  billingDate: string   // ISO date string
  readingDate: string   // ISO date string
  issueDate: string     // ISO date string
  dueDate: string       // ISO date string
  taxRate: number       // percentage, e.g. 0 or 17
  floorFilter?: string  // optional: generate only for a specific floor
}

// ── Bill Calculator Params ────────────────────────────────────
export interface BillCalculationParams {
  currentReading: number
  previousReading: number
  previousArr: number
  rates: {
    puc: number  // per unit charge
    pc: number   // fixed charge (pasige)
    mr: number   // meter rent
    sc: number   // service charge
  }
  taxRate: number // percent
}

export interface BillCalculationResult {
  useunit: number
  amt: number
  tax: number
  gamt: number
  bal: number
  arr: number
}

// ── Report Types ──────────────────────────────────────────────
export interface BalanceSheetRow {
  idno: number
  shop: string
  floor: string
  totalGamt: number
  totalDbt: number
  totalBal: number
  totalArr: number
}

export interface DailyReportRow {
  floor: string
  shop: string
  ddate: string
  dbt: number
  disc: number
}

export interface DefaulterRow {
  idno: number
  shop: string
  floor: string
  arr: number
  bal: number
  lastBillDate: string | null
}

export interface MonthlySummaryRow {
  floor: string
  month: string
  totalUnits: number
  totalAmt: number
  totalGamt: number
  totalDbt: number
}

export interface RecoveryRow {
  ddate: string
  floor: string
  totalDbt: number
  count: number
}

export interface UseUnitsRow {
  idno: number
  shop: string
  floor: string
  totalUnits: number
  period: string
}

export interface AvgBillRow {
  floor: string
  avgAmt: number
  avgGamt: number
  billCount: number
}

export interface StatementRow extends LedgerEntry {}
