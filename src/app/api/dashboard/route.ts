import { NextRequest, NextResponse } from 'next/server'
import { fetchGoogleAds } from '@/lib/fetchers/googleAds'
import { fetchMetaAds } from '@/lib/fetchers/metaAds'
import { detectAlerts } from '@/lib/alerts/detectAlerts'
import { buildSummary } from '@/lib/mock/dashboardMock'
import { sendAlertBatchToSlack } from '@/lib/slack/sendAlert'
import { getMonthRange, calcVariation } from '@/lib/dates'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const customStart = searchParams.get('start')
  const customEnd = searchParams.get('end')

  // Si hay fechas custom, calcular periodo anterior del mismo largo
  let currentStart: string, currentEnd: string, prevStart: string, prevEnd: string
  let currentLabel: string, previousLabel: string, currentDays: number

  if (customStart && customEnd) {
    currentStart = customStart
    currentEnd = customEnd
    const startDate = new Date(customStart)
    const endDate = new Date(customEnd)
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    currentDays = daysDiff

    // Periodo anterior: misma cantidad de dias antes
    const prevEndDate = new Date(startDate)
    prevEndDate.setDate(prevEndDate.getDate() - 1)
    const prevStartDate = new Date(prevEndDate)
    prevStartDate.setDate(prevStartDate.getDate() - daysDiff + 1)

    prevStart = prevStartDate.toISOString().split('T')[0]
    prevEnd = prevEndDate.toISOString().split('T')[0]
    currentLabel = `${customStart} a ${customEnd}`
    previousLabel = `${prevStart} a ${prevEnd}`
  } else {
    const range = getMonthRange()
    currentStart = range.current.start
    currentEnd = range.current.end
    prevStart = range.previous.start
    prevEnd = range.previous.end
    currentLabel = range.current.label
    previousLabel = range.previous.label
    currentDays = range.current.days
  }

  const [googleCurrent, metaCurrent, googlePrev, metaPrev] = await Promise.allSettled([
    fetchGoogleAds(currentStart, currentEnd),
    fetchMetaAds(currentStart, currentEnd),
    fetchGoogleAds(prevStart, prevEnd),
    fetchMetaAds(prevStart, prevEnd),
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

  const spendHistory = await generateDailySpend(currentStart, currentEnd)

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
    comparison: {
      period: {
        current: { start: currentStart, end: currentEnd, label: currentLabel, days: currentDays },
        previous: { start: prevStart, end: prevEnd, label: previousLabel },
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
      SELECT segments.date, metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
        AND campaign.status = 'ENABLED'
    `)

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
