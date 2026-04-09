import { Alert, ApprovalRequest, DailyRecap } from '@/lib/types'

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || '#paid-media-alerts'

// ═══ Enviar alertas críticas a Slack ═══

export async function sendAlertToSlack(alert: Alert): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('[DEV] Slack sin configurar → alerta no enviada:', alert.message)
    return false
  }

  const severityEmoji: Record<string, string> = {
    critical: '🔴',
    warning: '🟡',
    opportunity: '🟢',
  }

  const payload = {
    channel: SLACK_CHANNEL,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji[alert.severity]} Alerta ${alert.severity.toUpperCase()} — Paid Media`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Plataforma:*\n${alert.platform}` },
          { type: 'mrkdwn', text: `*Campaña:*\n${alert.campaignName}` },
          { type: 'mrkdwn', text: `*Métrica:*\n${alert.metric}` },
          { type: 'mrkdwn', text: `*Valor actual:*\n${alert.currentValue}` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📋 *Detalle:* ${alert.message}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Detectado: ${new Date(alert.detectedAt).toLocaleString('es-CL')} | Dashboard: <${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}|Ver dashboard>`,
          },
        ],
      },
    ],
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return response.ok
}

// ═══ Enviar batch de alertas (resumen) ═══

export async function sendAlertBatchToSlack(alerts: Alert[]): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL || alerts.length === 0) return false

  const critical = alerts.filter(a => a.severity === 'critical')
  const warning = alerts.filter(a => a.severity === 'warning')
  const opportunity = alerts.filter(a => a.severity === 'opportunity')

  const lines: string[] = []
  if (critical.length > 0) {
    lines.push(`🔴 *${critical.length} alertas críticas*`)
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

  const payload = {
    channel: SLACK_CHANNEL,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📊 Resumen de Alertas — Paid Media' },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: lines.join('\n') },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📈 Ver Dashboard' },
            url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          },
        ],
      },
    ],
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return response.ok
}

// ═══ Enviar solicitud de aprobación a Slack ═══

export async function sendApprovalRequestToSlack(request: ApprovalRequest): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('[DEV] Slack sin configurar → aprobación no enviada:', request.description)
    return false
  }

  const payload = {
    channel: SLACK_CHANNEL,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '⏳ Solicitud de Aprobación — Paid Media' },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Tipo:*\n${request.type}` },
          { type: 'mrkdwn', text: `*Plataforma:*\n${request.platform}` },
          { type: 'mrkdwn', text: `*Campaña:*\n${request.campaignName}` },
          { type: 'mrkdwn', text: `*Valor actual:*\n${request.currentValue}` },
          { type: 'mrkdwn', text: `*Cambio propuesto:*\n${request.proposedValue}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `📋 *Razón:* ${request.reason}\n💡 *Impacto esperado:* ${request.impact}` },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Aprobar' },
            style: 'primary',
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/approvals?id=${request.id}&action=approve`,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Rechazar' },
            style: 'danger',
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/approvals?id=${request.id}&action=reject`,
          },
        ],
      },
    ],
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return response.ok
}

// ═══ Enviar recap diario a Slack ═══

export async function sendRecapToSlack(recap: DailyRecap): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) return false

  const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

  const platformLines = Object.entries(recap.platformBreakdown)
    .map(([platform, data]) =>
      `  • *${platform}:* ${formatCLP(data.spend)} gastado | ${data.conversions} conv. | CPA ${formatCLP(data.cpa)}`
    )
    .join('\n')

  const payload = {
    channel: SLACK_CHANNEL,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `📊 Recap Diario — ${recap.date}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            `💰 *Gasto total:* ${formatCLP(recap.totalSpend)} de ${formatCLP(recap.totalBudget)} (${recap.pacingPercent.toFixed(0)}% pacing)`,
            `🎯 *Conversiones:* ${recap.totalConversions} | CPA promedio: ${formatCLP(recap.avgCpa)}`,
            `🏆 *Mejor campaña:* ${recap.topCampaign}`,
            `⚠️ *Peor campaña:* ${recap.worstCampaign}`,
            '',
            '*Por plataforma:*',
            platformLines,
            '',
            `🔴 ${recap.alertsSummary.critical} críticas | 🟡 ${recap.alertsSummary.warning} advertencias | 🟢 ${recap.alertsSummary.opportunity} oportunidades`,
          ].join('\n'),
        },
      },
      ...(recap.recommendations.length > 0 ? [{
        type: 'section' as const,
        text: {
          type: 'mrkdwn' as const,
          text: '💡 *Recomendaciones:*\n' + recap.recommendations.map(r => `  • ${r}`).join('\n'),
        },
      }] : []),
    ],
  }

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return response.ok
}
