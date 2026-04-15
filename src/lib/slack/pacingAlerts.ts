// ═══ Alertas Slack — Sobreinversión de pacing ═══
// Se dispara cuando la proyección mensual de un cliente+canal supera el presupuesto aprobado

import { sendSlackMessage, slackHeader, slackSection, slackFields, slackDivider, slackContext } from './slackClient'

const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')
const PACING_URL = 'https://paid-media-dashboard-delta.vercel.app/pacing'
// Canal exclusivo de registro de costos — solo recibe alertas de pacing
const PACING_CHANNEL = process.env.SLACK_PACING_CHANNEL || 'C0ASJ67RWDT'

export interface PacingAlertItem {
  clientName: string
  channel: string
  approvedBudget: number
  accumulatedSpend: number
  projectedSpend: number
  percentUsed: number
  percentProjected: number
  daysElapsed: number
  daysInMonth: number
  weekLabel: string
}

/**
 * Envía alerta URGENTE a Slack cuando la proyección supera el presupuesto aprobado.
 * Solo se llama cuando hay al menos un caso crítico (proyección > 100% del aprobado).
 */
export async function sendPacingOverspendAlerts(
  critical: PacingAlertItem[],
  warning: PacingAlertItem[]
): Promise<boolean> {
  if (critical.length === 0 && warning.length === 0) return false

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  // Bloque de cabecera (sin color)
  const headerBlocks: any[] = [
    slackHeader('Revisión de pacing — Proyecciones de gasto'),
    slackSection(`*${dateStr}*`),
  ]

  // Attachments con color por severidad
  const attachments: any[] = []

  // Críticos en rojo
  for (const a of critical) {
    const overAmount = a.projectedSpend - a.approvedBudget
    const overPct = ((a.projectedSpend / a.approvedBudget) - 1) * 100
    attachments.push({
      color: 'danger',
      blocks: [
        slackFields([
          `*Cliente:*\n${a.clientName}`,
          `*Canal:*\n${a.channel}`,
          `*Aprobado:*\n${formatCLP(a.approvedBudget)}`,
          `*Proyectado:*\n${formatCLP(a.projectedSpend)} (+${overPct.toFixed(0)}%)`,
        ]),
        slackSection(
          `Acumulado: ${formatCLP(a.accumulatedSpend)} (${a.percentUsed.toFixed(0)}%) | ` +
          `Exceso proyectado: *${formatCLP(overAmount)}* | ` +
          `Día ${a.daysElapsed} de ${a.daysInMonth}`
        ),
      ],
    })
  }

  // Advertencias en amarillo
  for (const a of warning) {
    attachments.push({
      color: 'warning',
      blocks: [
        slackFields([
          `*Cliente:*\n${a.clientName}`,
          `*Canal:*\n${a.channel}`,
          `*Aprobado:*\n${formatCLP(a.approvedBudget)}`,
          `*Proyectado:*\n${formatCLP(a.projectedSpend)} (${a.percentProjected.toFixed(0)}%)`,
        ]),
      ],
    })
  }

  // Footer
  attachments.push({
    color: '#E0E0E0',
    blocks: [
      slackContext(`Proyección basada en promedio diario | <${PACING_URL}|Ver registro de costos>`),
    ],
  })

  return sendSlackMessage(
    headerBlocks,
    `${critical.length} alertas críticas + ${warning.length} advertencias de pacing`,
    PACING_CHANNEL,
    attachments
  )
}

/**
 * Envía un resumen semanal de pacing (sin alertas urgentes).
 * Se usa cuando todo está en rango — confirma que el sistema corrió OK.
 */
export async function sendPacingWeeklySummary(
  results: Array<{
    clientName: string
    channel: string
    approvedBudget: number
    weeklySpend: number
    accumulatedSpend: number
    percentUsed: number
    weekLabel: string
  }>
): Promise<boolean> {
  if (results.length === 0) return false

  const totalApproved = results.reduce((s, r) => s + r.approvedBudget, 0)
  const totalSpent = results.reduce((s, r) => s + r.accumulatedSpend, 0)
  const totalWeekSpend = results.reduce((s, r) => s + r.weeklySpend, 0)
  const pct = totalApproved > 0 ? (totalSpent / totalApproved) * 100 : 0

  const byChannel = results.reduce((acc, r) => {
    if (!acc[r.channel]) acc[r.channel] = { approved: 0, spent: 0, week: 0 }
    acc[r.channel].approved += r.approvedBudget
    acc[r.channel].spent += r.accumulatedSpend
    acc[r.channel].week += r.weeklySpend
    return acc
  }, {} as Record<string, { approved: number; spent: number; week: number }>)

  const channelLines = Object.entries(byChannel)
    .map(([ch, d]) => `• *${ch}:* ${formatCLP(d.spent)} / ${formatCLP(d.approved)} (${((d.spent / d.approved) * 100).toFixed(0)}%) — semana: ${formatCLP(d.week)}`)
    .join('\n')

  const now = new Date()
  const weekLabel = results[0]?.weekLabel || ''

  const blocks = [
    slackHeader('📊 Pacing semanal — Todo en rango'),
    slackFields([
      `*Total aprobado:*\n${formatCLP(totalApproved)}`,
      `*Total acumulado:*\n${formatCLP(totalSpent)} (${pct.toFixed(0)}%)`,
      `*Gasto esta semana:*\n${formatCLP(totalWeekSpend)}`,
      `*Semana:*\n${weekLabel}`,
    ]),
    slackDivider(),
    slackSection(`*Por canal:*\n${channelLines}`),
    slackContext(
      `Planilla actualizada automáticamente | ` +
      `${results.length} filas actualizadas | ` +
      `<${PACING_URL}|Ver registro de costos>`
    ),
  ]

  return sendSlackMessage(
    blocks,
    `Pacing semanal OK — ${formatCLP(totalSpent)} de ${formatCLP(totalApproved)} (${pct.toFixed(0)}%)`,
    PACING_CHANNEL
  )
}

export interface PacingInactiveItem {
  clientName: string
  channel: string
  approvedBudget: number
  daysElapsed: number
  daysInMonth: number
}

/**
 * Envía alerta a Slack cuando hay cuentas con presupuesto aprobado pero sin gasto registrado.
 * Indica que posiblemente las campañas están pausadas o hay un problema de configuración.
 */
export async function sendPacingInactiveAlerts(
  inactive: PacingInactiveItem[]
): Promise<boolean> {
  if (inactive.length === 0) return false

  const now = new Date()
  const dateStr = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })

  const lines = inactive
    .map(a => `• *${a.clientName}* | ${a.channel} — Presupuesto: ${formatCLP(a.approvedBudget)} — sin gasto registrado`)
    .join('\n')

  const headerBlocks = [
    slackHeader('Cuentas sin actividad este mes'),
    slackSection(`*${dateStr}* | Día ${inactive[0].daysElapsed} de ${inactive[0].daysInMonth}`),
  ]

  const attachments = [
    {
      color: 'warning',
      blocks: [
        slackSection(
          `Estas cuentas tienen presupuesto aprobado pero *no registran gasto*. ` +
          `Verificar si las campañas están activas.\n\n${lines}`
        ),
      ],
    },
    {
      color: '#E0E0E0',
      blocks: [slackContext(`<${PACING_URL}|Ver registro de costos>`)],
    },
  ]

  return sendSlackMessage(
    headerBlocks,
    `${inactive.length} ${inactive.length === 1 ? 'cuenta sin actividad' : 'cuentas sin actividad'} este mes`,
    PACING_CHANNEL,
    attachments
  )
}
