'use client'

import { KpiCard } from './KpiCard'

interface KpiCardGridProps {
  summary: {
    totalSpend: number
    totalBudget: number
    totalImpressions: number
    totalClicks: number
    totalConversions: number
    avgCtr: number
    avgCpa: number
  } | null
  comparison?: {
    previous: {
      totalSpend: number
      totalImpressions: number
      totalClicks: number
      totalConversions: number
      avgCtr: number
      avgCpa: number
    }
  } | null
}

export function KpiCardGrid({ summary, comparison }: KpiCardGridProps) {
  if (!summary) return null

  const prev = comparison?.previous

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KpiCard
        label="Inversion"
        value={summary.totalSpend}
        type="currency"
        previousValue={prev?.totalSpend}
      />
      <KpiCard
        label="Impresiones"
        value={summary.totalImpressions}
        type="number"
        previousValue={prev?.totalImpressions}
      />
      <KpiCard
        label="Clics"
        value={summary.totalClicks}
        type="number"
        previousValue={prev?.totalClicks}
      />
      <KpiCard
        label="Conversiones"
        value={summary.totalConversions}
        type="number"
        previousValue={prev?.totalConversions}
      />
      <KpiCard
        label="CTR"
        value={summary.avgCtr}
        type="percent"
        previousValue={prev?.avgCtr}
      />
      <KpiCard
        label="Costo por Lead"
        value={summary.avgCpa}
        type="currency"
        previousValue={prev?.avgCpa}
        invertedTrend
      />
    </div>
  )
}
