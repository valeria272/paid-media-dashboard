import { formatCLP, formatPercent } from '@/lib/format/currency'
import { PLATFORM_LABELS } from '@/config/platforms'

export function PlatformTable({ data }: { data: Record<string, any> }) {
  if (!data || Object.keys(data).length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500">
            <th className="text-left py-3 pr-4 font-medium">Plataforma</th>
            <th className="text-right py-3 px-4 font-medium">Gasto</th>
            <th className="text-right py-3 px-4 font-medium">Presupuesto</th>
            <th className="text-right py-3 px-4 font-medium">Pacing</th>
            <th className="text-right py-3 px-4 font-medium">Clics</th>
            <th className="text-right py-3 px-4 font-medium">CTR</th>
            <th className="text-right py-3 px-4 font-medium">Conv.</th>
            <th className="text-right py-3 px-4 font-medium">CPA</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data).map(([platform, metrics]: [string, any]) => {
            const pacing = metrics.budget > 0 ? (metrics.spend / metrics.budget) * 100 : 0
            const pacingColor = pacing > 110 ? 'text-red-600' : pacing < 60 ? 'text-yellow-600' : 'text-green-600'
            return (
              <tr key={platform} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 pr-4 font-medium">{PLATFORM_LABELS[platform] || platform}</td>
                <td className="text-right py-3 px-4">{formatCLP(metrics.spend)}</td>
                <td className="text-right py-3 px-4 text-gray-400">{formatCLP(metrics.budget)}</td>
                <td className={`text-right py-3 px-4 font-medium ${pacingColor}`}>
                  {formatPercent(pacing, 0)}
                </td>
                <td className="text-right py-3 px-4">{metrics.clicks?.toLocaleString('es-CL')}</td>
                <td className="text-right py-3 px-4">{formatPercent(metrics.ctr)}</td>
                <td className="text-right py-3 px-4">{metrics.conversions}</td>
                <td className="text-right py-3 px-4">{formatCLP(metrics.cpa)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
