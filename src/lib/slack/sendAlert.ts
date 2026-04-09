import { Alert, ApprovalRequest, DailyRecap } from '@/lib/types'
import {
  sendSlackMessage, slackHeader, slackSection, slackFields,
  slackDivider, slackContext,
} from './slackClient'

const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://paid-media-dashboard-delta.vercel.app'
const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

// ═══ Enviar alertas criticas a Slack ═══

export async function sendAlertToSlack(alert: Alert): Promise<boolean> {
  const severityEmoji: Record<string, string> = {
    critical: '🔴',
    warning: '🟡',
    opportunity: '🟢',
  }

  const blocks = [
    slackHeader(`${severityEmoji[alert.severity]} Alerta ${alert.severity.toUpperCase()} — Paid Media`),
    slackFields([
      `*Plataforma:*\n${alert.platform}`,
      `*Campana:*\n${alert.campaignName}`,
      `*Metrica:*\n${alert.metric}`,
      `*Valor actual:*\n${alert.currentValue}`,
    ]),
    slackSection(`📋 *Detalle:* ${alert.message}`),
    slackContext(`Detectado: ${new Date(alert.detectedAt).toLocaleString('es-CL')} | <${DASHBOARD_URL}|Ver dashboard>`),
  ]

  return sendSlackMessage(blocks, `Alerta ${alert.severity}: ${alert.message}`)
}

// ═══ Enviar batch de alertas (resumen) ═══

export async function sendAlertBatchToSlack(alerts: Alert[]): Promise<boolean> {
  if (alerts.length === 0) return false

  const critical = alerts.filter(a => a.severity === 'critical')
  const warning = alerts.filter(a => a.severity === 'warning')
  const opportunity = alerts.filter(a => a.severity === 'opportunity')

  const lines: string[] = []
  if (critical.length > 0) {
    lines.push(`🔴 *${critical.length} alertas criticas*`)
    critical.forEach(a => lines.push(`  • ${a.platform} — ${a.campaignName}: ${a.message}`))
  }
  if (warning.length > 0) {
    lines.push(`🟡 *${warning.length} advertencias*`)
    warning.forEach(a => lines.push(`  • ${a.platform} — ${a.campaignName}: ${a.message}`))
  }
  if (opportunity.length > 0) {
    lines.push(`🟢 *${opportunity.length} oportunidades*`)
    opportunity.forEach(a => lines.push(`  • ${a.platform} — ${a.campaignName}: ${a.message}`))
  }

  const blocks = [
    slackHeader('📊 Resumen de Alertas — Paid Media'),
    slackSection(lines.join('\n')),
    slackContext(`<${DASHBOARD_URL}|Ver dashboard> — ${new Date().toLocaleString('es-CL')}`),
  ]

  return sendSlackMessage(blocks, `${alerts.length} alertas de paid media`)
}

// ═══ Enviar solicitud de aprobacion a Slack ═══

export async function sendApprovalRequestToSlack(request: ApprovalRequest): Promise<boolean> {
  const blocks = [
    slackHeader('⏳ Solicitud de Aprobacion — Paid Media'),
    slackFields([
      `*Tipo:*\n${request.type}`,
      `*Plataforma:*\n${request.platform}`,
      `*Campana:*\n${request.campaignName}`,
      `*Valor actual:*\n${request.currentValue}`,
      `*Cambio propuesto:*\n${request.proposedValue}`,
    ]),
    slackSection(`📋 *Razon:* ${request.reason}\n💡 *Impacto esperado:* ${request.impact}`),
    slackContext(`<${DASHBOARD_URL}/approvals?id=${request.id}|Ver en dashboard>`),
  ]

  return sendSlackMessage(blocks, `Aprobacion: ${request.description}`)
}

// ═══ Enviar recap diario a Slack ═══

export async function sendRecapToSlack(recap: DailyRecap): Promise<boolean> {
  const platformLines = Object.entries(recap.platformBreakdown)
    .map(([platform, data]) =>
      `  • *${platform}:* ${formatCLP(data.spend)} gastado | ${data.conversions} conv. | CPA ${formatCLP(data.cpa)}`
    )
    .join('\n')

  const blocks = [
    slackHeader(`📊 Recap Diario — ${recap.date}`),
    slackSection([
      `💰 *Gasto total:* ${formatCLP(recap.totalSpend)} de ${formatCLP(recap.totalBudget)} (${recap.pacingPercent.toFixed(0)}% pacing)`,
      `🎯 *Conversiones:* ${recap.totalConversions} | CPA promedio: ${formatCLP(recap.avgCpa)}`,
      `🏆 *Mejor campana:* ${recap.topCampaign}`,
      `⚠️ *Peor campana:* ${recap.worstCampaign}`,
      '',
      '*Por plataforma:*',
      platformLines,
      '',
      `🔴 ${recap.alertsSummary.critical} criticas | 🟡 ${recap.alertsSummary.warning} advertencias | 🟢 ${recap.alertsSummary.opportunity} oportunidades`,
    ].join('\n')),
    ...(recap.recommendations.length > 0 ? [
      slackSection('💡 *Recomendaciones:*\n' + recap.recommendations.map(r => `  • ${r}`).join('\n')),
    ] : []),
    slackContext(`<${DASHBOARD_URL}|Ver dashboard> | <${DASHBOARD_URL}/client|Dashboard cliente>`),
  ]

  return sendSlackMessage(blocks, `Recap: ${formatCLP(recap.totalSpend)} invertidos, ${recap.totalConversions} conversiones`)
}
