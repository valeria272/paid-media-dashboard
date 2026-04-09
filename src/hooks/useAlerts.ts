import useSWR from 'swr'
import { Alert } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAlerts() {
  const { data } = useSWR('/api/alerts', fetcher, {
    refreshInterval: 300000, // cada 5 minutos
    revalidateOnFocus: true,
  })

  const alerts: Alert[] = data?.alerts || []

  return {
    alerts,
    criticalCount: alerts.filter(a => a.severity === 'critical').length,
    warningCount: alerts.filter(a => a.severity === 'warning').length,
    opportunityCount: alerts.filter(a => a.severity === 'opportunity').length,
  }
}
