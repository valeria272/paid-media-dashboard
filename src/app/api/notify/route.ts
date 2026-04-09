import { NextRequest, NextResponse } from 'next/server'
import { fetchGoogleAds } from '@/lib/fetchers/googleAds'
import { fetchMetaAds } from '@/lib/fetchers/metaAds'
import { fetchBudgets, detectBudgetAlerts } from '@/lib/fetchers/budgetSheet'
import { fetchGA4Metrics } from '@/lib/fetchers/analytics'
import { detectAlerts } from '@/lib/alerts/detectAlerts'
import { getMonthRange } from '@/lib/dates'
import {
  sendPerformanceAlerts,
  sendBudgetAlerts,
  sendOptimizationSuggestions,
  sendWeeklyRecap,
  sendCampaignError,
} from '@/lib/slack/notifications'

// POST /api/notify — Dispara notificaciones a Slack
// Body: { type: "alerts" | "budget" | "optimizations" | "recap" | "all" }
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const type = body.type || 'all'

  const range = getMonthRange()
  const currentDays = range.current.days
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()

  // Fetch datos
  const [googleResult, metaResult] = await Promise.allSettled([
    fetchGoogleAds(range.current.start, range.current.end),
    fetchMetaAds(range.current.start, range.current.end),
  ])

  const allCampaigns = [
    ...(googleResult.status === 'fulfilled' ? googleResult.value : []),
    ...(metaResult.status === 'fulfilled' ? metaResult.value : []),
  ].filter(c => c.impressions > 0 || c.spend > 0)

  const campaigns = allCampaigns.filter(c => c.status === 'active')

  // Errores de plataforma → notificar
  if (googleResult.status === 'rejected') {
    await sendCampaignError('Google Ads', String(googleResult.reason))
  }
  if (metaResult.status === 'rejected') {
    await sendCampaignError('Meta Ads', String(metaResult.reason))
  }

  const results: Record<string, boolean> = {}

  // 1. Alertas de performance
  if (type === 'alerts' || type === 'all') {
    const alerts = detectAlerts(campaigns, currentDays)
    if (alerts.length > 0) {
      results.performance = await sendPerformanceAlerts(alerts)
    }
  }

  // 2. Alertas de presupuesto
  if (type === 'budget' || type === 'all') {
    const budgets = await fetchBudgets()
    const budgetAlerts = detectBudgetAlerts(campaigns, budgets, currentDays, daysInMonth, allCampaigns)
    if (budgetAlerts.length > 0) {
      results.budget = await sendBudgetAlerts(budgetAlerts)
    }
  }

  // 3. Sugerencias de optimizacion
  if (type === 'optimizations' || type === 'all') {
    results.optimizations = await sendOptimizationSuggestions(campaigns, currentDays)
  }

  // 4. Recap semanal
  if (type === 'recap') {
    const budgets = await fetchBudgets()
    let webMetrics = null
    const propertyId = process.env.GA4_PROPERTY_ID
    if (propertyId) {
      try {
        const ga4 = await fetchGA4Metrics(propertyId, range.current.start, range.current.end)
        webMetrics = { sessions: ga4.sessions, conversions: ga4.conversions }
      } catch { /* skip */ }
    }
    results.recap = await sendWeeklyRecap(campaigns, budgets, webMetrics, currentDays)
  }

  return NextResponse.json({
    success: true,
    type,
    results,
    campaignsAnalyzed: campaigns.length,
    timestamp: new Date().toISOString(),
  })
}

export const dynamic = 'force-dynamic'
