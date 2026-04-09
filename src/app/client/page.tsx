'use client'

import { useDashboardData } from '@/hooks/useDashboardData'
import { LiveIndicator } from '@/components/layout/LiveIndicator'
import { formatCLP, formatPercent, formatNumber, formatVariation } from '@/lib/format/currency'
import { SpendChart } from '@/components/charts/SpendChart'
import { PLATFORM_LABELS } from '@/config/platforms'

export default function ClientDashboard() {
  const { data, isLoading, lastUpdated } = useDashboardData()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400 text-sm">Cargando reporte...</div>
      </div>
    )
  }

  const period = data?.comparison?.period
  const prev = data?.comparison?.previous
  const vars = data?.comparison?.variations

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header profesional */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reporte de Paid Media</h1>
              {period && (
                <p className="text-sm text-gray-500 mt-1">
                  {period.current.label} — del 1 al {period.current.days}
                  <span className="text-gray-400"> | Comparado con {period.previous.label}</span>
                </p>
              )}
            </div>
            <div className="text-right">
              <LiveIndicator lastUpdated={lastUpdated} />
              <p className="text-xs text-gray-400 mt-1">Actualizacion automatica cada 5 min</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* KPIs con comparacion */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <ClientKpi
            label="Inversion"
            value={formatCLP(data?.totalSpend || 0)}
            variation={vars?.spend}
          />
          <ClientKpi
            label="Impresiones"
            value={formatNumber(data?.totalImpressions || 0)}
            variation={vars?.impressions}
          />
          <ClientKpi
            label="Clics"
            value={formatNumber(data?.totalClicks || 0)}
            variation={vars?.clicks}
          />
          <ClientKpi
            label="CTR"
            value={formatPercent(data?.avgCtr || 0)}
            variation={vars?.ctr}
          />
          <ClientKpi
            label="Conversiones"
            value={String(data?.totalConversions || 0)}
            variation={vars?.conversions}
          />
          <ClientKpi
            label="Costo/Lead"
            value={data?.totalConversions > 0 ? formatCLP(data.avgCpa) : '-'}
            variation={vars?.cpa}
            inverted
          />
        </div>

        {/* Grafico inversion */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Inversion diaria</h2>
          <SpendChart data={data?.spendHistory || []} />
        </div>

        {/* Tabla plataformas */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Rendimiento por plataforma</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left py-3 pr-4 font-medium">Plataforma</th>
                  <th className="text-right py-3 px-4 font-medium">Inversion</th>
                  <th className="text-right py-3 px-4 font-medium">Impresiones</th>
                  <th className="text-right py-3 px-4 font-medium">Clics</th>
                  <th className="text-right py-3 px-4 font-medium">CTR</th>
                  <th className="text-right py-3 px-4 font-medium">Conversiones</th>
                  <th className="text-right py-3 px-4 font-medium">Costo/Lead</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data?.byPlatform || {}).map(([platform, m]: [string, any]) => (
                  <tr key={platform} className="border-b border-gray-50">
                    <td className="py-3 pr-4 font-medium">{PLATFORM_LABELS[platform] || platform}</td>
                    <td className="text-right py-3 px-4">{formatCLP(m.spend)}</td>
                    <td className="text-right py-3 px-4">{formatNumber(m.impressions)}</td>
                    <td className="text-right py-3 px-4">{formatNumber(m.clicks)}</td>
                    <td className="text-right py-3 px-4">{formatPercent(m.ctr)}</td>
                    <td className="text-right py-3 px-4">{m.conversions}</td>
                    <td className="text-right py-3 px-4">{m.conversions > 0 ? formatCLP(m.cpa) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle campanas */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Detalle por campana</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left py-3 pr-4 font-medium">Campana</th>
                  <th className="text-left py-3 px-4 font-medium">Plataforma</th>
                  <th className="text-right py-3 px-4 font-medium">Inversion</th>
                  <th className="text-right py-3 px-4 font-medium">Impresiones</th>
                  <th className="text-right py-3 px-4 font-medium">Clics</th>
                  <th className="text-right py-3 px-4 font-medium">CTR</th>
                  <th className="text-right py-3 px-4 font-medium">Conv.</th>
                  <th className="text-right py-3 px-4 font-medium">Costo/Lead</th>
                </tr>
              </thead>
              <tbody>
                {(data?.campaigns || []).map((c: any) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{c.name}</td>
                    <td className="py-3 px-4 text-gray-500">{PLATFORM_LABELS[c.platform] || c.platform}</td>
                    <td className="text-right py-3 px-4">{formatCLP(c.spend)}</td>
                    <td className="text-right py-3 px-4">{formatNumber(c.impressions)}</td>
                    <td className="text-right py-3 px-4">{formatNumber(c.clicks)}</td>
                    <td className="text-right py-3 px-4">{formatPercent(c.ctr)}</td>
                    <td className="text-right py-3 px-4">{c.conversions}</td>
                    <td className="text-right py-3 px-4">{c.conversions > 0 ? formatCLP(c.cpa) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recap mensual */}
        {data && (
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 mb-6">
            <h2 className="text-sm font-semibold text-indigo-900 mb-3">Recap del mes</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-indigo-600 font-medium">Inversion total</p>
                <p className="text-lg font-bold text-indigo-900">{formatCLP(data.totalSpend)}</p>
              </div>
              <div>
                <p className="text-indigo-600 font-medium">Conversiones</p>
                <p className="text-lg font-bold text-indigo-900">{data.totalConversions}</p>
              </div>
              <div>
                <p className="text-indigo-600 font-medium">Costo promedio/Lead</p>
                <p className="text-lg font-bold text-indigo-900">
                  {data.totalConversions > 0 ? formatCLP(data.avgCpa) : '-'}
                </p>
              </div>
              <div>
                <p className="text-indigo-600 font-medium">Dias activos</p>
                <p className="text-lg font-bold text-indigo-900">{period?.current.days || '-'}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-8 text-xs text-gray-400">
          Grupo CopyLab — Datos actualizados automaticamente
        </div>
      </main>
    </div>
  )
}

function ClientKpi({
  label, value, variation, inverted = false
}: {
  label: string; value: string; variation?: number | null; inverted?: boolean
}) {
  const hasVariation = variation !== null && variation !== undefined
  const isPositive = inverted ? variation! <= 0 : variation! >= 0

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      {hasVariation && (
        <p className={`text-xs font-medium mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {variation! >= 0 ? '↑' : '↓'} {formatVariation(Math.abs(variation!))} vs mes anterior
        </p>
      )}
    </div>
  )
}
