'use client'

import { useEffect, useState } from 'react'

interface Floor {
  idno: number
  floor: string
}

interface Party {
  serial: number
  idno: number
  shop: string
  floor: string
  stat: string
}

interface LedgerEntry {
  serial: number
  idno: number
  shop: string
  floor: string
  bdate: string | null
  rdate: string | null
  isdate: string | null
  duedate: string | null
  meterno: string
  reding: number
  unit: number
  pasige: number
  mrent: number
  scharge: number
  useunit: number
  amt: number
  tax: number
  gamt: number
  arr: number
  crd: number
  dbt: number
  disc: number
  bal: number
  ext: string | null
  Status: string
  pstat: string
}

interface ReportParamsModalProps {
  reportKey: string
  onClose: () => void
}

export default function ReportsModal({ reportKey, onClose }: ReportParamsModalProps) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [filteredParties, setFilteredParties] = useState<Party[]>([])

  const [loadingFloors, setLoadingFloors] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState<any[] | null>(null)
  const [isPreview, setIsPreview] = useState(false)

  // Parameters
  const [selectedFloorName, setSelectedFloorName] = useState('')
  const [selectedPartyId, setSelectedPartyId] = useState<number | ''>('')
  const [filterMode, setFilterMode] = useState<'Floor' | 'Shop'>('Floor')

  const todayStr = new Date().toISOString().split('T')[0]
  const [month, setMonth] = useState(todayStr)
  const [fromDate, setFromDate] = useState(todayStr)
  const [toDate, setToDate] = useState(todayStr)
  const [singleDate, setSingleDate] = useState(todayStr)

  const [error, setError] = useState<string | null>(null)

  // Configure parameters required by this report
  const needsMonth = ['bill', 'format-bill', 'avg-bill', 'format-avg-bill', '12-bill', 'format-12-bill'].includes(reportKey)
  const needsFloor = ['floor-list', 'bill', 'format-bill', 'avg-bill', 'format-avg-bill', '12-bill', 'format-12-bill', 'ledger', 'balance-sheet', 'defaulter-list', 'monthly-summary', 'motor-units'].includes(reportKey)
  const needsShop = ['bill', 'format-bill', 'avg-bill', 'format-avg-bill', '12-bill', 'format-12-bill', 'ledger'].includes(reportKey)
  const needsRadios = ['bill', 'format-bill', '12-bill', 'format-12-bill'].includes(reportKey)
  const needsDateRange = ['ledger', 'monthly-summary', 'motor-units'].includes(reportKey)
  const needsSingleDate = ['daily-ledger'].includes(reportKey)

  // Get human readable title
  const getReportTitle = () => {
    switch (reportKey) {
      case 'floor-list': return 'Floor List'
      case 'bill': return 'Bill Invoices'
      case 'format-bill': return 'Format Bill Invoices'
      case 'avg-bill': return 'Average Bill'
      case 'format-avg-bill': return 'Format Average Bill'
      case '12-bill': return '12% Bill'
      case 'format-12-bill': return 'Format 12% Bill'
      case 'ledger': return 'Account Ledger'
      case 'daily-ledger': return 'Daily Ledger'
      case 'balance-sheet': return 'Balance Sheet'
      case 'defaulter-list': return 'Defaulter List'
      case 'monthly-summary': return 'Monthly Summary'
      case 'motor-units': return 'Electric Motor Units'
      default: return 'Report'
    }
  }

  // Fetch initial base data (floors, parties)
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        setLoadingFloors(true)
        const resFloors = await fetch('/api/floors')
        const dataFloors = await resFloors.json()
        if (resFloors.ok && dataFloors.data) {
          setFloors(dataFloors.data)
          if (dataFloors.data.length > 0) {
            setSelectedFloorName(dataFloors.data[0].floor)
          }
        }

        const resParties = await fetch('/api/parties')
        const dataParties = await resParties.json()
        if (resParties.ok && dataParties.data) {
          setParties(dataParties.data)
        }
      } catch (err) {
        console.error('Error fetching setup data', err)
        setError('Failed to fetch initialization data')
      } finally {
        setLoadingFloors(false)
      }
    }
    fetchBaseData()
  }, [])

  // Filter parties when selected Floor changes
  useEffect(() => {
    if (selectedFloorName) {
      const filtered = parties.filter(p => p.floor.toLowerCase() === selectedFloorName.toLowerCase())
      setFilteredParties(filtered)
      setSelectedPartyId('')
    } else {
      setFilteredParties([])
      setSelectedPartyId('')
    }
  }, [selectedFloorName, parties])

  const runReport = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoadingReport(true)
    setError(null)
    setReportData(null)

    try {
      let url = ''
      const floorQuery = selectedFloorName ? `floor=${encodeURIComponent(selectedFloorName)}` : ''

      if (reportKey === 'floor-list') {
        url = `/api/reports/floor-list?${floorQuery}`
      } else if (reportKey === 'balance-sheet') {
        url = `/api/reports/balance-sheet?${floorQuery}`
      } else if (reportKey === 'defaulter-list') {
        url = `/api/reports/defaulters?${floorQuery}`
      } else if (reportKey === 'daily-ledger') {
        url = `/api/reports/daily?date=${singleDate}`
      } else if (reportKey === 'monthly-summary') {
        url = `/api/reports/monthly-summary?from=${fromDate}&to=${toDate}&${floorQuery}`
      } else if (reportKey === 'motor-units') {
        url = `/api/reports/use-units?from=${fromDate}&to=${toDate}&${floorQuery}`
      } else if (reportKey === 'ledger') {
        if (selectedPartyId) {
          url = `/api/bills/party/${selectedPartyId}`
        } else {
          url = `/api/bills?from=${fromDate}&to=${toDate}&${floorQuery}`
        }
      } else {
        // All Billing Reports (Bill, Format Bill, Avg Bill, 12% Bill etc.)
        if (filterMode === 'Shop' && selectedPartyId) {
          url = `/api/bills/party/${selectedPartyId}`
        } else {
          url = `/api/bills?${floorQuery}&limit=1000`
        }
      }

      const res = await fetch(url)
      const data = await res.json()

      if (res.ok && data.data) {
        let results = data.data

        // 1. Post-filter for Billing Month if needed
        if (needsMonth) {
          const selectedDate = new Date(month)
          const targetYear = selectedDate.getFullYear()
          const targetMonth = selectedDate.getMonth()

          results = results.filter((b: LedgerEntry) => {
            if (!b.bdate) return false
            const bDateObj = new Date(b.bdate)
            return bDateObj.getFullYear() === targetYear && bDateObj.getMonth() === targetMonth
          })
        }

        // 2. Post-filter for Average Bills if avg-bill or format-avg-bill
        if (reportKey === 'avg-bill' || reportKey === 'format-avg-bill') {
          results = results.filter((b: LedgerEntry) => b.ext?.toLowerCase().includes('average') || b.useunit > 0 && b.ext?.toLowerCase().includes('average'))
        }

        // 3. Post-filter for Motor Units if motor-units report is clicked
        if (reportKey === 'motor-units') {
          // If the menu is "Electric Motor Units", we filter where party type is Motor (or pstat = 'Motor' / 'Power')
          // Since the API use-units doesn't return meter info directly, we can show use-units for motor shops or all
        }

        setReportData(results)
        setIsPreview(true)
      } else {
        setError(data.error || 'Failed to fetch report data')
      }
    } catch (err) {
      console.error(err)
      setError('Network error generating report')
    } finally {
      setLoadingReport(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200 print:relative print:p-0 print:bg-white">
      <div className="w-full max-w-4xl overflow-hidden border bg-white border-slate-200 backdrop-blur-md rounded-2xl shadow-2xl text-slate-900 flex flex-col max-h-[95vh] print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        
        {/* Style injection for printing */}
        <style jsx global>{`
          @media print {
            /* Reset root layouts to block flow so pagination works perfectly without blank pages */
            html, body, #__next, .h-screen, .flex-col, .flex-1, .overflow-hidden, .overflow-y-auto {
              height: auto !important;
              min-height: 0 !important;
              overflow: visible !important;
              position: static !important;
              display: block !important;
            }

            /* Hide the Desktop Shell completely */
            header, nav, main, footer {
              display: none !important;
            }

            /* Make the Modal full-page and static for natural flow */
            .fixed.inset-0 {
              position: static !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              display: block !important;
            }
            .max-h-[95vh] {
              max-height: none !important;
            }

            /* Hide modal toolbars */
            .no-print {
              display: none !important;
            }

            .print-preview-container {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              display: block !important;
            }

            /* Prevent empty trailing page after the last invoice */
            .page-break {
              page-break-after: always;
            }
            .page-break:last-child {
              page-break-after: auto;
            }
          }
        `}</style>

        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 no-print">
          <h2 className="text-sm font-bold tracking-wide text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            :: {getReportTitle()} ::
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Selection */}
        {!isPreview ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-print max-w-lg mx-auto w-full">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex gap-2.5">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <div className="text-center font-bold text-blue-900 pb-2 border-b border-slate-100 text-sm">
              Enter Value For the Parameters
            </div>

            <form onSubmit={runReport} className="space-y-4 text-xs">
              {/* Billing Month (Only for invoice reports) */}
              {needsMonth && (
                <div className="flex items-center gap-4">
                  <label className="w-24 font-bold text-slate-700 text-right">Month:</label>
                  <input
                    type="date"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  />
                </div>
              )}

              {/* By Floor / By Shop Radios */}
              {needsRadios && (
                <div className="flex items-center gap-4 py-1.5 pl-24">
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700 mr-6">
                    <input
                      type="radio"
                      name="filterMode"
                      checked={filterMode === 'Floor'}
                      onChange={() => setFilterMode('Floor')}
                      className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                    />
                    By Floor
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                    <input
                      type="radio"
                      name="filterMode"
                      checked={filterMode === 'Shop'}
                      onChange={() => setFilterMode('Shop')}
                      className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                    />
                    By Shop
                  </label>
                </div>
              )}

              {/* Floor Dropdown */}
              {needsFloor && (
                <div className="flex items-center gap-4">
                  <label className="w-24 font-bold text-slate-700 text-right">Floor:</label>
                  <select
                    value={selectedFloorName}
                    onChange={(e) => setSelectedFloorName(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  >
                    <option value="">-- All Floors --</option>
                    {loadingFloors ? (
                      <option>Loading Floors...</option>
                    ) : (
                      floors.map((f) => (
                        <option key={f.idno} value={f.floor}>{f.floor}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Shop Dropdown */}
              {needsShop && (filterMode === 'Shop' || !needsRadios) && (
                <div className="flex items-center gap-4">
                  <label className="w-24 font-bold text-slate-700 text-right">Shop No:</label>
                  <select
                    value={selectedPartyId}
                    onChange={(e) => setSelectedPartyId(e.target.value ? Number(e.target.value) : '')}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                    required={filterMode === 'Shop' || !needsRadios}
                  >
                    <option value="">-- Select Shop --</option>
                    {filteredParties.map((p) => (
                      <option key={p.serial} value={p.idno}>{p.shop}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Single Date Select (For Daily Payment Ledger) */}
              {needsSingleDate && (
                <div className="flex items-center gap-4">
                  <label className="w-24 font-bold text-slate-700 text-right">Issue Date:</label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                    required
                  />
                </div>
              )}

              {/* Date Ranges (Ledger, Summary, Motor) */}
              {needsDateRange && (
                <div className="grid grid-cols-2 gap-3 pl-12">
                  <div className="flex items-center gap-3">
                    <label className="font-bold text-slate-700 text-right">From Date:</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="font-bold text-slate-700 text-right">To Date:</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Run Button */}
              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loadingReport}
                  className="px-8 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {loadingReport ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 00-4-4H5m11 0h3a2 2 0 012 2v3m-2 4h.01M9 21h6m-6-4h6m2 0h2a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                    </svg>
                  )}
                  Run Report
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Report Preview Visualizer */
          <div className="flex-1 overflow-y-auto p-8 bg-slate-50 flex flex-col print:bg-white print:p-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 no-print">
              <div className="text-xs font-semibold text-slate-500">
                Found {reportData?.length ?? 0} record(s). Previewing report print layout.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPreview(false)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                >
                  Change Parameters
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Report
                </button>
              </div>
            </div>

            {/* Print Output Section */}
            <div className="print-preview-container flex-1 bg-white p-8 rounded-xl shadow-lg border border-slate-250/60 max-w-3xl mx-auto w-full text-xs text-slate-900 font-sans print:shadow-none print:border-none print:p-0">
              
              {/* Invoices format layout */}
              {['bill', 'format-bill', 'avg-bill', 'format-avg-bill', '12-bill', 'format-12-bill'].includes(reportKey) ? (
                reportData && reportData.length > 0 ? (
                  reportData.map((b: LedgerEntry, index) => (
                    <div key={b.serial} className={`p-4 border border-slate-300 rounded-lg mb-8 page-break space-y-4 max-w-2xl mx-auto print:border-slate-400 print:mb-0 print:pt-4 print:pb-8`}>
                      {/* Invoice Header */}
                      <div className="text-center space-y-1">
                        <h1 className="text-base font-extrabold tracking-wide uppercase text-slate-800">
                          Kareem Centre
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                          Electricity Invoice — {b.bdate ? new Date(b.bdate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : 'N/A'}
                        </p>
                      </div>

                      {/* Invoice Meta */}
                      <div className="grid grid-cols-2 gap-4 text-[10px] border-y border-slate-100 py-2.5">
                        <div className="space-y-1">
                          <div><span className="text-slate-500 font-medium">Invoice No:</span> <span className="font-bold">#EL-{b.serial}</span></div>
                          <div><span className="text-slate-500 font-medium">Consumer Code:</span> <span className="font-bold">{b.idno}</span></div>
                          <div><span className="text-slate-500 font-medium">Shop / Office:</span> <span className="font-bold">{b.shop}</span></div>
                          <div><span className="text-slate-500 font-medium">Floor:</span> <span className="font-bold">{b.floor}</span></div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div><span className="text-slate-500 font-medium">Reading Date:</span> <span className="font-semibold">{b.rdate ? new Date(b.rdate).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-slate-500 font-medium">Issue Date:</span> <span className="font-semibold">{b.isdate ? new Date(b.isdate).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-slate-500 font-medium">Due Date:</span> <span className="font-bold text-red-600">{b.duedate ? new Date(b.duedate).toLocaleDateString() : 'N/A'}</span></div>
                          <div><span className="text-slate-500 font-medium">Meter No:</span> <span className="font-semibold">{b.meterno}</span></div>
                        </div>
                      </div>

                      {/* Readings details */}
                      <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 rounded-lg p-2.5 border border-slate-100 print:bg-white print:border-slate-300">
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider font-semibold text-slate-500">Prev Reading</span>
                          <span className="font-bold text-slate-700">{b.unit.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider font-semibold text-slate-500">Current Reading</span>
                          <span className="font-bold text-slate-700">{b.reding.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider font-semibold text-slate-500">Units Consumed</span>
                          <span className="font-extrabold text-blue-600">{b.useunit.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase tracking-wider font-semibold text-slate-500">Consumer Type</span>
                          <span className="font-bold text-slate-700">{b.pstat}</span>
                        </div>
                      </div>

                      {/* Financials details breakdown */}
                      <div className="space-y-1.5 pl-2">
                        <div className="flex justify-between border-b border-slate-100 pb-1 text-[10px]">
                          <span className="text-slate-500 font-medium">Units consumed charge:</span>
                          <span className="font-semibold text-slate-800">Rs. {(b.amt - b.pasige - b.mrent - b.scharge).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1 text-[10px]">
                          <span className="text-slate-500 font-medium">Fixed Charge (Pasige):</span>
                          <span className="font-semibold text-slate-800">Rs. {b.pasige.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1 text-[10px]">
                          <span className="text-slate-500 font-medium">Meter Rent:</span>
                          <span className="font-semibold text-slate-800">Rs. {b.mrent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1 text-[10px]">
                          <span className="text-slate-500 font-medium">Service Charge:</span>
                          <span className="font-semibold text-slate-800">Rs. {b.scharge.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-150 pb-1.5 text-[10px]">
                          <span className="text-slate-500 font-medium">Tax:</span>
                          <span className="font-semibold text-slate-800">Rs. {b.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-1.5 text-xs">
                          <span>Current Bill Subtotal:</span>
                          <span>Rs. {(b.amt + b.tax).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-slate-650 border-b border-slate-100 pb-1 text-[10px]">
                          <span>Arrears:</span>
                          <span>Rs. {b.arr.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-blue-900 border-b-2 border-slate-800 pb-2 text-sm">
                          <span>Gross Outstanding:</span>
                          <span>Rs. {b.gamt.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Payment history details */}
                      {(b.dbt > 0 || b.disc > 0) && (
                        <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-[10px] space-y-1 print:bg-white print:border-emerald-300">
                          <div className="font-bold text-emerald-900">Payment Summary</div>
                          <div className="flex justify-between text-emerald-800">
                            <span>Amount Paid:</span>
                            <span className="font-bold">Rs. {b.dbt.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-emerald-800">
                            <span>Discount Given:</span>
                            <span className="font-bold">Rs. {b.disc.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-extrabold text-emerald-950 border-t border-emerald-200 pt-1">
                            <span>Net Balance Remaining:</span>
                            <span>Rs. {b.bal.toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {/* Bottom disclaimer */}
                      <div className="text-[8px] text-slate-400 font-medium text-center pt-2 italic">
                        Please pay outstanding balance by due date to avoid service disconnection.
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 font-bold text-slate-400">No invoices matched the parameters.</div>
                )
              ) : (
                /* Tabular Reports layouts (Floor list, Ledger, Balance sheet, Defaulter list, Summaries) */
                <div className="space-y-4">
                  {/* Report Header */}
                  <div className="text-center space-y-1 mb-6 border-b border-slate-200 pb-4">
                    <h1 className="text-base font-extrabold tracking-wider uppercase text-slate-800">Kareem Centre</h1>
                    <h2 className="text-xs font-bold text-blue-800 uppercase tracking-wide">{getReportTitle()}</h2>
                    <p className="text-[9px] text-slate-500 font-medium">
                      Report run on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      {selectedFloorName && ` | Floor: ${selectedFloorName}`}
                      {needsDateRange && ` | Period: ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`}
                    </p>
                  </div>

                  {/* Data Table */}
                  {reportData && reportData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-[10px]">
                        <thead>
                          {reportKey === 'floor-list' && (
                            <tr className="border-b border-slate-350 bg-slate-50 text-slate-700 font-bold uppercase print:bg-white print:border-slate-800">
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2">Shop / Office</th>
                              <th className="px-3 py-2">Floor</th>
                              <th className="px-3 py-2">Meter No</th>
                              <th className="px-3 py-2">Meter Type</th>
                              <th className="px-3 py-2">Meter Status</th>
                              <th className="px-3 py-2">Party Status</th>
                            </tr>
                          )}
                          {reportKey === 'balance-sheet' && (
                            <tr className="border-b border-slate-350 bg-slate-50 text-slate-700 font-bold uppercase print:bg-white print:border-slate-800">
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2">Shop / Office</th>
                              <th className="px-3 py-2">Floor</th>
                              <th className="px-3 py-2 text-right">Total Billed</th>
                              <th className="px-3 py-2 text-right">Total Paid</th>
                              <th className="px-3 py-2 text-right">Arrears</th>
                              <th className="px-3 py-2 text-right">Remaining Balance</th>
                            </tr>
                          )}
                          {reportKey === 'defaulter-list' && (
                            <tr className="border-b border-slate-350 bg-slate-50 text-slate-700 font-bold uppercase print:bg-white print:border-slate-800">
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2">Shop / Office</th>
                              <th className="px-3 py-2">Floor</th>
                              <th className="px-3 py-2 text-right">Arrears</th>
                              <th className="px-3 py-2 text-right">Outstanding Balance</th>
                              <th className="px-3 py-2 text-right">Last Billing Date</th>
                            </tr>
                          )}
                          {reportKey === 'daily-ledger' && (
                            <tr className="border-b border-slate-350 bg-slate-50 text-slate-700 font-bold uppercase print:bg-white print:border-slate-800">
                              <th className="px-3 py-2">Floor</th>
                              <th className="px-3 py-2">Shop / Office</th>
                              <th className="px-3 py-2">Payment Date</th>
                              <th className="px-3 py-2 text-right">Recovery Received</th>
                              <th className="px-3 py-2 text-right">Discount Applied</th>
                            </tr>
                          )}
                          {reportKey === 'monthly-summary' && (
                            <tr className="border-b border-slate-350 bg-slate-50 text-slate-700 font-bold uppercase print:bg-white print:border-slate-800">
                              <th className="px-3 py-2">Floor</th>
                              <th className="px-3 py-2">Month</th>
                              <th className="px-3 py-2 text-right">Total Units</th>
                              <th className="px-3 py-2 text-right">Billed Amount</th>
                              <th className="px-3 py-2 text-right">Gross Amount</th>
                              <th className="px-3 py-2 text-right">Recovery Received</th>
                            </tr>
                          )}
                          {reportKey === 'motor-units' && (
                            <tr className="border-b border-slate-350 bg-slate-50 text-slate-700 font-bold uppercase print:bg-white print:border-slate-800">
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2">Shop / Office</th>
                              <th className="px-3 py-2">Floor</th>
                              <th className="px-3 py-2 text-right">Total Consumed Units</th>
                              <th className="px-3 py-2">Billing Period</th>
                            </tr>
                          )}
                          {reportKey === 'ledger' && (
                            <tr className="border-b border-slate-350 bg-slate-50 text-slate-700 font-bold uppercase print:bg-white print:border-slate-800">
                              <th className="px-3 py-2">Month</th>
                              {!selectedPartyId && <th className="px-3 py-2">Shop</th>}
                              <th className="px-3 py-2 text-right">Previous</th>
                              <th className="px-3 py-2 text-right">Present</th>
                              <th className="px-3 py-2 text-right">Units</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                              <th className="px-3 py-2 text-right">Arrears</th>
                              <th className="px-3 py-2 text-right">Gross Outstanding</th>
                              <th className="px-3 py-2 text-right">Paid</th>
                              <th className="px-3 py-2 text-right">Remaining Balance</th>
                              <th className="px-3 py-2">Status</th>
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                          {reportData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 print:hover:bg-transparent">
                              {reportKey === 'floor-list' && (
                                <>
                                  <td className="px-3 py-2 text-slate-500 font-medium">{row.idno}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.shop}</td>
                                  <td className="px-3 py-2 font-medium text-slate-650">{row.floor}</td>
                                  <td className="px-3 py-2 font-mono text-slate-600">{row.meterno || 'N/A'}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.pstat || 'N/A'}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      row.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {row.status || 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-slate-500 font-semibold">{row.stat}</td>
                                </>
                              )}
                              {reportKey === 'balance-sheet' && (
                                <>
                                  <td className="px-3 py-2 text-slate-500 font-medium">{row.idno}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.shop}</td>
                                  <td className="px-3 py-2 font-medium text-slate-600">{row.floor}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-700">Rs. {row.totalGamt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">Rs. {row.totalDbt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-500">Rs. {row.totalArr.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-extrabold text-red-600">Rs. {row.totalBal.toFixed(2)}</td>
                                </>
                              )}
                              {reportKey === 'defaulter-list' && (
                                <>
                                  <td className="px-3 py-2 text-slate-500 font-medium">{row.idno}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.shop}</td>
                                  <td className="px-3 py-2 font-medium text-slate-600">{row.floor}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-500">Rs. {row.arr.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-extrabold text-red-600">Rs. {row.bal.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-mono text-slate-500">{row.lastBillDate ? new Date(row.lastBillDate).toLocaleDateString() : 'N/A'}</td>
                                </>
                              )}
                              {reportKey === 'daily-ledger' && (
                                <>
                                  <td className="px-3 py-2 font-medium text-slate-600">{row.floor}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.shop}</td>
                                  <td className="px-3 py-2 font-mono text-slate-500">{new Date(row.ddate).toLocaleDateString()}</td>
                                  <td className="px-3 py-2 text-right font-extrabold text-emerald-700">Rs. {row.dbt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-blue-600">Rs. {row.disc.toFixed(2)}</td>
                                </>
                              )}
                              {reportKey === 'monthly-summary' && (
                                <>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.floor}</td>
                                  <td className="px-3 py-2 font-mono font-semibold text-slate-600">{row.month}</td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-700">{row.totalUnits.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-700">Rs. {row.totalAmt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-900">Rs. {row.totalGamt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-extrabold text-emerald-700">Rs. {row.totalDbt.toFixed(2)}</td>
                                </>
                              )}
                              {reportKey === 'motor-units' && (
                                <>
                                  <td className="px-3 py-2 text-slate-500 font-medium">{row.idno}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.shop}</td>
                                  <td className="px-3 py-2 font-medium text-slate-600">{row.floor}</td>
                                  <td className="px-3 py-2 text-right font-extrabold text-blue-600">{row.totalUnits.toFixed(2)}</td>
                                  <td className="px-3 py-2 font-mono text-slate-500">{row.period}</td>
                                </>
                              )}
                              {reportKey === 'ledger' && (
                                <>
                                  <td className="px-3 py-2 font-mono text-slate-500">
                                    {row.bdate ? new Date(row.bdate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'N/A'}
                                  </td>
                                  {!selectedPartyId && <td className="px-3 py-2 font-bold text-slate-800">{row.shop}</td>}
                                  <td className="px-3 py-2 text-right text-slate-500">{row.unit.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right text-slate-500">{row.reding.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-700">{row.useunit.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-700">Rs. {row.amt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-semibold text-slate-500">Rs. {row.arr.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-slate-800">Rs. {row.gamt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-emerald-700">Rs. {row.dbt.toFixed(2)}</td>
                                  <td className="px-3 py-2 text-right font-extrabold text-red-600">Rs. {row.bal.toFixed(2)}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                      row.Status === 'Cleared' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-55 text-red-700'
                                    }`}>
                                      {row.Status}
                                    </span>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10 font-bold text-slate-400">No records found.</div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  )
}
