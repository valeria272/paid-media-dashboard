'use client'

import { useDashboardData } from '@/hooks/useDashboardData'
import { useAlerts } from '@/hooks/useAlerts'
import { useApprovals } from '@/hooks/useApprovals'
import { useAnalytics } from '@/hooks/useAnalytics'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import { Sidebar } from '@/components/layout/Sidebar'
import { AlertBanner } from '@/components/alerts/AlertBanner'
import { AlertList } from '@/components/alerts/AlertList'
import { KpiCardGrid } from '@/components/metrics/KpiCardGrid'
import { PlatformTable } from '@/components/metrics/PlatformTable'
import { SpendChart } from '@/components/charts/SpendChart'
import { formatNumber, formatPercent, formatVariation } from '@/lib/format/currency'

export default function DashboardPage() {
  const { data, isLoading, lastUpdated } = useDashboardData()
  const { alerts, criticalCount } = useAlerts()
  const { pendingCount } = useApprovals()
  const { web, webVariations, conversionPages } = useAnalytics()

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const period = data?.comparison?.period

  return (
    <div className="flex min-h-screen">
      <Sidebar criticalAlerts={criticalCount} pendingApprovals={pendingCount} />

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dashboard Paid Media</h1>
              {period && (
                <p className="text-sm text-gray-500 mt-1">
                  {period.current.label} (1 al {period.current.days}) vs {period.previous.label}
                </p>
              )}
            </div>
            <LiveIndicator lastUpdated={lastUpdated} />
          </div>

          {data?.alerts && <AlertBanner alerts={data.alerts} />}

          <KpiCardGrid summary={data} comparison={data?.comparison} />

          {/* Web Analytics — copywriters.cl */}
          {web && (
            <div className="mt-6 bg-white rounded-xl p-5 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Web — copywriters.cl + asesorias.copywriters.cl
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <WebKpi label="Sesiones" value={web.sessions} variation={webVariations?.sessions} />
                <WebKpi label="Usuarios" value={web.users} variation={webVariations?.users} />
                <WebKpi label="Pageviews" value={web.pageviews} variation={webVariations?.pageviews} />
                <WebKpi label="Conversiones web" value={web.conversions} variation={webVariations?.conversions} />
                <WebKpi label="Bounce Rate" value={web.bounceRate * 100} variation={webVariations?.bounceRate} isPercent inverted />
              </div>
              {conversionPages.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-2">Paginas de conversion (/gracias)</p>
                  {conversionPages.map((p: any) => (
                    <div key={p.page} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">{p.page}</span>
                      <span className="font-medium">{p.sessions} visitas — {p.conversions} conversiones</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Inversion diaria — mes actual</h2>
              <SpendChart data={data?.spendHistory || []} />
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Alertas ({alerts.length})
              </h2>
              <AlertList alerts={alerts.slice(0, 5)} />
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl p-5 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Por plataforma — mes actual</h2>
            <PlatformTable data={data?.byPlatform || {}} />
          </div>
        </div>
      </main>
    </div>
  )
}

function WebKpi({ label, value, variation, isPercent, inverted }: {
  label: string; value: number; variation?: number | null; isPercent?: boolean; inverted?: boolean
}) {
  const display = isPercent ? formatPercent(value, 1) : formatNumber(value)
  const hasVar = variation !== null && variation !== undefined
  const isPositive = inverted ? variation! <= 0 : variation! >= 0

  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{display}</p>
      {hasVar && (
        <p className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {variation! >= 0 ? '↑' : '↓'} {formatVariation(Math.abs(variation!))}
        </p>
      )}
    </div>
  )
}
