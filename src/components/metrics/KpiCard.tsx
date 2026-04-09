import { formatCLP, formatPercent } from '@/lib/format/currency'
import { TrendBadge } from './TrendBadge'

interface KpiCardProps {
  label: string
  value: number
  type: 'currency' | 'percent' | 'number'
  previousValue?: number
  objective?: number
  invertedTrend?: boolean // true para CPA/CPM donde bajar es bueno
}

export function KpiCard({ label, value, type, previousValue, objective, invertedTrend }: KpiCardProps) {
  const formattedValue =
    type === 'currency' ? formatCLP(value) :
    type === 'percent' ? formatPercent(value) :
    value.toLocaleString('es-CL')

  const variation = previousValue
    ? ((value - previousValue) / previousValue) * 100
    : null

  const vsObjective = objective
    ? ((value - objective) / objective) * 100
    : null

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{formattedValue}</p>
      <div className="flex gap-3 mt-2 flex-wrap">
        {variation !== null && (
          <TrendBadge value={variation} label="vs ayer" inverted={invertedTrend} />
        )}
        {vsObjective !== null && (
          <TrendBadge value={vsObjective} label="vs objetivo" inverted={invertedTrend} />
        )}
      </div>
    </div>
  )
}
