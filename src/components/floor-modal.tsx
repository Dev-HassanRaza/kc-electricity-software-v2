'use client'

import { useEffect, useState } from 'react'

interface Floor {
  idno: number
  floor: string
}

export default function FloorModal({ onClose }: { onClose: () => void }) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Form fields
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null)
  const [floorName, setFloorName] = useState('')
  const [codeNo, setCodeNo] = useState<number>(1)
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch floors
  const fetchFloors = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/floors')
      const data = await res.json()
      if (res.ok && data.data) {
        setFloors(data.data)
        // Calculate next code number
        const maxCode = data.data.reduce((max: number, f: Floor) => f.idno > max ? f.idno : max, 0)
        if (!selectedFloor) {
          setCodeNo(maxCode + 1)
        }
      } else {
        setError(data.error || 'Failed to load floors')
      }
    } catch {
      setError('Network error loading floors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFloors()
  }, [])

  // Handle select floor for editing
  const handleSelectFloor = (floor: Floor) => {
    setSelectedFloor(floor)
    setFloorName(floor.floor)
    setCodeNo(floor.idno)
    setError(null)
    setSuccess(null)
  }

  // Clear selection / set to New mode
  const handleReset = () => {
    setSelectedFloor(null)
    setFloorName('')
    const maxCode = floors.reduce((max: number, f: Floor) => f.idno > max ? f.idno : max, 0)
    setCodeNo(maxCode + 1)
    setError(null)
    setSuccess(null)
  }

  // Save floor (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!floorName.trim()) {
      setError('Floor name cannot be empty')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (selectedFloor) {
        // Update (PUT)
        const res = await fetch(`/api/floors/${selectedFloor.idno}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ floor: floorName.trim() }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess('Floor updated successfully')
          fetchFloors()
          handleReset()
        } else {
          setError(data.error || 'Failed to update floor')
        }
      } else {
        // Create (POST)
        const res = await fetch('/api/floors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ floor: floorName.trim() }),
        })
        const data = await res.json()
        if (res.ok) {
          setSuccess('Floor created successfully')
          fetchFloors()
          handleReset()
        } else {
          setError(data.error || 'Failed to create floor')
        }
      }
    } catch {
      setError('Network error saving floor')
    } finally {
      setSaving(false)
    }
  }

  // Delete floor
  const handleDelete = async () => {
    if (!selectedFloor) return
    if (!confirm(`Are you sure you want to delete floor "${selectedFloor.floor}"?`)) return

    setDeleting(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(`/api/floors/${selectedFloor.idno}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (res.ok) {
        setSuccess('Floor deleted successfully')
        fetchFloors()
        handleReset()
      } else {
        setError(data.error || 'Failed to delete floor')
      }
    } catch {
      setError('Network error deleting floor')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl overflow-hidden border bg-white border-slate-200 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-300/40 text-slate-900 flex flex-col max-h-[90vh]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-lg font-semibold tracking-wide text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            :: Add Floor ::
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
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                  Code No
                </label>
                <input
                  type="text"
                  value={selectedFloor ? codeNo : `${codeNo} (Auto)`}
                  disabled
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 font-medium text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-500 mb-1.5">
                  Floor Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1ST FLOOR"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  required
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-950/20 hover:shadow-blue-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )}
                  {selectedFloor ? 'Update Floor' : 'Save Floor'}
                </button>

                {selectedFloor && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="w-full py-2 bg-red-50 hover:bg-red-100 disabled:bg-red-50/50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {deleting ? (
                      <span className="w-4 h-4 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    Delete Floor
                  </button>
                )}

                {selectedFloor && (
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
            <div className="md:col-span-3 border border-slate-200 bg-slate-50/50 rounded-2xl flex flex-col min-h-[300px] overflow-hidden">
              <div className="overflow-x-auto flex-1 max-h-[350px]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Code</th>
                      <th className="px-4 py-3 font-semibold text-slate-500 text-[10px] uppercase tracking-wider">Floor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-slate-500 font-medium">
                          <span className="inline-block w-5 h-5 border-2 border-slate-350 border-t-slate-650 rounded-full animate-spin mr-2 align-middle" />
                          Loading floors...
                        </td>
                      </tr>
                    ) : floors.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-slate-500 font-medium">
                          No floors defined yet.
                        </td>
                      </tr>
                    ) : (
                      floors.map((floor) => (
                        <tr
                          key={floor.idno}
                          onClick={() => handleSelectFloor(floor)}
                          className={`hover:bg-slate-100/50 cursor-pointer transition-colors ${
                            selectedFloor?.idno === floor.idno ? 'bg-blue-50 hover:bg-blue-100/60' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-500">{floor.idno}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{floor.floor}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
                <span>Total: {floors.length} Floors</span>
                {selectedFloor && <span className="text-blue-600 font-semibold">Editing: Code {selectedFloor.idno}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
