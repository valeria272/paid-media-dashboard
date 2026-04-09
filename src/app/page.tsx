'use client'

import { useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAlerts } from '@/hooks/useAlerts'
import { useApprovals } from '@/hooks/useApprovals'
import { useAnalytics } from '@/hooks/useAnalytics'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import { Sidebar } from '@/components/layout/Sidebar'
import { DateRangePicker } from '@/components/layout/DateRangePicker'
import { AlertBanner } from '@/components/alerts/AlertBanner'
import { AlertList } from '@/components/alerts/AlertList'
import { PlatformTable } from '@/components/metrics/PlatformTable'
import { SpendChart } from '@/components/charts/SpendChart'
import { formatCLP, formatPercent, formatNumber, formatVariation } from '@/lib/format/currency'

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string; label?: string }>({})
  const { data, isLoading, lastUpdated } = useDashboardData(dateRange.start, dateRange.end)
  const { alerts, criticalCount } = useAlerts()
  const { pendingCount } = useApprovals()
  const { web, webVariations, conversionPages } = useAnalytics()

  const handleDateChange = (start: string, end: string, label: string) => {
    setDateRange({ start, end, label })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const period = data?.comparison?.period
  const prev = data?.comparison?.previous
  const vars = data?.comparison?.variations

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar criticalAlerts={criticalCount} pendingApprovals={pendingCount} />

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Paid Media Pro</h1>
              {period && (
                <p className="text-sm text-gray-500 mt-1">
                  {dateRange.label || period.current.label} — comparado con periodo anterior
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <LiveIndicator lastUpdated={lastUpdated} />
              <DateRangePicker onRangeChange={handleDateChange} />
            </div>
          </div>

          {data?.alerts && <AlertBanner alerts={data.alerts} />}

          {/* KPI Cards principales */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <BigKpi label="Inversion" value={formatCLP(data?.totalSpend || 0)} variation={vars?.spend} icon="💰" />
            <BigKpi label="Impresiones" value={formatNumber(data?.totalImpressions || 0)} variation={vars?.impressions} icon="👁" />
            <BigKpi label="Clics" value={formatNumber(data?.totalClicks || 0)} variation={vars?.clicks} icon="🖱" />
            <BigKpi label="CTR" value={formatPercent(data?.avgCtr || 0)} variation={vars?.ctr} icon="📊" />
            <BigKpi label="Conversiones" value={String(data?.totalConversions || 0)} variation={vars?.conversions} icon="🎯" />
            <BigKpi label="Costo/Lead" value={data?.totalConversions > 0 ? formatCLP(data.avgCpa) : '-'} variation={vars?.cpa} inverted icon="💵" />
          </div>

          {/* Web Analytics */}
          {web && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">🌐</span>
                <h2 className="text-sm font-semibold text-gray-700">Sitio Web — copywriters.cl</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MiniKpi label="Sesiones" value={formatNumber(web.sessions)} variation={webVariations?.sessions} />
                <MiniKpi label="Usuarios" value={formatNumber(web.users)} variation={webVariations?.users} />
                <MiniKpi label="Pageviews" value={formatNumber(web.pageviews)} variation={webVariations?.pageviews} />
                <MiniKpi label="Conversiones" value={String(web.conversions)} variation={webVariations?.conversions} />
                <MiniKpi label="Bounce Rate" value={formatPercent(web.bounceRate * 100, 1)} variation={webVariations?.bounceRate} inverted />
              </div>
              {conversionPages.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 font-medium mb-2">Forms enviados (pagina /gracias)</p>
                  {conversionPages.map((p: any) => (
                    <div key={p.page} className="flex justify-between items-center text-sm py-1.5">
                      <span className="text-gray-600 font-mono text-xs">{p.page}</span>
                      <div>
                        <span className="text-gray-500">{p.sessions} visitas</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-indigo-600 font-semibold">{p.conversions} conv.</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Presupuestos aprobados vs gasto real */}
          {data?.budgets && data.budgets.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">💳</span>
                <h2 className="text-sm font-semibold text-gray-700">Presupuesto aprobado vs gasto real</h2>
                <span className="text-xs text-gray-400 ml-auto">Fuente: Google Sheets</span>
              </div>
              <div className="space-y-4">
                {data.budgets.map((b: any, i: number) => {
                  const pct = b.monthlyBudget > 0 ? (b.currentSpend / b.monthlyBudget) * 100 : 0
                  const barColor = pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                  const dayOfMonth = new Date().getDate()
                  const projected = dayOfMonth > 0 ? Math.round((b.currentSpend / dayOfMonth) * daysInMonth) : 0
                  const projPct = b.monthlyBudget > 0 ? (projected / b.monthlyBudget) * 100 : 0

                  return (
                    <div key={i}>
                      <div className="flex justify-between items-center text-sm mb-1">
                        <div>
                          <span className="font-medium text-gray-900">{b.campaignName}</span>
                          <span className="text-gray-400 ml-2 text-xs">{b.channel}</span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-medium">{formatCLP(b.currentSpend)}</span>
                          <span className="text-gray-400"> / {formatCLP(b.monthlyBudget)}</span>
                          <span className={`ml-2 font-semibold ${pct > 100 ? 'text-red-600' : pct > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                        <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <p className="text-xs text-gray-400">
                        Proyeccion mes: {formatCLP(projected)}
                        {projPct > 105 && <span className="text-red-500 font-medium"> — supera presupuesto en {(projPct - 100).toFixed(0)}%</span>}
                        {projPct <= 105 && projPct > 0 && <span className="text-green-600"> — dentro del presupuesto</span>}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Budget alerts */}
              {data.budgetAlerts && data.budgetAlerts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {data.budgetAlerts.map((a: any, i: number) => (
                    <div key={i} className={`text-sm py-1.5 ${
                      a.severity === 'critical' ? 'text-red-700' : a.severity === 'warning' ? 'text-yellow-700' : 'text-green-700'
                    }`}>
                      {a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : '🟢'} {a.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grafico + Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Inversion diaria</h2>
              <SpendChart data={data?.spendHistory || []} />
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Alertas ({alerts.length})</h2>
              <AlertList alerts={alerts.slice(0, 5)} />
            </div>
          </div>

          {/* Tabla plataformas */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Rendimiento por plataforma</h2>
            <PlatformTable data={data?.byPlatform || {}} />
          </div>

          {/* Tabla campanas */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Campanas activas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-left py-3 pr-4 font-medium">Campana</th>
                    <th className="text-left py-3 px-3 font-medium">Plataforma</th>
                    <th className="text-right py-3 px-3 font-medium">Inversion</th>
                    <th className="text-right py-3 px-3 font-medium">Imp.</th>
                    <th className="text-right py-3 px-3 font-medium">Clics</th>
                    <th className="text-right py-3 px-3 font-medium">CTR</th>
                    <th className="text-right py-3 px-3 font-medium">Conv.</th>
                    <th className="text-right py-3 pl-3 font-medium">CPA</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.campaigns || []).map((c: any) => (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 pr-4 font-medium text-gray-900">{c.name}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.platform === 'google' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {c.platform === 'google' ? 'Google' : 'Meta'}
                        </span>
                      </td>
                      <td className="text-right py-3 px-3">{formatCLP(c.spend)}</td>
                      <td className="text-right py-3 px-3">{formatNumber(c.impressions)}</td>
                      <td className="text-right py-3 px-3">{formatNumber(c.clicks)}</td>
                      <td className="text-right py-3 px-3">{formatPercent(c.ctr)}</td>
                      <td className="text-right py-3 px-3 font-medium">{c.conversions}</td>
                      <td className="text-right py-3 pl-3">{c.conversions > 0 ? formatCLP(c.cpa) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function BigKpi({ label, value, variation, inverted, icon }: {
  label: string; value: string; variation?: number | null; inverted?: boolean; icon: string
}) {
  const hasVar = variation !== null && variation !== undefined
  const isPositive = inverted ? variation! <= 0 : variation! >= 0

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{icon}</span>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {hasVar && (
        <p className={`text-xs font-medium mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {variation! >= 0 ? '↑' : '↓'} {formatVariation(Math.abs(variation!))}
          <span className="text-gray-400 font-normal"> vs anterior</span>
        </p>
      )}
    </div>
  )
}

function MiniKpi({ label, value, variation, inverted }: {
  label: string; value: string; variation?: number | null; inverted?: boolean
}) {
  const hasVar = variation !== null && variation !== undefined
  const isPositive = inverted ? variation! <= 0 : variation! >= 0

  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {hasVar && (
        <p className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {variation! >= 0 ? '↑' : '↓'} {formatVariation(Math.abs(variation!))}
        </p>
      )}
    </div>
  )
}
