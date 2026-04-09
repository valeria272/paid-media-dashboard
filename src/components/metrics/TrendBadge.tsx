import { formatVariation } from '@/lib/format/currency'

interface TrendBadgeProps {
  value: number
  label?: string
  inverted?: boolean // para métricas donde bajar es bueno (CPA, CPM)
}

export function TrendBadge({ value, label, inverted = false }: TrendBadgeProps) {
  const isPositive = inverted ? value <= 0 : value >= 0
  const colorClass = isPositive
    ? 'text-green-600 bg-green-50'
    : 'text-red-600 bg-red-50'
  const arrow = value >= 0 ? '↑' : '↓'

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorClass}`}>
      {arrow} {formatVariation(Math.abs(value))} {label}
    </span>
  )
}
