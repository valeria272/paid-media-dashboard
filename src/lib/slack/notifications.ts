// ═══ Notificaciones Slack — Alertas inteligentes de Paid Media ═══

import { CampaignMetrics, Alert } from '@/lib/types'
import { BudgetAlert, BudgetRow } from '@/lib/fetchers/budgetSheet'
import {
  sendSlackMessage, slackHeader, slackSection, slackFields,
  slackDivider, slackContext,
} from './slackClient'

const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')
const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paid-media-dashboard-delta.vercel.app'

// ═══ 1. ALERTAS DE PERFORMANCE (pujas, CTR, CPA) ═══

export async function sendPerformanceAlerts(alerts: Alert[]): Promise<boolean> {
  if (alerts.length === 0) return false

  const critical = alerts.filter(a => a.severity === 'critical')
  const warning = alerts.filter(a => a.severity === 'warning')
  const opportunity = alerts.filter(a => a.severity === 'opportunity')

  const blocks: any[] = [
    slackHeader('⚡ Alertas de Performance — Paid Media'),
  ]

  if (critical.length > 0) {
    blocks.push(slackSection('🔴 *Criticas*'))
    critical.forEach(a => {
      blocks.push(slackSection(`• *${a.platform} — ${a.campaignName}*\n${a.message}`))
    })
  }

  if (warning.length > 0) {
    blocks.push(slackSection('🟡 *Advertencias*'))
    warning.forEach(a => {
      blocks.push(slackSection(`• *${a.platform} — ${a.campaignName}*\n${a.message}`))
    })
  }

  if (opportunity.length > 0) {
    blocks.push(slackSection('🟢 *Oportunidades*'))
    opportunity.forEach(a => {
      blocks.push(slackSection(`• *${a.platform} — ${a.campaignName}*\n${a.message}`))
    })
  }

  blocks.push(slackContext(`<${DASHBOARD_URL}|Ver dashboard> — ${new Date().toLocaleString('es-CL')}`))

  return sendSlackMessage(blocks, `${alerts.length} alertas de performance detectadas`)
}

// ═══ 2. ALERTAS DE PRESUPUESTO ═══

export async function sendBudgetAlerts(alerts: BudgetAlert[]): Promise<boolean> {
  if (alerts.length === 0) return false

  const blocks: any[] = [
    slackHeader('💳 Alerta de Presupuesto — Paid Media'),
  ]

  for (const a of alerts) {
    const emoji = a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '🟡' : '🟢'
    blocks.push(slackFields([
      `*Campana:*\n${a.campaignName}`,
      `*Canal:*\n${a.channel}`,
      `*Gastado:*\n${formatCLP(a.currentSpend)} (${a.percentUsed.toFixed(0)}%)`,
      `*Aprobado:*\n${formatCLP(a.budgetApproved)}`,
    ]))
    blocks.push(slackSection(`${emoji} ${a.message}`))
    blocks.push(slackDivider())
  }

  blocks.push(slackContext(`<${DASHBOARD_URL}|Ver dashboard> — Proyeccion basada en gasto promedio diario`))

  return sendSlackMessage(blocks, `${alerts.length} alertas de presupuesto`)
}

// ═══ 3. SUGERENCIAS DE OPTIMIZACION ═══

export async function sendOptimizationSuggestions(
  campaigns: CampaignMetrics[],
  periodDays: number
): Promise<boolean> {
  const suggestions: string[] = []

  for (const c of campaigns) {
    const dailySpend = periodDays > 0 ? c.spend / periodDays : 0

    // CPA excelente con volumen → escalar
    if (c.conversions >= 5 && c.cpa > 0 && c.budget > 0) {
      const pacingPct = (dailySpend / c.budget) * 100
      if (pacingPct < 90) {
        suggestions.push(
          `📈 *${c.name}* — CPA ${formatCLP(c.cpa)} con ${c.conversions} conv. Pacing al ${pacingPct.toFixed(0)}%. Considerar subir presupuesto diario.`
        )
      }
    }

    // CTR muy alto → las creatividades funcionan, buscar mas volumen
    if (c.ctr > 3 && c.platform === 'google') {
      suggestions.push(
        `🎯 *${c.name}* — CTR ${c.ctr.toFixed(1)}% muy por encima del benchmark. Evaluar ampliar keywords o audiencias para captar mas volumen.`
      )
    }

    // Gasto alto sin conversiones → revisar landing o segmentacion
    if (c.spend > 30000 && c.conversions === 0 && periodDays >= 3) {
      suggestions.push(
        `⚠️ *${c.name}* — ${formatCLP(c.spend)} gastados sin conversiones en ${periodDays} dias. Revisar landing page, formulario, o segmentacion.`
      )
    }

    // CTR bajo en Meta → refresh de creatividades
    if (c.platform === 'meta' && c.ctr < 0.8 && c.impressions > 1000) {
      suggestions.push(
        `🎨 *${c.name}* — CTR ${c.ctr.toFixed(2)}% bajo en Meta. Considerar refresh de creatividades o nuevos formatos (video, carrusel).`
      )
    }

    // Muchos clics, pocas conversiones → problema de landing
    if (c.clicks > 100 && c.conversions === 0) {
      suggestions.push(
        `🔍 *${c.name}* — ${c.clicks} clics sin conversiones. Posible problema en landing page: revisar velocidad, formulario, CTA.`
      )
    }
  }

  if (suggestions.length === 0) return false

  const blocks: any[] = [
    slackHeader('💡 Sugerencias de Optimizacion'),
    slackSection(suggestions.join('\n\n')),
    slackContext(`<${DASHBOARD_URL}|Ver dashboard> — Analisis automatico basado en datos del periodo`),
  ]

  return sendSlackMessage(blocks, `${suggestions.length} sugerencias de optimizacion`)
}

