'use client'

import { useAsesoriasAnalytics } from '@/hooks/useAsesoriasAnalytics'
import { formatNumber, formatPercent, formatVariation } from '@/lib/format/currency'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { HeatmapCell, AsesoriasEvent, WebMetricsByDay } from '@/lib/fetchers/analytics'

// ═══ Heatmap ═══

// GA4: dayOfWeek 0=Domingo, 1=Lunes ... 6=Sábado
// Mostramos Lunes primero → índice en DAY_ORDER
const DAY_DISPLAY = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const HOUR_BUCKETS = ['00-03', '03-06', '06-09', '09-12', '12-15', '15-18', '18-21', '21-24']

function getHeatColor(intensity: number): string {
  if (intensity === 0) return '#f9fafb'
  // indigo-50 (#eef2ff) → indigo-600 (#4f46e5)
  const r = Math.round(238 + intensity * (79 - 238))
  const g = Math.round(242 + intensity * (70 - 242))
  const b = Math.round(255 + intensity * (229 - 255))
  return `rgb(${r}, ${g}, ${b})`
}

function TrafficHeatmap({ data }: { data: HeatmapCell[] }) {
  // Agrupar en buckets de 3h
  const grouped = new Map<string, number>()
  for (const cell of data) {
    const bucket = Math.floor(cell.hour / 3)
    const key = `${cell.day}-${bucket}`
    grouped.set(key, (grouped.get(key) || 0) + cell.sessions)
  }
  const maxVal = Math.max(...Array.from(grouped.values()), 1)

  if (data.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-4 text-center">Sin datos de tráfico por hora aún</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[480px]">
        {/* Encabezados de hora */}
        <div className="flex gap-1 mb-1 ml-10">
          {HOUR_BUCKETS.map(h => (
            <div key={h} className="flex-1 text-center text-[10px] text-gray-400">{h}</div>
          ))}
        </div>

        {/* Filas por día */}
        {DAY_ORDER.map((dayNum, i) => (
          <div key={dayNum} className="flex items-center gap-1 mb-1">
            <div className="w-10 shrink-0 text-xs text-gray-500 text-right pr-2">
              {DAY_DISPLAY[i]}
            </div>
            {Array.from({ length: 8 }, (_, bucket) => {
              const sessions = grouped.get(`${dayNum}-${bucket}`) || 0
              const intensity = sessions / maxVal
              return (
                <div
                  key={bucket}
                  className="flex-1 h-7 rounded cursor-default transition-opacity hover:opacity-80"
                  style={{ backgroundColor: getHeatColor(intensity) }}
                  title={`${DAY_DISPLAY[i]} ${HOUR_BUCKETS[bucket]}: ${sessions} sesiones`}
                />
              )
            })}
          </div>
        ))}

        {/* Leyenda */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-gray-400">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <div
              key={v}
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: getHeatColor(v) }}
            />
          ))}
          <span className="text-[10px] text-gray-400">Más</span>
        </div>
      </div>
    </div>
  )
}

// ═══ Gráfico de evolución ═══

function fmtDate(d: string): string {
  const parts = d.split('-')
  const months = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(parts[2])} ${months[parseInt(parts[1])]}`
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg p-3 text-sm">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium text-xs">
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  )
}

function TrafficChart({ data }: { data: WebMetricsByDay[] }) {
  if (!data || data.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-8 text-center">Sin datos de evolución aún</p>
    )
  }

  const chartData = data.map(d => ({
    date: fmtDate(d.date),
    Sesiones: d.sessions,
    Conversiones: d.conversions,
  }))

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="sessionsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="convGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="Sesiones"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#sessionsGrad)"
        />
        <Area
          type="monotone"
          dataKey="Conversiones"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#convGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ═══ Tabla de interacciones ═══

function fmtEventName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function EventsTable({ events }: { events: AsesoriasEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-4 text-center">Sin datos de eventos aún</p>
    )
  }

  const maxCount = Math.max(...events.map(e => e.eventCount), 1)

  return (
    <div className="space-y-2">
      {events.slice(0, 10).map(e => (
        <div key={e.eventName}>
          <div className="flex justify-between items-center text-xs mb-0.5">
            <span className="text-gray-700 font-medium truncate max-w-[140px]" title={fmtEventName(e.eventName)}>
              {fmtEventName(e.eventName)}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-gray-400">{formatNumber(e.users)} u.</span>
              <span className="text-indigo-600 font-semibold">{formatNumber(e.eventCount)}</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div
              className="h-1 rounded-full bg-indigo-400 transition-all"
              style={{ width: `${(e.eventCount / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══ KPI mini card ═══

function Kpi({
  label,
  value,
  variation,
  inverted,
}: {
  label: string
  value: string
  variation?: number | null
  inverted?: boolean
}) {
  const hasVar = variation !== null && variation !== undefined
  const isPositive = inverted ? (variation ?? 0) <= 0 : (variation ?? 0) >= 0

  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {hasVar && (
        <p className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {(variation ?? 0) >= 0 ? '↑' : '↓'} {formatVariation(Math.abs(variation ?? 0))}
        </p>
      )}
    </div>
  )
}

// ═══ Componente principal ═══

export function AsesoriasAnalytics() {
  const { current, variations, daily, events, heatmap, isLoading } = useAsesoriasAnalytics()

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-44 bg-gray-100 rounded-xl" />
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-base">📊</span>
        <h2 className="text-sm font-semibold text-gray-700">Asesorías — asesorias.copywriters.cl</h2>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi
          label="Sesiones"
          value={formatNumber(current.sessions)}
          variation={variations?.sessions}
        />
        <Kpi
          label="Usuarios"
          value={formatNumber(current.users)}
          variation={variations?.users}
        />
        <Kpi
          label="Conversiones"
          value={String(current.conversions)}
          variation={variations?.conversions}
        />
        <Kpi
          label="Bounce Rate"
          value={formatPercent(current.bounceRate * 100, 1)}
          variation={variations?.bounceRate}
          inverted
        />
      </div>

      {/* Evolución + Interacciones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold text-gray-600 mb-3">Evolución de tráfico</p>
          <TrafficChart data={daily} />
          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-indigo-500 rounded" />
              <span className="text-[10px] text-gray-400">Sesiones</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" />
              <span className="text-[10px] text-gray-400">Conversiones</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-3">Interacciones</p>
          <EventsTable events={events} />
        </div>
      </div>

      {/* Mapa de calor */}
      <div className="border-t border-gray-100 pt-5">
        <p className="text-xs font-semibold text-gray-600 mb-3">
          Mapa de calor — tráfico por día y hora
        </p>
        <TrafficHeatmap data={heatmap} />
      </div>
    </div>
  )
}
