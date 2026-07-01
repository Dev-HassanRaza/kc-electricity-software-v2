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

interface Meter {
  serial: number
  idno: number
  meterno: string
  status: string
}

interface PrevReading {
  serial: number
  idno: number
  shop: string
  floor: string
  meterno: string
  pstat: string
  reading: number
  arr: number
  vdate: string | null
  ext: string | null
}

export default function PrevReadingModal({ onClose }: { onClose: () => void }) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [meters, setMeters] = useState<Meter[]>([])
  const [readings, setReadings] = useState<PrevReading[]>([])
  
  const [loadingFloors, setLoadingFloors] = useState(true)
  const [loadingReadings, setLoadingReadings] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Selected values (Form fields matching legacy app)
  const [selectedFloorName, setSelectedFloorName] = useState('')
  const [selectedPartyId, setSelectedPartyId] = useState<number | ''>('')
  
  const [reading, setReading] = useState<number>(0)
  const [arrears, setArrears] = useState<number>(0)
  const [vdate, setVdate] = useState(new Date().toISOString().split('T')[0])
  const [selectedReading, setSelectedReading] = useState<PrevReading | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch initial base data (floors, parties, meters)
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

        // 3. Fetch meters
        const resMeters = await fetch('/api/meters')
        const dataMeters = await resMeters.json()
        if (resMeters.ok && dataMeters.data) {
          setMeters(dataMeters.data)
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
      setReadings([]) // Clear readings table
      handleResetForm()
    } else {
      setFilteredParties([])
      setSelectedPartyId('')
      setReadings([])
      handleResetForm()
    }
  }, [selectedFloorName, parties])

  // Fetch readings when a specific shop/party is selected
  useEffect(() => {
    const fetchReadingsForParty = async () => {
      if (!selectedPartyId) {
        setReadings([])
        return
      }

      try {
        setLoadingReadings(true)
        const res = await fetch(`/api/readings?idno=${selectedPartyId}`)
        const data = await res.json()
        if (res.ok && data.data) {
          setReadings(data.data)
        }
      } catch (err) {
        console.error('Failed to load readings history', err)
      } finally {
        setLoadingReadings(false)
      }
    }
    fetchReadingsForParty()
  }, [selectedPartyId])

  // Reset form fields
  const handleResetForm = () => {
    setSelectedReading(null)
    setReading(0)
    setArrears(0)
    setVdate(new Date().toISOString().split('T')[0])
    setError(null)
    setSuccess(null)
  }

  // Row click selects reading for editing
  const handleSelectReadingRow = (r: PrevReading) => {
    setSelectedReading(r)
    setReading(r.reading)
    setArrears(r.arr)
    if (r.vdate) {
      setVdate(new Date(r.vdate).toISOString().split('T')[0])
    }
    setError(null)
    setSuccess(null)
  }

  // Save (insert new reading)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPartyId) {
      setError('Please select a shop/office')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    const matchedParty = parties.find(p => p.idno === Number(selectedPartyId))
    if (!matchedParty) {
      setError('Consumer not found')
      setSaving(false)
      return
    }

    // Lookup meter number
    const activeMeter = meters.find(m => m.idno === matchedParty.idno && m.status === 'Active')
    const meterNo = activeMeter ? activeMeter.meterno : 'N/A'

    try {
      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idno: matchedParty.idno,
          shop: matchedParty.shop,
          floor: matchedParty.floor,
          meterno: meterNo,
          pstat: matchedParty.stat,
          reading,
          arr: arrears,
          vdate,
          ext: 'Setup Initial'
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Reading saved successfully')
        // Refresh readings list
        const resReadings = await fetch(`/api/readings?idno=${selectedPartyId}`)
        const dataReadings = await resReadings.json()
        if (resReadings.ok && dataReadings.data) {
          setReadings(dataReadings.data)
        }
        handleResetForm()
      } else {
        setError(data.error || 'Failed to save reading')
      }
    } catch {
      setError('Network error saving reading')
    } finally {
      setSaving(false)
    }
  }

  // Update selected reading
  const handleUpdate = async () => {
    if (!selectedReading) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/readings/${selectedReading.serial}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reading,
          arr: arrears,
          vdate
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Reading updated successfully')
        // Refresh readings list
        const resReadings = await fetch(`/api/readings?idno=${selectedPartyId}`)
        const dataReadings = await resReadings.json()
        if (resReadings.ok && dataReadings.data) {
          setReadings(dataReadings.data)
        }
        handleResetForm()
      } else {
        setError(data.error || 'Failed to update reading')
      }
    } catch {
      setError('Network error updating reading')
    } finally {
      setSaving(false)
    }
  }

  // Delete selected reading
  const handleDelete = async () => {
    if (!selectedReading) return
    if (!confirm('Are you sure you want to delete this reading record?')) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/readings/${selectedReading.serial}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Reading record deleted')
        // Refresh readings list
        const resReadings = await fetch(`/api/readings?idno=${selectedPartyId}`)
        const dataReadings = await resReadings.json()
        if (resReadings.ok && dataReadings.data) {
          setReadings(dataReadings.data)
        }
        handleResetForm()
      } else {
        setError(data.error || 'Failed to delete reading')
      }
    } catch {
      setError('Network error deleting reading')
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
            :: Previous Reading and Arrears ::
          </h2>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-105 text-red-700 text-xs rounded-xl flex gap-2.5">
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
            {/* Floor Selection */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Floor:</label>
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

            {/* Shop/Office Selection */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Off/ Shop No:</label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                required
              >
                <option value="">-- Select Shop --</option>
                {filteredParties.map((p) => (
                  <option key={p.serial} value={p.idno}>{p.shop}</option>
                ))}
              </select>
            </div>

            {/* Reading Input */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Reading:</label>
              <input
                type="number"
                step="0.01"
                value={reading}
                onChange={(e) => setReading(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Arrears Input */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Arrears:</label>
              <input
                type="number"
                step="0.01"
                value={arrears}
                onChange={(e) => setArrears(parseFloat(e.target.value) || 0)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Month / Date Input */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Month:</label>
              <input
                type="date"
                value={vdate}
                onChange={(e) => setVdate(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                required
              />
            </div>

            {/* Layout containing Grid and Actions Side-by-Side */}
            <div className="grid grid-cols-4 gap-4 pt-2">
              {/* Readings Grid (Table) */}
              <div className="col-span-3 border border-slate-200 bg-slate-50/50 rounded-xl flex flex-col max-h-[220px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Reading</th>
                      <th className="px-3 py-2 text-right">Arrears</th>
                      <th className="px-3 py-2">Month</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingReadings ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-450">
                          Loading list...
                        </td>
                      </tr>
                    ) : readings.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                          No records.
                        </td>
                      </tr>
                    ) : (
                      readings.map((r) => (
                        <tr
                          key={r.serial}
                          onClick={() => handleSelectReadingRow(r)}
                          className={`hover:bg-slate-100/50 cursor-pointer transition-colors ${
                            selectedReading?.serial === r.serial ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-3 py-1.5 font-semibold text-slate-700">{r.reading.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-right font-medium text-slate-600">{r.arr.toFixed(2)}</td>
                          <td className="px-3 py-1.5 text-slate-500 font-mono">
                            {r.vdate ? new Date(r.vdate).toISOString().split('T')[0] : 'N/A'}
                          </td>
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
                  disabled={saving || !!selectedReading}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-350 text-slate-750 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving || !selectedReading}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-350 text-slate-750 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Update
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || !selectedReading}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-350 text-slate-750 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Delete
                </button>

                {selectedReading && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[10px] font-medium transition-all cursor-pointer"
                  >
                    Clear Edit
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
