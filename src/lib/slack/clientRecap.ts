// ═══ Recap semanal formato cliente — texto listo para copiar/enviar ═══

import { CampaignMetrics } from '@/lib/types'
import {
  sendSlackMessage, slackHeader, slackSection, slackDivider, slackContext,
} from './slackClient'

const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')
const formatPct = (n: number) => n.toFixed(1).replace('.', ',') + '%'

function calcVar(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(0)}%`
}

function varEmoji(current: number, previous: number, lowerIsBetter = false): string {
  if (previous === 0) return ''
  const pct = ((current - previous) / previous) * 100
  const improved = lowerIsBetter ? pct < 0 : pct > 0
  return improved ? ' ✓' : ''
}

export interface WeeklyData {
  current: CampaignMetrics[]
  previous: CampaignMetrics[]
  startDate: string
  endDate: string
  prevStartDate: string
  prevEndDate: string
}

export function generateClientRecapText(data: WeeklyData): string {
  const cur = data.current
  const prev = data.previous

  const cSpend = cur.reduce((s, c) => s + c.spend, 0)
  const cLeads = cur.reduce((s, c) => s + c.conversions, 0)
  const cCpl = cLeads > 0 ? cSpend / cLeads : 0
  const cClicks = cur.reduce((s, c) => s + c.clicks, 0)
  const cImpressions = cur.reduce((s, c) => s + c.impressions, 0)
  const cCtr = cImpressions > 0 ? (cClicks / cImpressions) * 100 : 0

  const pSpend = prev.reduce((s, c) => s + c.spend, 0)
  const pLeads = prev.reduce((s, c) => s + c.conversions, 0)
  const pCpl = pLeads > 0 ? pSpend / pLeads : 0
  const pClicks = prev.reduce((s, c) => s + c.clicks, 0)
  const pImpressions = prev.reduce((s, c) => s + c.impressions, 0)
  const pCtr = pImpressions > 0 ? (pClicks / pImpressions) * 100 : 0

  // Formatear fechas para display
  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-')
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${Number(day)} ${months[Number(m) - 1]}`
  }

  const periodo = `${fmtDate(data.startDate)} - ${fmtDate(data.endDate)}`

  // Análisis automático
  const insights: string[] = []

  if (pCpl > 0 && cCpl < pCpl) {
    const mejora = ((1 - cCpl / pCpl) * 100).toFixed(0)
    insights.push(`El costo por lead bajo un ${mejora}%, lo que indica mejor eficiencia en la segmentacion.`)
  } else if (pCpl > 0 && cCpl > pCpl) {
    const aumento = ((cCpl / pCpl - 1) * 100).toFixed(0)
    insights.push(`El costo por lead subio un ${aumento}%. Se recomienda revisar segmentacion y creatividades.`)
  }

  if (pCtr > 0 && cCtr > pCtr * 1.1) {
    insights.push(`El CTR subio significativamente (${calcVar(cCtr, pCtr)}), las creatividades estan funcionando bien.`)
  } else if (pCtr > 0 && cCtr < pCtr * 0.9) {
    insights.push(`El CTR bajo (${calcVar(cCtr, pCtr)}). Se recomienda evaluar refresh de creatividades.`)
  }

  if (cLeads > pLeads && pLeads > 0) {
    insights.push(`Se generaron ${cLeads - pLeads} leads mas que la semana anterior (${calcVar(cLeads, pLeads)}).`)
  } else if (cLeads < pLeads && pLeads > 0) {
    insights.push(`Los leads bajaron de ${pLeads} a ${cLeads}. Se recomienda revisar landing pages y formularios.`)
  }

  if (insights.length === 0) {
    insights.push('Rendimiento estable respecto a la semana anterior.')
  }

  // Sugerencias
  const suggestions: string[] = []

  // Campañas con buen CPA → escalar
  const goodCpa = cur.filter(c => c.conversions >= 3 && c.cpa > 0 && c.budget > 0)
    .sort((a, b) => a.cpa - b.cpa)
  if (goodCpa.length > 0) {
    suggestions.push(`Evaluar incremento de presupuesto en ${goodCpa[0].name} dado el buen rendimiento.`)
  }

  // Meta con muchas impresiones → frecuencia
  const metaCampaigns = cur.filter(c => c.platform === 'meta' && c.impressions > 5000)
  if (metaCampaigns.length > 0) {
    suggestions.push('Monitorear frecuencia en Meta para evitar fatiga de audiencia.')
  }

  // Sin conversiones
  const noConv = cur.filter(c => c.conversions === 0 && c.spend > 20000)
  if (noConv.length > 0) {
    suggestions.push(`Revisar performance de ${noConv.map(c => c.name).join(', ')} — gasto sin conversiones.`)
  }

  // CTR bajo
  const lowCtr = cur.filter(c => c.ctr < 1.5 && c.impressions > 500)
  if (lowCtr.length > 0 && suggestions.length < 3) {
    suggestions.push('Considerar nuevos angulos de copy o formatos visuales para mejorar CTR.')
  }

  if (suggestions.length === 0) {
    suggestions.push('Mantener configuracion actual y seguir monitoreando performance.')
  }

  // Armar texto completo
  const lines = [
    `Hola,`,
    ``,
    `Te comparto el resumen semanal de campanas (${periodo}):`,
    ``,
    `RESULTADOS DE LA SEMANA`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `                    Esta sem.    Anterior    Var.`,
    `Inversion           ${formatCLP(cSpend).padEnd(13)}${formatCLP(pSpend).padEnd(12)}${calcVar(cSpend, pSpend)}`,
    `Leads               ${String(cLeads).padEnd(13)}${String(pLeads).padEnd(12)}${calcVar(cLeads, pLeads)}${varEmoji(cLeads, pLeads)}`,
    `Costo por Lead      ${formatCLP(cCpl).padEnd(13)}${formatCLP(pCpl).padEnd(12)}${calcVar(cCpl, pCpl)}${varEmoji(cCpl, pCpl, true)}`,
    `Clics               ${String(cClicks).padEnd(13)}${String(pClicks).padEnd(12)}${calcVar(cClicks, pClicks)}`,
    `CTR                 ${formatPct(cCtr).padEnd(13)}${formatPct(pCtr).padEnd(12)}${calcVar(cCtr, pCtr)}`,
    `Impresiones         ${cImpressions.toLocaleString('es-CL').padEnd(13)}${pImpressions.toLocaleString('es-CL').padEnd(12)}${calcVar(cImpressions, pImpressions)}`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `ANALISIS`,
    ...insights.map(i => `• ${i}`),
    ``,
    `PROXIMOS PASOS`,
    ...suggestions.map(s => `• ${s}`),
    ``,
    `Dashboard en tiempo real: https://paid-media-dashboard-delta.vercel.app/client`,
    ``,
    `Saludos,`,
    `Equipo CopyWriters`,
  ]

  return lines.join('\n')
}

export async function sendClientRecapToSlack(data: WeeklyData): Promise<boolean> {
  const recapText = generateClientRecapText(data)

  const fmtDate = (d: string) => {
    const [, m, day] = d.split('-')
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
    return `${Number(day)} ${months[Number(m) - 1]}`
  }

  const blocks = [
    slackHeader('📧 Recap Semanal — Listo para enviar al cliente'),
    slackSection(`*Periodo:* ${fmtDate(data.startDate)} - ${fmtDate(data.endDate)}`),
    slackDivider(),
    slackSection('Copia el texto de abajo y pegalo en el correo al cliente:'),
    slackSection(`\`\`\`${recapText}\`\`\``),
    slackDivider(),
    slackContext('Revisa los datos antes de enviar | <https://paid-media-dashboard-delta.vercel.app|Ver dashboard>'),
  ]

  return sendSlackMessage(blocks, `Recap semanal listo para enviar al cliente (${fmtDate(data.startDate)} - ${fmtDate(data.endDate)})`)
}
