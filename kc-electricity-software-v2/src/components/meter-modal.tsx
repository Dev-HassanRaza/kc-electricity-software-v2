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
  shop: string
  floor: string
  meterno: string
  pstat: string
  status: string
  vdate: string | null
}

export default function MeterModal({ onClose }: { onClose: () => void }) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [meters, setMeters] = useState<Meter[]>([])
  const [filteredMeters, setFilteredMeters] = useState<Meter[]>([])
  
  const [loadingFloors, setLoadingFloors] = useState(true)
  const [loadingMeters, setLoadingMeters] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toggling, setToggling] = useState<number | null>(null)
  
  // Selected values (Form fields matching legacy app layout)
  const [selectedFloorName, setSelectedFloorName] = useState('')
  const [selectedPartyId, setSelectedPartyId] = useState<number | ''>('')
  
  const [meterNo, setMeterNo] = useState('')
  const [status, setStatus] = useState('Active')
  const [pstat, setPstat] = useState('Consumer')
  const [vdate, setVdate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  // Fetch all meters
  const fetchAllMeters = async () => {
    try {
      setLoadingMeters(true)
      const res = await fetch('/api/meters')
      const data = await res.json()
      if (res.ok && data.data) {
        setMeters(data.data)
      }
    } catch (err) {
      console.error('Failed to load meters list', err)
    } finally {
      setLoadingMeters(false)
    }
  }

  useEffect(() => {
    fetchAllMeters()
  }, [])

  // Filter parties when selected Floor changes
  useEffect(() => {
    if (selectedFloorName) {
      const filtered = parties.filter(p => p.floor.toLowerCase() === selectedFloorName.toLowerCase())
      setFilteredParties(filtered)
      setSelectedPartyId('') // Reset shop selection
      handleResetForm()
    } else {
      setFilteredParties([])
      setSelectedPartyId('')
      handleResetForm()
    }
  }, [selectedFloorName, parties])

  // Filter meters list based on Floor and Shop selection
  useEffect(() => {
    let result = meters
    if (selectedFloorName) {
      result = result.filter(m => m.floor.toLowerCase() === selectedFloorName.toLowerCase())
    }
    if (selectedPartyId) {
      result = result.filter(m => m.idno === Number(selectedPartyId))
    }
    setFilteredMeters(result)
  }, [selectedFloorName, selectedPartyId, meters])

  // Set default pstat when party selected
  useEffect(() => {
    if (selectedPartyId) {
      const party = parties.find(p => p.idno === Number(selectedPartyId))
      if (party) {
        setPstat(party.stat)
      }
    }
  }, [selectedPartyId, parties])

  // Reset form fields
  const handleResetForm = () => {
    setSelectedMeter(null)
    setMeterNo('')
    setStatus('Active')
    setPstat('Consumer')
    setVdate(new Date().toISOString().split('T')[0])
    setError(null)
    setSuccess(null)
  }

  // Row click selects meter for editing
  const handleSelectMeterRow = (m: Meter) => {
    setSelectedMeter(m)
    setMeterNo(m.meterno)
    setStatus(m.status)
    setPstat(m.pstat)
    if (m.vdate) {
      setVdate(new Date(m.vdate).toISOString().split('T')[0])
    }
    setError(null)
    setSuccess(null)
  }

  // Save new meter
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPartyId) {
      setError('Please select a shop/office')
      return
    }
    if (!meterNo.trim()) {
      setError('Meter number cannot be empty')
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

    try {
      // Check if meter no already assigned
      const exists = meters.some(m => m.meterno.toLowerCase() === meterNo.trim().toLowerCase())
      if (exists) {
        setError(`Meter number "${meterNo}" is already assigned!`)
        setSaving(false)
        return
      }

      const res = await fetch('/api/meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idno: matchedParty.idno,
          shop: matchedParty.shop,
          floor: matchedParty.floor,
          meterno: meterNo.trim(),
          pstat,
          status,
          vdate
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Meter assigned successfully')
        fetchAllMeters()
        handleResetForm()
      } else {
        setError(data.error || 'Failed to assign meter')
      }
    } catch {
      setError('Network error saving meter')
    } finally {
      setSaving(false)
    }
  }

  // Update selected meter
  const handleUpdate = async () => {
    if (!selectedMeter) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/meters/${selectedMeter.serial}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meterno: meterNo.trim(),
          pstat,
          vdate
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Meter updated successfully')
        fetchAllMeters()
        handleResetForm()
      } else {
        setError(data.error || 'Failed to update meter')
      }
    } catch {
      setError('Network error updating meter')
    } finally {
      setSaving(false)
    }
  }

  // Delete selected meter
  const handleDelete = async () => {
    if (!selectedMeter) return
    if (!confirm('Are you sure you want to delete this meter assignment?')) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/meters/${selectedMeter.serial}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Meter assignment deleted')
        fetchAllMeters()
        handleResetForm()
      } else {
        setError(data.error || 'Failed to delete meter')
      }
    } catch {
      setError('Network error deleting meter')
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
            :: Add Meter ::
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
            <div className="p-3.5 bg-emerald-550 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex gap-2.5">
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

            {/* Meter No Input */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Meter No:</label>
              <input
                type="text"
                placeholder="e.g. M-1049"
                value={meterNo}
                onChange={(e) => setMeterNo(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            {/* Type Input */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Type (pstat):</label>
              <select
                value={pstat}
                onChange={(e) => setPstat(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                required
              >
                <option value="Consumer">Consumer</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Status & Date */}
            <div className="flex items-center gap-4">
              <label className="w-28 font-bold text-slate-700 text-right">Status:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                required
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Layout containing Grid and Actions Side-by-Side */}
            <div className="grid grid-cols-4 gap-4 pt-2">
              {/* Meters Grid (Table) */}
              <div className="col-span-3 border border-slate-200 bg-slate-50/50 rounded-xl flex flex-col max-h-[220px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-bold text-slate-505">
                    <tr>
                      <th className="px-3 py-2">Meter No</th>
                      <th className="px-3 py-2">Shop</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingMeters ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-450">
                          Loading list...
                        </td>
                      </tr>
                    ) : filteredMeters.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-4 text-center text-slate-400">
                          No meters found.
                        </td>
                      </tr>
                    ) : (
                      filteredMeters.map((m) => (
                        <tr
                          key={m.serial}
                          onClick={() => handleSelectMeterRow(m)}
                          className={`hover:bg-slate-100/50 cursor-pointer transition-colors ${
                            selectedMeter?.serial === m.serial ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="px-3 py-1.5 font-bold text-slate-700">{m.meterno}</td>
                          <td className="px-3 py-1.5 text-slate-600 font-medium">{m.shop}</td>
                          <td className="px-3 py-1.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              m.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-red-50 text-red-650 border border-red-100'
                            }`}>
                              {m.status}
                            </span>
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
                  disabled={saving || !!selectedMeter}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-350 text-slate-750 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Save
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving || !selectedMeter}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-350 text-slate-750 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Update
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting || !selectedMeter}
                  className="w-full py-1.5 bg-white hover:bg-slate-50 border border-slate-350 text-slate-750 disabled:opacity-40 disabled:hover:bg-white rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Delete
                </button>

                {selectedMeter && (
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
