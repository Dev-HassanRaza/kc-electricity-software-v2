'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import './legacy-shell.css'
import FloorModal from './floor-modal'
import ClientModal from './client-modal'
import UnitChargesModal from './unit-charges-modal'
import MeterModal from './meter-modal'
import PrevReadingModal from './prev-reading-modal'
import IssueBillsModal from './issue-bills-modal'
import RecoveryAmountModal from './recovery-amount-modal'
import AverageBillModal from './average-bill-modal'
import ReportsModal from './reports-modal'


// ============================================================
// Menu structure — mirrors the legacy Kareem Centre desktop app
// ============================================================

type MenuItem =
  | { kind: 'item'; label: string; prefix?: string; shortcut?: string; blue?: boolean; key: string }
  | { kind: 'separator' }

interface Menu {
  id: string
  label: string
  accelerator: string  // underlined letter
  items: MenuItem[]
}

const MENUS: Menu[] = [
  {
    id: 'setup',
    label: 'Setup Forum',
    accelerator: 'S',
    items: [
      { kind: 'item', prefix: '::', label: 'Add Floor', shortcut: 'F1', key: 'add-floor' },
      { kind: 'item', prefix: '::', label: 'Client information', shortcut: 'F2', key: 'client-info', blue: true },
      { kind: 'item', prefix: '::', label: 'Add Link Charges', shortcut: 'F3', key: 'add-link-charges' },
      { kind: 'item', prefix: '::', label: 'Add Meter', shortcut: 'F4', key: 'add-meter' },
      { kind: 'item', prefix: '::', label: 'Previous Reading and Arrears', shortcut: 'F5', key: 'prev-reading' },
    ],
  },
  {
    id: 'transaction',
    label: 'Transaction',
    accelerator: 'T',
    items: [
      { kind: 'item', prefix: '::', label: 'Issue Bills', shortcut: 'F6', key: 'issue-bills' },
      { kind: 'item', prefix: '::', label: 'Recovery Amount', shortcut: 'F7', key: 'recovery-amount' },
      { kind: 'item', prefix: '::', label: 'Issue Average Bill', shortcut: 'F8', key: 'issue-avg-bill', blue: true },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    accelerator: 'R',
    items: [
      { kind: 'item', label: 'Floor List', key: 'floor-list' },
      { kind: 'separator' },
      { kind: 'item', label: 'Format Bill', key: 'format-bill' },
      { kind: 'item', label: 'Bill', key: 'bill' },
      { kind: 'separator' },
      { kind: 'item', label: 'Format Average Bill', key: 'format-avg-bill' },
      { kind: 'item', label: 'Average Bill', key: 'avg-bill' },
      { kind: 'separator' },
      { kind: 'item', label: 'Format 12% Bill', key: 'format-12-bill' },
      { kind: 'item', label: '12% Bill', key: '12-bill' },
      { kind: 'separator' },
      { kind: 'item', label: 'Ledger', key: 'ledger' },
      { kind: 'item', label: 'Daily Ledger', key: 'daily-ledger' },
      { kind: 'item', label: 'Balance Sheet', key: 'balance-sheet' },
      { kind: 'separator' },
      { kind: 'item', label: 'Defaulter List', key: 'defaulter-list' },
      { kind: 'item', label: 'Monthly Summary', key: 'monthly-summary' },
      { kind: 'item', label: 'Electric Motor Units', key: 'motor-units' },
    ],
  },
]

// ============================================================
// Helper — render label with underlined accelerator letter
// ============================================================
function LabelWithAccelerator({ label, accelerator }: { label: string; accelerator: string }) {
  const idx = label.indexOf(accelerator)
  if (idx === -1) return <span>{label}</span>
  return (
    <span>
      {label.slice(0, idx)}
      <span className="underline decoration-indigo-400 decoration-2 underline-offset-2">{label[idx]}</span>
      {label.slice(idx + 1)}
    </span>
  )
}

// ============================================================
// Main Shell Component
// ============================================================
export default function LegacyShell({
  onMenuSelect,
}: {
  onMenuSelect?: (key: string) => void
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<
    | 'add-floor'
    | 'client-info'
    | 'add-link-charges'
    | 'add-meter'
    | 'prev-reading'
    | 'issue-bills'
    | 'recovery-amount'
    | 'issue-avg-bill'
    | null
  >(null)
  const [activeReportKey, setActiveReportKey] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpenMenu(null), [])

  const toggle = (id: string) => {
    setOpenMenu((prev) => (prev === id ? null : id))
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  const handleSelect = (key: string) => {
    close()
    if (key === 'add-floor') {
      setActiveModal('add-floor')
    } else if (key === 'client-info') {
      setActiveModal('client-info')
    } else if (key === 'add-link-charges') {
      setActiveModal('add-link-charges')
    } else if (key === 'add-meter') {
      setActiveModal('add-meter')
    } else if (key === 'prev-reading') {
      setActiveModal('prev-reading')
    } else if (key === 'issue-bills') {
      setActiveModal('issue-bills')
    } else if (key === 'recovery-amount') {
      setActiveModal('recovery-amount')
    } else if (key === 'issue-avg-bill') {
      setActiveModal('issue-avg-bill')
    } else if ([
      'floor-list',
      'format-bill',
      'bill',
      'format-avg-bill',
      'avg-bill',
      'format-12-bill',
      '12-bill',
      'ledger',
      'daily-ledger',
      'balance-sheet',
      'defaulter-list',
      'monthly-summary',
      'motor-units'
    ].includes(key)) {
      setActiveReportKey(key)
    } else {
      onMenuSelect?.(key)
    }
  }


  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-50 font-sans select-none text-slate-900">
      {/* ── Modern Premium Navbar ── */}
      <nav className="flex items-center justify-between h-14 bg-white/80 border-b border-slate-200 backdrop-blur-md px-6 flex-shrink-0 relative z-50" ref={menuBarRef} aria-label="Main menu">
        <div className="flex items-center">
          <div className="text-sm font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-sans uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
            Kareem Centre
          </div>
          <div className="w-px h-5 bg-slate-200 mx-4" />
          <div className="flex items-center gap-1">
            {MENUS.map((menu) => (
              <div className="relative" key={menu.id}>
                {/* Trigger */}
                <button
                  id={`menu-trigger-${menu.id}`}
                  className={`px-3.5 py-1.5 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-all text-xs font-semibold flex items-center gap-1.5 focus:outline-none cursor-pointer ${
                    openMenu === menu.id ? 'bg-slate-100 text-slate-950' : ''
                  }`}
                  onClick={() => toggle(menu.id)}
                  aria-haspopup="true"
                  aria-expanded={openMenu === menu.id}
                  aria-controls={`menu-dropdown-${menu.id}`}
                >
                  <LabelWithAccelerator label={menu.label} accelerator={menu.accelerator} />
                </button>

                {/* Dropdown */}
                {openMenu === menu.id && (
                  <div
                    id={`menu-dropdown-${menu.id}`}
                    className="absolute top-full left-0 mt-1.5 w-64 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-xl shadow-slate-200/20 z-[1000] p-1.5 flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-1.5 duration-150"
                    role="menu"
                    aria-labelledby={`menu-trigger-${menu.id}`}
                  >
                    {menu.items.map((item, idx) =>
                      item.kind === 'separator' ? (
                        <div key={idx} className="h-px bg-slate-100 my-1" role="separator" />
                      ) : (
                        <button
                          key={item.key}
                          id={`menu-item-${item.key}`}
                          className={`w-full px-3 py-2 rounded-lg text-left text-slate-700 hover:bg-slate-50 hover:text-slate-950 transition-all text-xs font-medium flex items-center justify-between focus:outline-none cursor-pointer ${
                            item.blue ? 'text-sky-600 font-semibold' : ''
                          }`}
                          role="menuitem"
                          onClick={() => handleSelect(item.key)}
                        >
                          <span className="flex items-center gap-1.5">
                            {item.prefix && (
                              <span className="text-[10px] text-slate-400 font-semibold">{item.prefix}</span>
                            )}
                            {item.label}
                          </span>
                          {item.shortcut && (
                            <span className="text-[10px] text-slate-500 font-medium tracking-wide bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-200">
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Logout ── */}
        <button
          id="menu-logout"
          className="px-4.5 py-1.5 border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-700 hover:text-red-600 rounded-xl transition-all text-xs font-bold focus:outline-none flex items-center gap-1.5 active:scale-95 cursor-pointer"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </nav>

      {/* Click-away overlay */}
      {openMenu && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Content Area (Classic Windows XP Wallpaper inspired by Bliss) ── */}
      <main className="flex-1 overflow-hidden relative bg-radial-gradient" aria-label="Desktop workspace">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-100/20 via-sky-50/10 to-transparent pointer-events-none" />
      </main>

      {/* ── Status Bar ── */}
      <footer className="flex items-center justify-between h-7 bg-white border-t border-slate-200 px-6 flex-shrink-0 text-slate-500 text-[10px]">
        <span className="font-semibold text-slate-500">
          POWERED BY: PANJA GROUP &nbsp;(0333-3212904)
        </span>
        <span className="font-medium tracking-wide text-slate-600">
          SYSTEM ACTIVE
        </span>
      </footer>

      {/* ── Premium Modals ── */}
      {activeModal === 'add-floor' && (
        <FloorModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'client-info' && (
        <ClientModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'add-link-charges' && (
        <UnitChargesModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'add-meter' && (
        <MeterModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'prev-reading' && (
        <PrevReadingModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'issue-bills' && (
        <IssueBillsModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'recovery-amount' && (
        <RecoveryAmountModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'issue-avg-bill' && (
        <AverageBillModal onClose={() => setActiveModal(null)} />
      )}
      {activeReportKey && (
        <ReportsModal reportKey={activeReportKey} onClose={() => setActiveReportKey(null)} />
      )}
    </div>
  )
}


