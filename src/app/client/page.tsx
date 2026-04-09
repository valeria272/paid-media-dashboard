'use client'

import { useState } from 'react'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useAnalytics } from '@/hooks/useAnalytics'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import { DateRangePicker } from '@/components/layout/DateRangePicker'
import { formatCLP, formatPercent, formatNumber, formatVariation } from '@/lib/format/currency'
import { SpendChart } from '@/components/charts/SpendChart'
import { PLATFORM_LABELS } from '@/config/platforms'

export default function ClientDashboard() {
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string; label?: string }>({})
  const { data, isLoading, lastUpdated } = useDashboardData(dateRange.start, dateRange.end)
  const { web, webVariations, conversionPages } = useAnalytics()

  const handleDateChange = (start: string, end: string, label: string) => {
    setDateRange({ start, end, label })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Cargando reporte...</div>
      </div>
    )
  }

  const period = data?.comparison?.period
  const vars = data?.comparison?.variations

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reporte de Campanas</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Grupo CopyLab — {dateRange.label || period?.current?.label || 'Mes actual'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LiveIndicator lastUpdated={lastUpdated} />
              <DateRangePicker onRangeChange={handleDateChange} />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* KPIs Paid Media */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Kpi label="Inversion" value={formatCLP(data?.totalSpend || 0)} variation={vars?.spend} />
          <Kpi label="Impresiones" value={formatNumber(data?.totalImpressions || 0)} variation={vars?.impressions} />
          <Kpi label="Clics" value={formatNumber(data?.totalClicks || 0)} variation={vars?.clicks} />
          <Kpi label="CTR" value={formatPercent(data?.avgCtr || 0)} variation={vars?.ctr} />
          <Kpi label="Conversiones" value={String(data?.totalConversions || 0)} variation={vars?.conversions} />
          <Kpi label="Costo/Lead" value={data?.totalConversions > 0 ? formatCLP(data.avgCpa) : '-'} variation={vars?.cpa} inverted />
        </div>

        {/* Grafico */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Inversion diaria</h2>
          <SpendChart data={data?.spendHistory || []} />
        </div>

        {/* Web Analytics */}
        {web && (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Sitio Web — Visitas y Conversiones</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MiniKpi label="Sesiones" value={formatNumber(web.sessions)} variation={webVariations?.sessions} />
              <MiniKpi label="Usuarios" value={formatNumber(web.users)} variation={webVariations?.users} />
              <MiniKpi label="Pageviews" value={formatNumber(web.pageviews)} variation={webVariations?.pageviews} />
              <MiniKpi label="Conversiones" value={String(web.conversions)} variation={webVariations?.conversions} />
              <MiniKpi label="Bounce Rate" value={formatPercent(web.bounceRate * 100, 1)} variation={webVariations?.bounceRate} inverted />
            </div>
            {conversionPages.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-2">Forms enviados (pagina /gracias)</p>
                {conversionPages.map((p: any) => (
                  <div key={p.page} className="flex justify-between items-center text-sm py-1.5 border-b border-gray-50 last:border-0">
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

        {/* Plataformas */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Por plataforma</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left py-3 pr-4 font-medium">Plataforma</th>
                  <th className="text-right py-3 px-3 font-medium">Inversion</th>
                  <th className="text-right py-3 px-3 font-medium">Impresiones</th>
                  <th className="text-right py-3 px-3 font-medium">Clics</th>
                  <th className="text-right py-3 px-3 font-medium">CTR</th>
                  <th className="text-right py-3 px-3 font-medium">Conv.</th>
                  <th className="text-right py-3 pl-3 font-medium">Costo/Lead</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data?.byPlatform || {}).map(([platform, m]: [string, any]) => (
                  <tr key={platform} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-medium">{PLATFORM_LABELS[platform] || platform}</td>
                    <td className="text-right py-3 px-3">{formatCLP(m.spend)}</td>
                    <td className="text-right py-3 px-3">{formatNumber(m.impressions)}</td>
                    <td className="text-right py-3 px-3">{formatNumber(m.clicks)}</td>
                    <td className="text-right py-3 px-3">{formatPercent(m.ctr)}</td>
                    <td className="text-right py-3 px-3">{m.conversions}</td>
                    <td className="text-right py-3 pl-3">{m.conversions > 0 ? formatCLP(m.cpa) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campanas */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Detalle por campana</h2>
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
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
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

        {/* Recap */}
        {data && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100 mb-6">
            <h2 className="text-sm font-semibold text-indigo-900 mb-4">Recap del periodo</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-indigo-600 font-medium">Inversion total</p>
                <p className="text-2xl font-bold text-indigo-900">{formatCLP(data.totalSpend)}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-600 font-medium">Conversiones totales</p>
                <p className="text-2xl font-bold text-indigo-900">{data.totalConversions}</p>
              </div>
              <div>
                <p className="text-xs text-indigo-600 font-medium">Costo promedio/Lead</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {data.totalConversions > 0 ? formatCLP(data.avgCpa) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-indigo-600 font-medium">Dias del periodo</p>
                <p className="text-2xl font-bold text-indigo-900">{period?.current?.days || '-'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-8 text-xs text-gray-400">
          Grupo CopyLab — Datos actualizados automaticamente cada 5 minutos
        </div>
      </main>
    </div>
  )
}

function Kpi({ label, value, variation, inverted }: {
  label: string; value: string; variation?: number | null; inverted?: boolean
}) {
  const hasVar = variation !== null && variation !== undefined
  const isPositive = inverted ? variation! <= 0 : variation! >= 0

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {hasVar && (
        <p className={`text-xs font-medium mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {variation! >= 0 ? '↑' : '↓'} {formatVariation(Math.abs(variation!))} vs anterior
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