// ═══ 4. RECAP SEMANAL ═══

export async function sendWeeklyRecap(
  campaigns: CampaignMetrics[],
  budgets: BudgetRow[],
  webMetrics: { sessions: number; conversions: number } | null,
  periodDays: number
): Promise<boolean> {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  // Mejor y peor campana por CPA
  const withConv = campaigns.filter(c => c.conversions > 0).sort((a, b) => a.cpa - b.cpa)
  const best = withConv[0]
  const worst = withConv[withConv.length - 1]

  // Presupuesto total
  const totalBudget = budgets.reduce((s, b) => s + b.monthlyBudget, 0)
  const budgetPct = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const projectedTotal = periodDays > 0 ? Math.round((totalSpend / periodDays) * daysInMonth) : 0

  const blocks: any[] = [
    slackHeader(`📊 Recap Semanal — Paid Media`),
    slackSection(`*Periodo:* Ultimos ${periodDays} dias del mes`),
    slackDivider(),
    slackFields([
      `*💰 Inversion total:*\n${formatCLP(totalSpend)}`,
      `*🎯 Conversiones:*\n${totalConversions}`,
      `*💵 CPA promedio:*\n${avgCpa > 0 ? formatCLP(avgCpa) : '-'}`,
      `*📊 CTR promedio:*\n${avgCtr.toFixed(2)}%`,
    ]),
    slackDivider(),
  ]

  // Por plataforma
  const byPlatform: Record<string, { spend: number; conv: number }> = {}
  for (const c of campaigns) {
    if (!byPlatform[c.platform]) byPlatform[c.platform] = { spend: 0, conv: 0 }
    byPlatform[c.platform].spend += c.spend
    byPlatform[c.platform].conv += c.conversions
  }

  const platformLines = Object.entries(byPlatform)
    .map(([p, d]) => `• *${p === 'google' ? 'Google Ads' : 'Meta Ads'}:* ${formatCLP(d.spend)} — ${d.conv} conv.`)
    .join('\n')

  blocks.push(slackSection(`*Por plataforma:*\n${platformLines}`))

  // Mejor y peor
  if (best) {
    blocks.push(slackSection(
      `*🏆 Mejor campana:* ${best.name}\nCPA ${formatCLP(best.cpa)} — ${best.conversions} conversiones`
    ))
  }
  if (worst && worst !== best) {
    blocks.push(slackSection(
      `*⚠️ Peor campana:* ${worst.name}\nCPA ${formatCLP(worst.cpa)} — ${worst.conversions} conversiones`
    ))
  }

  // Presupuesto
  if (totalBudget > 0) {
    blocks.push(slackDivider())
    blocks.push(slackSection(
      `*💳 Presupuesto:*\nGastado ${formatCLP(totalSpend)} de ${formatCLP(totalBudget)} (${budgetPct.toFixed(0)}%)\nProyeccion mes: ${formatCLP(projectedTotal)} ${projectedTotal > totalBudget ? '⚠️ supera presupuesto' : '✅ dentro del rango'}`
    ))
  }

  // Web
  if (webMetrics && webMetrics.sessions > 0) {
    blocks.push(slackDivider())
    blocks.push(slackSection(
      `*🌐 Sitio web:*\n${webMetrics.sessions.toLocaleString('es-CL')} sesiones — ${webMetrics.conversions} conversiones web`
    ))
  }

  blocks.push(slackDivider())
  blocks.push(slackContext(`<${DASHBOARD_URL}|Ver dashboard completo> | <${DASHBOARD_URL}/client|Dashboard cliente>`))

  return sendSlackMessage(blocks, `Recap semanal: ${formatCLP(totalSpend)} invertidos, ${totalConversions} conversiones`)
}

// ═══ 5. ALERTA DE ERROR DE CAMPANA ═══

export async function sendCampaignError(
  platform: string,
  error: string
): Promise<boolean> {
  const blocks = [
    slackHeader('🚨 Error de Conexion — Paid Media'),
    slackSection(`*Plataforma:* ${platform}\n*Error:* ${error}`),
    slackSection('La plataforma no esta respondiendo. Los datos pueden estar desactualizados.'),
    slackContext(`<${DASHBOARD_URL}|Ver dashboard> — ${new Date().toLocaleString('es-CL')}`),
  ]

  return sendSlackMessage(blocks, `Error en ${platform}: ${error}`)
}
