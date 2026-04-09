'use client'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCLP } from '@/lib/format/currency'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-lg p-3 text-sm">
      <p className="text-gray-500 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {formatCLP(entry.value)}
        </p>
      ))}
    </div>
  )
}

interface SpendChartProps {
  data: Array<{ date: string; spend: number; budget: number }>
}

export function SpendChart({ data }: SpendChartProps) {
  if (!data || data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v) => formatCLP(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="budget" stroke="#e5e7eb" strokeWidth={1} fill="none" strokeDasharray="4 4" name="Presupuesto" />
        <Area type="monotone" dataKey="spend" stroke="#6366f1" strokeWidth={2} fill="url(#spendGradient)" name="Gasto" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
