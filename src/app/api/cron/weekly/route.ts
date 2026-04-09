import { NextRequest, NextResponse } from 'next/server'
import { fetchGoogleAds } from '@/lib/fetchers/googleAds'
import { fetchMetaAds } from '@/lib/fetchers/metaAds'
import { fetchBudgets, detectBudgetAlerts } from '@/lib/fetchers/budgetSheet'
import { detectAlerts } from '@/lib/alerts/detectAlerts'
import {
  sendPerformanceAlerts,
  sendBudgetAlerts,
  sendOptimizationSuggestions,
} from '@/lib/slack/notifications'
import { sendClientRecapToSlack } from '@/lib/slack/clientRecap'
import { sendSlackMessage, slackHeader, slackSection, slackContext } from '@/lib/slack/slackClient'

// ═══ Cron semanal — 3 eventos ═══
// Martes 9:00 CLT  → type=optimization  (análisis + sugerencias)
// Jueves 8:00 CLT  → type=reminder      (¿se ejecutaron los cambios?)
// Jueves 10:00 CLT → type=client-recap  (recap formato cliente)

export async function GET(request: NextRequest) {
  // Verificar que viene de Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const type = request.nextUrl.searchParams.get('type') || 'optimization'

  if (type === 'reminder') {
    return handleReminder()
  }

  if (type === 'client-recap') {
    return handleClientRecap()
  }

  // Default: optimization (martes)
  return handleOptimization()
}

// ═══ MARTES: Análisis de optimización ═══
async function handleOptimization() {
  const { allCampaigns, activeCampaigns } = await fetchAllCampaigns()
  const now = new Date()
  const currentDays = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const alerts = detectAlerts(activeCampaigns, currentDays)
  const budgets = await fetchBudgets()
  const budgetAlerts = detectBudgetAlerts(activeCampaigns, budgets, currentDays, daysInMonth, allCampaigns)

  const results: Record<string, boolean> = {}

  // Enviar alertas de performance
  if (alerts.length > 0) {
    results.performance = await sendPerformanceAlerts(alerts)
  }

  // Enviar alertas de presupuesto
  if (budgetAlerts.length > 0) {
    results.budget = await sendBudgetAlerts(budgetAlerts)
  }

  // Enviar sugerencias de optimización
  results.optimizations = await sendOptimizationSuggestions(activeCampaigns, currentDays)

  // Mensaje resumen
  await sendSlackMessage(
    [
      slackHeader('📋 Revision pre-recap — Martes'),
      slackSection(
        '*Revisa las alertas y sugerencias de arriba.*\n\n' +
        'Ejecuta los cambios necesarios antes del jueves.\n' +
        'El jueves a las 8:00 se enviara un recordatorio para confirmar.'
      ),
      slackContext(`${activeCampaigns.length} campanas activas analizadas | <https://paid-media-dashboard-delta.vercel.app|Ver dashboard>`),
    ],
    'Revision pre-recap del martes'
  )

  return NextResponse.json({
    success: true,
    type: 'optimization',
    results,
    campaignsAnalyzed: activeCampaigns.length,
  })
}

// ═══ JUEVES 8:00: Reminder de confirmación ═══
async function handleReminder() {
  const { activeCampaigns } = await fetchAllCampaigns()

  const totalSpend = activeCampaigns.reduce((s, c) => s + c.spend, 0)
  const totalConv = activeCampaigns.reduce((s, c) => s + c.conversions, 0)
  const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

  const sent = await sendSlackMessage(
    [
      slackHeader('⚠️ Confirmacion requerida — Pre-recap'),
      slackSection(
        '*¿Se ejecutaron los cambios sugeridos el martes?*\n\n' +
        'Antes de enviar el recap al cliente, confirma:\n\n' +
        '• ¿Se ajustaron presupuestos?\n' +
        '• ¿Se pausaron/activaron campanas?\n' +
        '• ¿Se actualizaron creatividades o audiencias?\n' +
        '• ¿Los datos del dashboard reflejan la realidad?\n\n' +
        `_Estado actual: ${activeCampaigns.length} campanas activas, ${formatCLP(totalSpend)} invertidos, ${totalConv} leads_`
      ),
      slackSection(
        ':white_check_mark: Responde en este canal confirmando que esta todo OK\n' +
        ':x: Si hay algo pendiente, ejecutalo antes de las 10:00\n\n' +
        '*El recap al cliente se genera automaticamente a las 10:00*'
      ),
      slackContext('<https://paid-media-dashboard-delta.vercel.app|Ver dashboard> | <https://paid-media-dashboard-delta.vercel.app/campaigns|Ver campanas>'),
    ],
    'Confirmacion requerida antes del recap semanal'
  )

  return NextResponse.json({ success: true, type: 'reminder', sent })
}

// ═══ JUEVES 10:00: Recap formato cliente ═══
async function handleClientRecap() {
  // Semana actual: lunes a hoy (jueves)
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=dom, 4=jueves
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - mondayOffset)

  const currentStart = monday.toISOString().split('T')[0]
  const currentEnd = now.toISOString().split('T')[0]

  // Semana anterior: lunes a jueves anterior
  const prevMonday = new Date(monday)
  prevMonday.setDate(monday.getDate() - 7)
  const prevThursday = new Date(prevMonday)
  prevThursday.setDate(prevMonday.getDate() + 3)

  const prevStart = prevMonday.toISOString().split('T')[0]
  const prevEnd = prevThursday.toISOString().split('T')[0]

  // Fetch ambos periodos
  const [gCur, mCur, gPrev, mPrev] = await Promise.allSettled([
    fetchGoogleAds(currentStart, currentEnd),
    fetchMetaAds(currentStart, currentEnd),
    fetchGoogleAds(prevStart, prevEnd),
    fetchMetaAds(prevStart, prevEnd),
  ])

  const current = [
    ...(gCur.status === 'fulfilled' ? gCur.value : []),
    ...(mCur.status === 'fulfilled' ? mCur.value : []),
  ].filter(c => c.impressions > 0 || c.spend > 0)

  const previous = [
    ...(gPrev.status === 'fulfilled' ? gPrev.value : []),
    ...(mPrev.status === 'fulfilled' ? mPrev.value : []),
  ].filter(c => c.impressions > 0 || c.spend > 0)

  const sent = await sendClientRecapToSlack({
    current,
    previous,
    startDate: currentStart,
    endDate: currentEnd,
    prevStartDate: prevStart,
    prevEndDate: prevEnd,
  })

  return NextResponse.json({
    success: true,
    type: 'client-recap',
    sent,
    period: { current: `${currentStart} → ${currentEnd}`, previous: `${prevStart} → ${prevEnd}` },
    campaigns: { current: current.length, previous: previous.length },
  })
}

// ═══ Helper: fetch todas las campañas ═══
async function fetchAllCampaigns() {
  const [google, meta] = await Promise.allSettled([
    fetchGoogleAds(),
    fetchMetaAds(),
  ])

  const allCampaigns = [
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(meta.status === 'fulfilled' ? meta.value : []),
  ].filter(c => c.impressions > 0 || c.spend > 0)

  const activeCampaigns = allCampaigns.filter(c => c.status === 'active')

  return { allCampaigns, activeCampaigns }
}

export const dynamic = 'force-dynamic'
