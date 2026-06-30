'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import './legacy-shell.css'

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
      <span className="kc-underline">{label[idx]}</span>
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
    onMenuSelect?.(key)
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="kc-shell">
      {/* ── Menu Bar ── */}
      <nav className="kc-menubar" ref={menuBarRef} aria-label="Main menu">
        <div className="kc-menubar__brand">Kareem Centre</div>
        <div className="kc-menubar__divider" />
        {MENUS.map((menu) => (
          <div className="kc-menu" key={menu.id}>
            {/* Trigger */}
            <button
              id={`menu-trigger-${menu.id}`}
              className={`kc-menu__trigger${openMenu === menu.id ? ' kc-menu__trigger--active' : ''}`}
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
                className="kc-dropdown"
                role="menu"
                aria-labelledby={`menu-trigger-${menu.id}`}
              >
                {menu.items.map((item, idx) =>
                  item.kind === 'separator' ? (
                    <div key={idx} className="kc-dropdown__item--separator" role="separator" />
                  ) : (
                    <button
                      key={item.key}
                      id={`menu-item-${item.key}`}
                      className={`kc-dropdown__item${item.blue ? ' kc-dropdown__item--blue' : ''}`}
                      role="menuitem"
                      onClick={() => handleSelect(item.key)}
                    >
                      <span>
                        {item.prefix && (
                          <span className="kc-item-prefix">{item.prefix} </span>
                        )}
                        {item.label}
                      </span>
                      {item.shortcut && (
                        <span className="kc-shortcut">{item.shortcut}</span>
                      )}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}

        {/* ── Logout ── */}
        <button
          id="menu-logout"
          className="kc-logout-btn"
          onClick={handleLogout}
          aria-label="Logout"
        >
          Logout
        </button>
      </nav>

      {/* Click-away overlay */}
      {openMenu && (
        <div
          className="kc-overlay"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Content Area (XP-style wallpaper) ── */}
      <main className="kc-content" aria-label="Desktop workspace" />

      {/* ── Status Bar ── */}
      <footer className="kc-statusbar">
        <span className="kc-statusbar__text">
          POWERED BY: PANJA GROUP &nbsp;(0333-3212904)
        </span>
      </footer>
    </div>
  )
}
