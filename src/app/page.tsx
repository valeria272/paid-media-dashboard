'use client'

import { useDashboardData } from '@/hooks/useDashboardData'
import { useAlerts } from '@/hooks/useAlerts'
import { useApprovals } from '@/hooks/useApprovals'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import { Sidebar } from '@/components/layout/Sidebar'
import { AlertBanner } from '@/components/alerts/AlertBanner'
import { AlertList } from '@/components/alerts/AlertList'
import { KpiCardGrid } from '@/components/metrics/KpiCardGrid'
import { PlatformTable } from '@/components/metrics/PlatformTable'
import { SpendChart } from '@/components/charts/SpendChart'

export default function DashboardPage() {
  const { data, isLoading, lastUpdated } = useDashboardData()
  const { alerts, criticalCount } = useAlerts()
  const { pendingCount } = useApprovals()

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
          {/* Header con periodo */}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
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
