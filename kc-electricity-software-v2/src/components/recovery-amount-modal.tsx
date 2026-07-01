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
  reding: number
  unit: number
  useunit: number
  bal: number
  dbt: number
  disc: number
  gamt: number
  Status: string
}

export default function RecoveryAmountModal({ onClose }: { onClose: () => void }) {
  const [floors, setFloors] = useState<Floor[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [filteredParties, setFilteredParties] = useState<Party[]>([])
  const [activeBill, setActiveBill] = useState<LedgerEntry | null>(null)

  const [loadingFloors, setLoadingFloors] = useState(true)
  const [loadingBill, setLoadingBill] = useState(false)
  const [saving, setSaving] = useState(false)

  // Selected values (Form fields matching legacy app)
  const [selectedFloorName, setSelectedFloorName] = useState('')
  const [selectedPartyId, setSelectedPartyId] = useState<number | ''>('')

  // Dates
  const [bdate, setBdate] = useState('') // Billing Month
  const [ddate, setDdate] = useState('') // Payment Date

  // Payment Details
  const [payMode, setPayMode] = useState<'Cash' | 'PayOrder'>('Cash')
  const [recoveryAmount, setRecoveryAmount] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [porder, setPorder] = useState('') // Pay order reference

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Initial date setup
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    setBdate(todayStr)
    setDdate(todayStr)
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
      setActiveBill(null)
      handleResetForm()
    } else {
      setFilteredParties([])
      setSelectedPartyId('')
      setActiveBill(null)
      handleResetForm()
    }
  }, [selectedFloorName, parties])

  // Fetch active uncleared bill when shop is selected
  useEffect(() => {
    const fetchUnclearedBill = async () => {
      if (!selectedPartyId) {
        setActiveBill(null)
        setRecoveryAmount(0)
        setDiscount(0)
        return
      }

      try {
        setLoadingBill(true)
        setError(null)
        setSuccess(null)
        const res = await fetch(`/api/bills/party/${selectedPartyId}`)
        const data = await res.json()
        if (res.ok && data.data) {
          // Find the most recent uncleared bill
          const uncleared = data.data.find((b: LedgerEntry) => b.Status === 'Uncleared' && b.bal > 0)
          if (uncleared) {
            setActiveBill(uncleared)
            setRecoveryAmount(uncleared.bal)
            setDiscount(0)
            if (uncleared.bdate) {
              setBdate(new Date(uncleared.bdate).toISOString().split('T')[0])
            }
          } else {
            setActiveBill(null)
            setRecoveryAmount(0)
            setDiscount(0)
            setError('No outstanding/uncleared bill found for this shop.')
          }
        }
      } catch (err) {
        console.error('Failed to load bill information', err)
        setError('Error loading outstanding bill information')
      } finally {
        setLoadingBill(false)
      }
    }
    fetchUnclearedBill()
  }, [selectedPartyId])

  const handleResetForm = () => {
    const todayStr = new Date().toISOString().split('T')[0]
    setDdate(todayStr)
    setPayMode('Cash')
    setPorder('')
    setDiscount(0)
    if (activeBill) {
      setRecoveryAmount(activeBill.bal)
    } else {
      setRecoveryAmount(0)
    }
    setError(null)
    setSuccess(null)
  }

  // Save payment recovery
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPartyId) {
      setError('Please select a shop/office')
      return
    }
    if (!activeBill) {
      setError('No outstanding bill to pay')
      return
    }
    if (recoveryAmount <= 0 && discount <= 0) {
      setError('Please enter a recovery amount or discount')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // 1. Apply discount first if any
      if (discount > 0) {
        const resDisc = await fetch(`/api/bills/${activeBill.serial}/discount`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ disc: discount }),
        })
        if (!resDisc.ok) {
          const dataDisc = await resDisc.json()
          setError(dataDisc.error || 'Failed to apply discount')
          setSaving(false)
          return
        }
      }

      // 2. Record payment recovery
      if (recoveryAmount > 0) {
        const resPay = await fetch(`/api/bills/${activeBill.serial}/payment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dbt: recoveryAmount,
            ddate,
            porder: payMode === 'PayOrder' ? porder : 'Cash Payment'
          }),
        })
        const dataPay = await resPay.json()
        if (resPay.ok) {
          setSuccess(dataPay.message || 'Payment recorded successfully')
          // Refresh uncleared bill state
          setActiveBill(null)
          setSelectedPartyId('') // Reset selection to force refresh next time
        } else {
          setError(dataPay.error || 'Failed to record payment')
        }
      } else if (discount > 0) {
        setSuccess('Discount applied successfully')
        setActiveBill(null)
        setSelectedPartyId('')
      }
    } catch {
      setError('Network error processing recovery')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden border bg-white border-slate-200 backdrop-blur-md rounded-2xl shadow-2xl shadow-slate-300/40 text-slate-900 flex flex-col max-h-[90vh]">
        {/* Title Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold tracking-wide text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            :: Recovery Amount ::
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
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            {/* Floor / Shop Dropdowns */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Floor:</label>
                <select
                  value={selectedFloorName}
                  onChange={(e) => setSelectedFloorName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
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

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Off/Shop No:</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedPartyId(val ? Number(val) : '');
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                >
                  <option value="">-- Select Shop --</option>
                  {filteredParties.map((p) => (
                    <option key={p.serial} value={p.idno}>{p.shop}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Display Outstanding Bill Info */}
            {loadingBill ? (
              <div className="p-3 bg-slate-50 border border-slate-100 text-center text-slate-400 rounded-xl">
                Checking outstanding bills...
              </div>
            ) : activeBill ? (
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-slate-800">
                <div className="font-bold text-blue-900 border-b border-blue-100 pb-1 flex justify-between">
                  <span>Outstanding Bill Details</span>
                  <span className="font-mono text-[10px] text-blue-700 bg-blue-100/50 px-1.5 py-0.5 rounded">
                    Serial: #{activeBill.serial}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Bill Month:</span>{' '}
                    <span className="font-semibold">
                      {activeBill.bdate ? new Date(activeBill.bdate).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Gross Amount:</span>{' '}
                    <span className="font-semibold text-slate-900">Rs. {activeBill.gamt.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Paid Amount:</span>{' '}
                    <span className="font-semibold text-slate-700">Rs. {activeBill.dbt.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Remaining Balance:</span>{' '}
                    <span className="font-bold text-red-600">Rs. {activeBill.bal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Billing Month Info / Payment Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Bill Month (Ref):</label>
                <input
                  type="date"
                  value={bdate}
                  disabled
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Payment Date:</label>
                <input
                  type="date"
                  value={ddate}
                  onChange={(e) => setDdate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  required
                />
              </div>
            </div>

            {/* Payment Mode Selection */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex justify-around items-center">
              <span className="font-bold text-slate-700">Payment Mode:</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="payMode"
                  checked={payMode === 'Cash'}
                  onChange={() => setPayMode('Cash')}
                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                />
                Cash
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="payMode"
                  checked={payMode === 'PayOrder'}
                  onChange={() => setPayMode('PayOrder')}
                  className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                />
                Pay Order
              </label>
            </div>

            {/* Cash vs Pay Order Specific Inputs */}
            {payMode === 'PayOrder' && (
              <div className="flex flex-col gap-1 animate-in slide-in-from-top-1 duration-150">
                <label className="font-bold text-slate-700">Pay Order / Reference No:</label>
                <input
                  type="text"
                  placeholder="e.g. PO-890312"
                  value={porder}
                  onChange={(e) => setPorder(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            )}

            {/* Amount and Discount Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Recovery Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={activeBill ? activeBill.bal : undefined}
                  value={recoveryAmount}
                  onChange={(e) => setRecoveryAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                  disabled={!activeBill}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-700">Discount Given:</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={activeBill ? activeBill.bal - recoveryAmount : undefined}
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                  disabled={!activeBill}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving || !activeBill}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-blue-500/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                )}
                Save Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
