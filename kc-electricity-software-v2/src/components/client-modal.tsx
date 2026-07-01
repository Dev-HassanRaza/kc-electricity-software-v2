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
  vdate: string | null
}

export default function ClientModal({ onClose }: { onClose: () => void }) {
  const [parties, setParties] = useState<Party[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFloorFilter, setSelectedFloorFilter] = useState('')
  
  // Form fields
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [codeNo, setCodeNo] = useState<number>(1)
  const [shopNo, setShopNo] = useState('')
  const [floorName, setFloorName] = useState('')
  const [status, setStatus] = useState('Consumer')
  
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

  // Fetch parties
  const fetchParties = async () => {
    try {
      setLoading(true)
      let url = '/api/parties'
      const params = new URLSearchParams()
      if (selectedFloorFilter) params.append('floor', selectedFloorFilter)
      if (searchTerm) params.append('search', searchTerm)
      
      const queryStr = params.toString()
      if (queryStr) url += `?${queryStr}`
      
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok && data.data) {
        setParties(data.data)
        
        // Calculate next code number
        if (!selectedParty) {
          const maxCode = data.data.reduce((max: number, p: Party) => p.idno > max ? p.idno : max, 0)
          setCodeNo(maxCode + 1)
        }
      } else {
        setError(data.error || 'Failed to load clients')
      }
    } catch {
      setError('Network error loading clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFloors()
  }, [])

  useEffect(() => {
    fetchParties()
  }, [searchTerm, selectedFloorFilter])

  // Select party for editing
  const handleSelectParty = (party: Party) => {
    setSelectedParty(party)
    setCodeNo(party.idno)
    setShopNo(party.shop)
    setFloorName(party.floor)
    setStatus(party.stat)
    setError(null)
    setSuccess(null)
  }

  // Reset form
  const handleReset = () => {
    setSelectedParty(null)
    setShopNo('')
    setFloorName(floors[0]?.floor || '')
    setStatus('Consumer')
    
    // Suggest next available code
    const maxCode = parties.reduce((max: number, p: Party) => p.idno > max ? p.idno : max, 0)
    setCodeNo(maxCode + 1)
    
    setError(null)
    setSuccess(null)
  }

  // Set default floor on load
  useEffect(() => {
    if (floors.length > 0 && !floorName) {
      setFloorName(floors[0].floor)
    }
  }, [floors])

  // Save client
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopNo.trim()) {
      setError('Shop/Office No cannot be empty')
      return
    }
    if (!floorName) {
      setError('Please select a floor')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (selectedParty) {
        // Update (PUT)
        const res = await fetch(`/api/parties/${selectedParty.idno}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shop: shopNo.trim(),
            floor: floorName,
            stat: status
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess('Client updated successfully')
          fetchParties()
          handleReset()
        } else {
          setError(data.error || 'Failed to update client')
        }
      } else {
        // Create (POST)
        const res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idno: codeNo,
            shop: shopNo.trim(),
            floor: floorName,
            stat: status
          }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess('Client created successfully')
          fetchParties()
          handleReset()
        } else {
          setError(data.error || 'Failed to create client')
        }
      }
    } catch {
      setError('Network error saving client')
    } finally {
      setSaving(false)
    }
  }

  // Delete client
  const handleDelete = async () => {
    if (!selectedParty) return
    if (!confirm(`Warning: Deleting client "${selectedParty.shop}" will also delete all related meters, ledger bills, and reading history! Are you sure you want to proceed?`)) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/parties/${selectedParty.idno}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Client deleted successfully')
        fetchParties()
        handleReset()
      } else {
        setError(data.error || 'Failed to delete client')
      }
    } catch {
      setError('Network error deleting client')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl overflow-hidden border bg-white border-slate-200 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-300/40 text-slate-900 flex flex-col max-h-[90vh]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold tracking-wide text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            :: Client Information ::
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

        {/* Filters Panel */}
        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by shop no or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="w-[180px]">
            <select
              value={selectedFloorFilter}
              onChange={(e) => setSelectedFloorFilter(e.target.value)}
              className="w-full px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">All Floors</option>
              {floors.map((f) => (
                <option key={f.idno} value={f.floor}>{f.floor}</option>
              ))}
            </select>
          </div>
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
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs rounded-xl flex gap-2.5">
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
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-505 mb-1.5">
                  Code No
                </label>
                <input
                  type="number"
                  value={codeNo}
                  onChange={(e) => setCodeNo(parseInt(e.target.value, 10))}
                  disabled={!!selectedParty}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 disabled:opacity-60 rounded-xl text-slate-550 font-medium text-xs focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                  Off/ Shop No
                </label>
                <input
                  type="text"
                  placeholder="e.g. A-15"
                  value={shopNo}
                  onChange={(e) => setShopNo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                  Floor
                </label>
                <select
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  {floors.map((f) => (
                    <option key={f.idno} value={f.floor}>{f.floor}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  <option value="Consumer">Consumer</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

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
                  {selectedParty ? 'Update Client' : 'Save Client'}
                </button>

                {selectedParty && (
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
                    Delete Client
                  </button>
                )}

                {selectedParty && (
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
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Off/Shop</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Floor</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-medium">
                          <span className="inline-block w-5 h-5 border-2 border-slate-350 border-t-slate-650 rounded-full animate-spin mr-2 align-middle" />
                          Loading clients...
                        </td>
                      </tr>
                    ) : parties.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 font-medium">
                          No clients match the filters.
                        </td>
                      </tr>
                    ) : (
                      parties.map((party) => (
                        <tr
                          key={party.serial}
                          onClick={() => handleSelectParty(party)}
                          className={`hover:bg-slate-100/50 cursor-pointer transition-colors ${
                            selectedParty?.serial === party.serial ? 'bg-blue-50 hover:bg-blue-100/60' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-550">{party.idno}</td>
                          <td className="px-4 py-2.5 font-bold text-slate-800">{party.shop}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-700">{party.floor}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              party.stat === 'Active' || party.stat === 'Consumer'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {party.stat}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
                <span>Total: {parties.length} Clients</span>
                {selectedParty && <span className="text-blue-650 font-semibold">Editing Code {selectedParty.idno}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
