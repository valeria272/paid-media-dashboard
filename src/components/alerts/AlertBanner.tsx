import { Alert } from '@/lib/types'

export function AlertBanner({ alerts }: { alerts: Alert[] }) {
  const critical = alerts.filter(a => a.severity === 'critical')
  if (critical.length === 0) return null

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-600 font-semibold text-sm">
          {critical.length} alerta{critical.length > 1 ? 's' : ''} critica{critical.length > 1 ? 's' : ''}
        </span>
      </div>
      <ul className="space-y-2">
        {critical.map(alert => (
          <li key={alert.id} className="text-sm text-red-700">
            <span className="font-medium">{alert.platform} — {alert.campaignName}:</span>{' '}
            {alert.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
