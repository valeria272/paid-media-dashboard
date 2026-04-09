import { Alert } from '@/lib/types'

const SEVERITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Critica' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: 'Advertencia' },
  opportunity: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Oportunidad' },
}

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Sin alertas activas
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map(alert => {
        const style = SEVERITY_STYLES[alert.severity]
        return (
          <div key={alert.id} className={`${style.bg} border rounded-lg p-4`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold uppercase ${style.text}`}>
                {style.label}
              </span>
              <span className="text-xs text-gray-400">
                {new Date(alert.detectedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className={`text-sm font-medium ${style.text}`}>
              {alert.platform} — {alert.campaignName}
            </p>
            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
          </div>
        )
      })}
    </div>
  )
}
