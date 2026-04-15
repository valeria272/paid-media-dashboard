'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AlertBadge } from '@/components/alerts/AlertBadge'

interface SidebarProps {
  criticalAlerts?: number
  pendingApprovals?: number
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/campaigns', label: 'Campanas', icon: '📋' },
  { href: '/pacing', label: 'Registro costos', icon: '📈' },
  { href: '/approvals', label: 'Aprobaciones', icon: '✅' },
  { href: '/social', label: 'Redes · CopyWriters', icon: '📱' },
  { href: '/social/mas-center', label: 'Redes · Mas Center', icon: '🏢' },
]

export function Sidebar({ criticalAlerts = 0, pendingApprovals = 0 }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-lg font-bold">Paid Media Pro</h1>
        <p className="text-xs text-gray-400 mt-1">Dashboard interno — Grupo CopyLab</p>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && item.href !== '/social' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/' && criticalAlerts > 0 && (
                <AlertBadge count={criticalAlerts} severity="critical" />
              )}
              {item.href === '/approvals' && pendingApprovals > 0 && (
                <AlertBadge count={pendingApprovals} severity="warning" />
              )}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 px-3 mb-2">Compartir</p>
          <Link
            href="/client"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span>🔗</span>
            <span>Cliente · CopyWriters</span>
          </Link>
          <Link
            href="/social/mas-center/cliente"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <span>🔗</span>
            <span>Cliente · Mas Center</span>
          </Link>
        </div>
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 text-center">
          Paid Media Pro v1.0
        </p>
      </div>
    </aside>
  )
}
