import { NextResponse } from 'next/server'
import { fetchGoogleAds } from '@/lib/fetchers/googleAds'
import { fetchMetaAds } from '@/lib/fetchers/metaAds'
import { detectAlerts } from '@/lib/alerts/detectAlerts'
import { buildSummary } from '@/lib/mock/dashboardMock'
import { sendAlertBatchToSlack } from '@/lib/slack/sendAlert'
import { getMonthRange, calcVariation } from '@/lib/dates'

export async function GET() {
  const range = getMonthRange()

  // Fetch mes actual y mes anterior en paralelo
  const [googleCurrent, metaCurrent, googlePrev, metaPrev] = await Promise.allSettled([
    fetchGoogleAds(range.current.start, range.current.end),
    fetchMetaAds(range.current.start, range.current.end),
    fetchGoogleAds(range.previous.start, range.previous.end),
    fetchMetaAds(range.previous.start, range.previous.end),
  ])

  const currentCampaigns = [
    ...(googleCurrent.status === 'fulfilled' ? googleCurrent.value : []),
    ...(metaCurrent.status === 'fulfilled' ? metaCurrent.value : []),
  ].filter(c => c.status === 'active' && (c.impressions > 0 || c.spend > 0))

  const prevCampaigns = [
    ...(googlePrev.status === 'fulfilled' ? googlePrev.value : []),
    ...(metaPrev.status === 'fulfilled' ? metaPrev.value : []),
  ].filter(c => c.impressions > 0 || c.spend > 0)

  const current = buildSummary(currentCampaigns)
  const previous = buildSummary(prevCampaigns)

  const alerts = detectAlerts(currentCampaigns)

  // Generar gasto diario del mes actual
  const spendHistory = await generateDailySpend(range.current.start, range.current.end)

  // Alertas criticas a Slack
  const criticalAlerts = alerts.filter(a => a.severity === 'critical')
  if (criticalAlerts.length > 0) {
    sendAlertBatchToSlack(criticalAlerts).catch(err =>
      console.error('[Slack] Error enviando alertas:', err)
    )
  }

  return NextResponse.json({
    ...current,
    campaigns: currentCampaigns,
    alerts,
    spendHistory,
    // Comparacion mes anterior
    comparison: {
      period: {
        current: range.current,
        previous: range.previous,
      },
      previous: {
        totalSpend: previous.totalSpend,
        totalImpressions: previous.totalImpressions,
        totalClicks: previous.totalClicks,
        totalConversions: previous.totalConversions,
        avgCtr: previous.avgCtr,
        avgCpa: previous.avgCpa,
      },
      variations: {
        spend: calcVariation(current.totalSpend, previous.totalSpend),
        impressions: calcVariation(current.totalImpressions, previous.totalImpressions),
        clicks: calcVariation(current.totalClicks, previous.totalClicks),
        conversions: calcVariation(current.totalConversions, previous.totalConversions),
        ctr: calcVariation(current.avgCtr, previous.avgCtr),
        cpa: calcVariation(current.avgCpa, previous.avgCpa),
      },
    },
    lastUpdated: new Date().toISOString(),
    errors: {
      google: googleCurrent.status === 'rejected' ? String(googleCurrent.reason) : null,
      meta: metaCurrent.status === 'rejected' ? String(metaCurrent.reason) : null,
    },
  })
}

// Generar datos diarios para el grafico de gasto
async function generateDailySpend(startDate: string, endDate: string) {
  try {
    const { GoogleAdsApi } = await import('google-ads-api')
    if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return []

    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    })

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    })

    const rows = await customer.query(`
      SELECT
        segments.date,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status = 'ENABLED'
    `)

    // Agregar gasto por dia
    const dailyMap: Record<string, number> = {}
    for (const row of rows as any[]) {
      const date = row.segments.date
      dailyMap[date] = (dailyMap[date] || 0) + Math.round(Number(row.metrics.cost_micros || 0) / 1_000_000)
    }

    return Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, spend]) => ({ date, spend, budget: 0 }))
  } catch {
    return []
  }
}

export const dynamic = 'force-dynamic'
