import { NextResponse } from 'next/server'
import { fetchGoogleAds } from '@/lib/fetchers/googleAds'
import { fetchMetaAds } from '@/lib/fetchers/metaAds'
import { detectAlerts } from '@/lib/alerts/detectAlerts'

export async function GET() {
  const [google, meta] = await Promise.allSettled([
    fetchGoogleAds(),
    fetchMetaAds(),
  ])

  const allCampaigns = [
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(meta.status === 'fulfilled' ? meta.value : []),
  ]

  // Solo campanas activas con datos reales
  const campaigns = allCampaigns.filter(
    c => c.status === 'active' && (c.impressions > 0 || c.spend > 0)
  )

  const periodDays = new Date().getDate() // dias del mes actual
  const alerts = detectAlerts(campaigns, periodDays)

  return NextResponse.json({
    alerts,
    total: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
    opportunity: alerts.filter(a => a.severity === 'opportunity').length,
    lastChecked: new Date().toISOString(),
  })
}

export const dynamic = 'force-dynamic'
