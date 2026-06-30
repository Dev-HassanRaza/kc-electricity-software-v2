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
  reding: number
  unit: number
  useunit: number
  bal: number
  gamt: number
  Status: string
}

export default function IssueBillsModal({ onClose }: { onClose: () => void }) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [billsHistory, setBillsHistory] = useState<LedgerEntry[]>([])

  const [loadingFloors, setLoadingFloors] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Selected values (Form fields matching legacy app)
  const [selectedFloorName, setSelectedFloorName] = useState('')
  const [selectedPartyId, setSelectedPartyId] = useState<number | ''>('')

  // Dates (Default to current date)
  const [bdate, setBdate] = useState('')
  const [rdate, setRdate] = useState('')
  const [isdate, setIsdate] = useState('')
  const [duedate, setDuedate] = useState('')

  const [previousReading, setPreviousReading] = useState<number>(0)
  const [presentReading, setPresentReading] = useState<number>(0)
  const [usageUnits, setUsageUnits] = useState<number>(0)

  const [selectedBill, setSelectedBill] = useState<LedgerEntry | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initial date setup
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    setBdate(todayStr)
    setRdate(todayStr)
    setIsdate(todayStr)
    setDuedate(todayStr)
  }, [])

  // Fetch initial base data (floors, parties)
  useEffect(() => {
    const fetchBaseData = async () => {
      try {
        setLoadingFloors(true)
        
        // 1. Fetch floors
        const resFloors = await fetch('/api/floors')
        const dataFloors = await resFloors.json()
        if (resFloors.ok && dataFloors.data) {
          setFloors(dataFloors.data)
          if (dataFloors.data.length > 0) {
            setSelectedFloorName(dataFloors.data[0].floor)
          }
        }

        // 2. Fetch parties
        const resParties = await fetch('/api/parties')
        const dataParties = await resParties.json()
        if (resParties.ok && dataParties.data) {
          setParties(dataParties.data)
        }
      } catch (err) {
        console.error('Error fetching base data', err)
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
      setSelectedPartyId('') // Reset shop selection
      setBillsHistory([]) // Clear history table
      handleResetForm()
    } else {
      setFilteredParties([])
      setSelectedPartyId('')
      setBillsHistory([])
      handleResetForm()
    }
  }, [selectedFloorName, parties])

  // Fetch bill history & prefill previous reading when party changes
  useEffect(() => {
    const fetchHistoryForParty = async () => {
      if (!selectedPartyId) {
        setBillsHistory([])
        setPreviousReading(0)
        setUsageUnits(0)
        setPresentReading(0)
        return
      }

      try {
        setLoadingHistory(true)
        const res = await fetch(`/api/bills/party/${selectedPartyId}`)
        const data = await res.json()
        if (res.ok && data.data) {
          setBillsHistory(data.data)

          // 1. Prefill previous reading from the latest bill
          if (data.data.length > 0) {
            setPreviousReading(data.data[0].reding)
            setPresentReading(data.data[0].reding)
          } else {
            // 2. If no ledger entries exist, check readings table
            const resReadings = await fetch(`/api/readings?idno=${selectedPartyId}`)
            const dataReadings = await resReadings.json()
            if (resReadings.ok && dataReadings.data && dataReadings.data.length > 0) {
              setPreviousReading(dataReadings.data[0].reading)
              setPresentReading(dataReadings.data[0].reading)
            } else {
              setPreviousReading(0)
              setPresentReading(0)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load bills history', err)
      } finally {
        setLoadingHistory(false)
      }
    }
    fetchHistoryForParty()
  }, [selectedPartyId])

  // Recalculate usage units dynamically
  useEffect(() => {
    const usage = Math.max(0, presentReading - previousReading)
    setUsageUnits(usage)
  }, [presentReading, previousReading])

  const handleResetForm = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    setSelectedBill(null)
    setPresentReading(previousReading)
    setBdate(todayStr)
    setRdate(todayStr)
    setIsdate(todayStr)
    setDuedate(todayStr)
    setError(null)
    setSuccess(null)
  }

  // Row click selects a bill for view/delete
  const handleSelectBillRow = (b: LedgerEntry) => {
    setSelectedBill(b)
    setPreviousReading(b.unit)
    setPresentReading(b.reding)
    if (b.bdate) setBdate(new Date(b.bdate).toISOString().split('T')[0])
    if (b.rdate) setRdate(new Date(b.rdate).toISOString().split('T')[0])
    if (b.isdate) setIsdate(new Date(b.isdate).toISOString().split('T')[0])
    if (b.duedate) setDuedate(new Date(b.duedate).toISOString().split('T')[0])
    setError(null)
    setSuccess(null)
  }

  // Save manual bill
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPartyId) {
      setError('Please select a shop/office')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idno: Number(selectedPartyId),
          bdate,
          rdate,
          isdate,
          duedate,
          reding: presentReading,
          unit: previousReading,
          isAverage: false
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Bill issued successfully')
        // Refresh history
        const resHist = await fetch(`/api/bills/party/${selectedPartyId}`)
        const dataHist = await resHist.json()
        if (resHist.ok && dataHist.data) {
          setBillsHistory(dataHist.data)
        }
        handleResetForm()
      } else {
        setError(data.error || 'Failed to save bill')
      }
    } catch {
      setError('Network error saving bill')
    } finally {
      setSaving(false)
    }
  }

  // Delete selected bill
  const handleDelete = async () => {
    if (!selectedBill) return
    if (!confirm('Are you sure you want to delete this bill? This will also revert the synchronized reading.')) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/bills/${selectedBill.serial}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Bill deleted successfully')
        // Refresh history
        const resHist = await fetch(`/api/bills/party/${selectedPartyId}`)
        const dataHist = await resHist.json()
        if (resHist.ok && dataHist.data) {
          setBillsHistory(dataHist.data)
        }
        handleResetForm()
      } else {
        setError(data.error || 'Failed to delete bill')
      }
    } catch {
      setError('Network error deleting bill')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden border bg-white border-slate-200 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-300/40 text-slate-900 flex flex-col max-h-[95vh]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold tracking-wide text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            :: Issue Bills ::
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-3 text-xs">
            {/* Dates Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <label className="w-20 font-bold text-slate-700 text-right">Billing Month:</label>
                <input
                  type="date"
                  value={bdate}
                  onChange={(e) => setBdate(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 font-bold text-slate-700 text-right">Reading Date:</label>
                <input
                  type="date"
                  value={rdate}
                  onChange={(e) => setRdate(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 font-bold text-slate-700 text-right">Issue Date:</label>
                <input
                  type="date"
                  value={isdate}
                  onChange={(e) => setIsdate(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="w-20 font-bold text-slate-700 text-right">Due Date:</label>
                <input
                  type="date"
                  value={duedate}
                  onChange={(e) => setDuedate(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            <hr className="border-slate-100 my-2" />

            {/* Floor / Shop Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3">
                <label className="w-20 font-bold text-slate-700 text-right">Floor:</label>
                <select
                  value={selectedFloorName}
                  onChange={(e) => setSelectedFloorName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  {loadingFloors ? (
                    <option>Loading Floors...</option>
                  ) : (
                    floors.map((f) => (
                      <option key={f.idno} value={f.floor}>{f.floor}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="w-20 font-bold text-slate-700 text-right">Off/Shop No:</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedPartyId(val ? Number(val) : '');
                  }}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  <option value="">-- Select Shop --</option>
                  {filteredParties.map((p) => (
                    <option key={p.serial} value={p.idno}>{p.shop}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reading Fields */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                  Previous Reading
                </label>
                <input
                  type="number"
                  value={previousReading}
                  disabled
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                  Present Reading
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={presentReading}
                  onChange={(e) => setPresentReading(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                  Usage Units
                </label>
                <input
                  type="number"
                  value={usageUnits}
                  disabled
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium focus:outline-none font-bold"
                />
              </div>
            </div>

            {/* Layout containing Grid and Actions Side-by-Side */}
            <div className="grid grid-cols-4 gap-4 pt-2">
              {/* Readings Grid (Table) */}
              <div className="col-span-3 border border-slate-200 bg-slate-50/50 rounded-xl flex flex-col max-h-[220px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Month</th>
                      <th className="px-3 py-2 text-right">Present Reading</th>
                      <th className="px-3 py-2 text-right">Use Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                          Loading list...
                        </td>
                      </tr>
                    ) : billsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                          No records.
                        </td>
                      </tr>
                    ) : (
                      billsHistory.map((b) => (
                        <tr
                          key={b.serial}
                          onClick={() => handleSelectBillRow(b)}
                          className={`hover:bg-slate-100/50 cursor-pointer transition-colors ${
                            selectedBill?.serial === b.serial ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-3 py-1.5 text-slate-500 font-mono">
                            {b.bdate ? new Date(b.bdate).toISOString().split('T')[0] : 'N/A'}
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold text-slate-700">{b.reding.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-600">{b.useunit.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Actions Stack */}
              <div className="flex flex-col gap-2 justify-start">
                <button
                  type="submit"
                  disabled={saving || !!selectedBill}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {saving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Save'}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || !selectedBill}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  {deleting ? (
                    <span className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
                  ) : 'Delete'}
                </button>

                {selectedBill && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[10px] font-medium transition-all cursor-pointer"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
