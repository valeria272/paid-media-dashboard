'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { Sidebar } from '@/components/layout/Sidebar'
import { formatCLP, formatPercent } from '@/lib/format/currency'
import type { PacingStatusRow } from '@/app/api/pacing/status/route'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CHANNEL_TAG: Record<string, string> = {
  'Google Ads': 'bg-blue-100 text-blue-700',
  'Meta Ads':   'bg-indigo-100 text-indigo-700',
  'Tik Tok Ads': 'bg-pink-100 text-pink-700',
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100)
  const color =
    percent > 100 ? 'bg-red-500' :
    percent > 90  ? 'bg-yellow-400' :
    percent > 60  ? 'bg-green-500' :
    'bg-green-400'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function ProjectionCell({ row }: { row: PacingStatusRow }) {
  if (row.approvedBudget === 0) {
    return <span className="text-xs text-gray-400">Sin presupuesto</span>
  }
  if (row.status === 'inactive') {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Sin actividad
      </span>
    )
  }
  if (row.accumulatedSpend === 0) {
    return <span className="text-xs text-gray-300">—</span>
  }
  if (row.status === 'critical') {
    return (
      <div className="text-right space-y-1">
        <div className="text-sm font-medium text-red-600 tabular-nums">{formatCLP(row.projectedSpend)}</div>
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Excede en {formatCLP(row.overspendAmount)}
        </span>
      </div>
    )
  }
  if (row.status === 'warning') {
    return (
      <div className="text-right space-y-1">
        <div className="text-sm font-medium text-yellow-600 tabular-nums">{formatCLP(row.projectedSpend)}</div>
        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          Cerca del límite
        </span>
      </div>
    )
  }
  return (
    <div className="text-right">
      <div className="text-sm text-gray-500 tabular-nums">{formatCLP(row.projectedSpend)}</div>
    </div>
  )
}

export default function PacingPage() {
  const { data, isLoading, mutate } = useSWR('/api/pacing/status', fetcher, {
    refreshInterval: 300_000,
  })

  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ success: boolean; message: string } | null>(null)

  const triggerRun = useCallback(async () => {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await fetch('/api/pacing', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setRunResult({
          success: true,
          message: `${json.summary?.updated ?? 0} cuentas actualizadas`,
        })
        mutate()
      } else {
        setRunResult({ success: false, message: json.reason ?? 'Error desconocido' })
      }
    } catch {
      setRunResult({ success: false, message: 'Error al conectar' })
    } finally {
      setRunning(false)
    }
  }, [mutate])

  const rows: PacingStatusRow[] = data?.rows ?? []
  const totals = data?.totals
  const period = data?.period
  const clients = Array.from(new Set(rows.map(r => r.clientName))).sort()

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </main>
      </div>
    )
  }

  const percentUsedTotal = totals?.totalBudget > 0
    ? (totals.totalAccumulated / totals.totalBudget) * 100
    : 0

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Tracking de costos campañas
                {period && (
                  <span className="text-gray-400 font-normal text-xl ml-2">
                    — {new Date(period.date + 'T12:00:00').toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
                  </span>
                )}
              </h1>
              {period && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Día {period.day} de {period.daysInMonth}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={triggerRun}
                disabled={running}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {running ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Corriendo…
                  </>
                ) : 'Actualizar gasto'}
              </button>
              {runResult && (
                <p className={`text-xs ${runResult.success ? 'text-green-600' : 'text-red-500'}`}>
                  {runResult.success ? '✓' : '✗'} {runResult.message}
                </p>
              )}
            </div>
          </div>

          {/* Alertas */}
          {totals && (totals.criticalCount > 0 || totals.warningCount > 0 || totals.inactiveCount > 0) && (
            <div className="flex flex-wrap gap-3 mb-5">
              {totals.criticalCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  {totals.criticalCount} {totals.criticalCount === 1 ? 'cuenta sobrepasa' : 'cuentas sobrepasan'} el presupuesto
                </div>
              )}
              {totals.warningCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
                  {totals.warningCount} {totals.warningCount === 1 ? 'cuenta en alerta' : 'cuentas en alerta'} (&gt;90%)
                </div>
              )}
              {totals.inactiveCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                  {totals.inactiveCount} {totals.inactiveCount === 1 ? 'cuenta sin actividad' : 'cuentas sin actividad'} este mes
                </div>
              )}
            </div>
          )}

          {/* Resumen */}
          {totals && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Presupuesto aprobado</p>
                <p className="text-xl font-bold text-gray-900">{formatCLP(totals.totalBudget)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{rows.length} líneas activas</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Gasto acumulado</p>
                <p className="text-xl font-bold text-gray-900">{formatCLP(totals.totalAccumulated)}</p>
                <div className="mt-2">
                  <ProgressBar percent={percentUsedTotal} />
                  <p className="text-xs text-gray-400 mt-1">{formatPercent(percentUsedTotal, 0)} del presupuesto</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-500 mb-1">Proyección al cierre</p>
                <p className={`text-xl font-bold ${totals.totalProjected > totals.totalBudget ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCLP(totals.totalProjected)}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {totals.totalProjected > totals.totalBudget
                    ? `Excede en ${formatCLP(totals.totalProjected - totals.totalBudget)}`
                    : 'Dentro del presupuesto'}
                </p>
              </div>
            </div>
          )}

          {/* Tabla */}
          {rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              No hay datos de pacing para el mes actual
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 w-40">Cliente</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Canal</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Presupuesto</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Gasto acumulado</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 w-40">% del mes</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Proyección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map(clientName => {
                    const clientRows = rows.filter(r => r.clientName === clientName)
                    return clientRows.map((row, idx) => (
                      <tr key={`${clientName}-${row.channel}`} className={`transition-colors ${row.status === 'inactive' ? 'bg-gray-50/60' : 'hover:bg-gray-50'}`}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {idx === 0 ? clientName : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${CHANNEL_TAG[row.channel] ?? 'bg-gray-100 text-gray-600'}`}>
                            {row.channel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                          {formatCLP(row.approvedBudget)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={`font-medium ${row.accumulatedSpend === 0 ? 'text-gray-300' : 'text-gray-900'}`}>
                            {row.accumulatedSpend === 0 ? 'Sin datos' : formatCLP(row.accumulatedSpend)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.accumulatedSpend > 0 ? (
                            <div className="space-y-1">
                              <ProgressBar percent={row.percentUsed} />
                              <p className="text-xs text-gray-500">{formatPercent(row.percentUsed, 0)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <ProjectionCell row={row} />
                        </td>
                      </tr>
                    ))
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4 text-right">
            Proyección basada en promedio diario al día {period?.day}/{period?.daysInMonth}
          </p>
        </div>
      </main>
    </div>
  )
}
