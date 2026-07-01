'use client'

import { useEffect, useState } from 'react'

interface Floor {
  idno: number
  floor: string
}

interface UnitRate {
  serial: number
  floor: string
  puc: number
  pc: number
  mr: number
  sc: number
  avr: number
}

export default function UnitChargesModal({ onClose }: { onClose: () => void }) {
  const [rates, setRates] = useState<UnitRate[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Form fields
  const [selectedRate, setSelectedRate] = useState<UnitRate | null>(null)
  const [floorName, setFloorName] = useState('')
  const [puc, setPuc] = useState<number>(0)
  const [pc, setPc] = useState<number>(0)
  const [mr, setMr] = useState<number>(0)
  const [sc, setSc] = useState<number>(0)
  const [isAverage, setIsAverage] = useState<boolean>(false)
  const [avrRate, setAvrRate] = useState<number>(0)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch floors
  const fetchFloors = async () => {
    try {
      const res = await fetch('/api/floors')
      const data = await res.json()
      if (res.ok && data.data) {
        setFloors(data.data)
      }
    } catch (err) {
      console.error('Failed to load floors', err)
    }
  }

  // Fetch unit rates
  const fetchRates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/unit-rates')
      const data = await res.json()
      if (res.ok && data.data) {
        setRates(data.data)
      } else {
        setError(data.error || 'Failed to load unit rates')
      }
    } catch {
      setError('Network error loading unit rates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFloors()
    fetchRates()
  }, [])

  // Set default floor on load
  useEffect(() => {
    if (floors.length > 0 && !floorName) {
      setFloorName(floors[0].floor)
    }
  }, [floors])

  // Select rate for editing
  const handleSelectRate = (rate: UnitRate) => {
    setSelectedRate(rate)
    setFloorName(rate.floor)
    setPuc(rate.puc)
    setPc(rate.pc)
    setMr(rate.mr)
    setSc(rate.sc)
    setIsAverage(rate.avr > 0)
    setAvrRate(rate.avr)
    setError(null)
    setSuccess(null)
  }

  // Reset form
  const handleReset = () => {
    setSelectedRate(null)
    setFloorName(floors[0]?.floor || '')
    setPuc(0)
    setPc(0)
    setMr(0)
    setSc(0)
    setIsAverage(false)
    setAvrRate(0)
    setError(null)
    setSuccess(null)
  }

  // Save unit rate
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!floorName) {
      setError('Please select a floor')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    // Average rate logic
    const calculatedAvr = isAverage ? (avrRate > 0 ? avrRate : 1) : 0

    try {
      if (selectedRate) {
        // Update (PUT)
        const res = await fetch(`/api/unit-rates/${selectedRate.serial}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            puc,
            pc,
            mr,
            sc,
            avr: calculatedAvr
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess('Unit rate updated successfully')
          fetchRates()
          handleReset()
        } else {
          setError(data.error || 'Failed to update unit rate')
        }
      } else {
        // Create (POST)
        // Check if floor rate already exists
        const exists = rates.some(r => r.floor.toLowerCase() === floorName.toLowerCase())
        if (exists) {
          setError(`Unit charges for floor "${floorName}" already exist! Please select the floor in the table to edit it.`)
          setSaving(false)
          return
        }

        const res = await fetch('/api/unit-rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            floor: floorName,
            puc,
            pc,
            mr,
            sc,
            avr: calculatedAvr
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess('Unit rate created successfully')
          fetchRates()
          handleReset()
        } else {
          setError(data.error || 'Failed to create unit rate')
        }
      }
    } catch {
      setError('Network error saving unit rate')
    } finally {
      setSaving(false)
    }
  }

  // Delete unit rate
  const handleDelete = async () => {
    if (!selectedRate) return
    if (!confirm(`Are you sure you want to delete unit charges for floor "${selectedRate.floor}"?`)) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/unit-rates/${selectedRate.serial}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Unit rate deleted successfully')
        fetchRates()
        handleReset()
      } else {
        setError(data.error || 'Failed to delete unit rate')
      }
    } catch {
      setError('Network error deleting unit rate')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl overflow-hidden border bg-white border-slate-200 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-300/40 text-slate-900 flex flex-col max-h-[90vh]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold tracking-wide text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            :: Add Unit Charges ::
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-505 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-550 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex gap-2.5">
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Form */}
            <form onSubmit={handleSave} className="md:col-span-2 space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                  Floor
                </label>
                <select
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  disabled={!!selectedRate}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 disabled:opacity-60 rounded-xl text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  {floors.map((f) => (
                    <option key={f.idno} value={f.floor}>{f.floor}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-505 mb-1.5">
                    Per Unit Charges
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={puc}
                    onChange={(e) => setPuc(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                    Pasige Charges
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={pc}
                    onChange={(e) => setPc(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                    Meter Rent
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={mr}
                    onChange={(e) => setMr(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                    Service Charges
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={sc}
                    onChange={(e) => setSc(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="is-average"
                  checked={isAverage}
                  onChange={(e) => {
                    setIsAverage(e.target.checked)
                    if (!e.target.checked) setAvrRate(0)
                  }}
                  className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="is-average" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  Average Rate Billing
                </label>
              </div>

              {isAverage && (
                <div className="animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                    Average Unit Rate
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={avrRate}
                    onChange={(e) => setAvrRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required={isAverage}
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )}
                  {selectedRate ? 'Update Unit Rate' : 'Save Unit Rate'}
                </button>

                {selectedRate && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 disabled:bg-red-50/50 border border-red-200 text-red-650 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {deleting ? (
                      <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Delete Unit Rate
                  </button>
                )}

                {selectedRate && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel / New
                  </button>
                )}
              </div>
            </form>

            {/* List Table */}
            <div className="md:col-span-3 border border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col min-h-[400px] overflow-hidden">
              <div className="overflow-x-auto flex-1 max-h-[450px]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Floor</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider text-right">Unit Chg</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider text-right">Pasige</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider text-right">Meter Rent</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider text-right">Service</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider text-center">Average</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                          <span className="inline-block w-5 h-5 border-2 border-slate-350 border-t-slate-650 rounded-full animate-spin mr-2 align-middle" />
                          Loading unit rates...
                        </td>
                      </tr>
                    ) : rates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                          No unit rates configured.
                        </td>
                      </tr>
                    ) : (
                      rates.map((rate) => (
                        <tr
                          key={rate.serial}
                          onClick={() => handleSelectRate(rate)}
                          className={`hover:bg-slate-100/50 cursor-pointer transition-colors ${
                            selectedRate?.serial === rate.serial ? 'bg-blue-50 hover:bg-blue-100/60' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-bold text-slate-800">{rate.floor}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">{rate.puc.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">{rate.pc.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">{rate.mr.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">{rate.sc.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-center font-semibold">
                            {rate.avr > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {rate.avr.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">False</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
                <span>Total: {rates.length} Floors Configured</span>
                {selectedRate && <span className="text-blue-650 font-semibold">Editing: {selectedRate.floor}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
