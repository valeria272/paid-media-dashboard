import { CampaignMetrics, Alert, DailyRecap, PlatformSummary } from '@/lib/types'
import { KPI_TARGETS } from '@/config/kpis'

// ═══ Generador de Recaps Diarios ═══

export function generateDailyRecap(
  campaigns: CampaignMetrics[],
  alerts: Alert[]
): DailyRecap {
  // SOLO procesar campañas activas
  campaigns = campaigns.filter(c => c.status === 'active')
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0

  // Mejor y peor campaña por CPA (solo las que tienen conversiones)
  const withConversions = campaigns.filter(c => c.conversions > 0)
  const sortedByCpa = [...withConversions].sort((a, b) => a.cpa - b.cpa)

  const topCampaign = sortedByCpa[0]
    ? `${sortedByCpa[0].name} (CPA $${Math.round(sortedByCpa[0].cpa).toLocaleString('es-CL')})`
    : 'N/A'

  const worstCampaign = sortedByCpa[sortedByCpa.length - 1]
    ? `${sortedByCpa[sortedByCpa.length - 1].name} (CPA $${Math.round(sortedByCpa[sortedByCpa.length - 1].cpa).toLocaleString('es-CL')})`
    : 'N/A'

  // Breakdown por plataforma
  const platformBreakdown: Record<string, PlatformSummary> = {}
  for (const c of campaigns) {
    if (!platformBreakdown[c.platform]) {
      platformBreakdown[c.platform] = {
        spend: 0, budget: 0, impressions: 0, clicks: 0,
        ctr: 0, conversions: 0, cpa: 0, campaignCount: 0, activeCampaignCount: 0,
      }
    }
    const p = platformBreakdown[c.platform]
    p.spend += c.spend
    p.budget += c.budget
    p.impressions += c.impressions
    p.clicks += c.clicks
    p.conversions += c.conversions
    p.campaignCount++
    if (c.status === 'active') p.activeCampaignCount++
  }
  for (const key of Object.keys(platformBreakdown)) {
    const p = platformBreakdown[key]
    p.ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0
    p.cpa = p.conversions > 0 ? p.spend / p.conversions : 0
  }

  // Generar recomendaciones automáticas
  const recommendations = generateRecommendations(campaigns, alerts)

  return {
    date: new Date().toISOString().split('T')[0],
    totalSpend,
    totalBudget,
    pacingPercent: totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0,
    totalConversions,
    avgCpa,
    topCampaign,
    worstCampaign,
    alertsSummary: {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      opportunity: alerts.filter(a => a.severity === 'opportunity').length,
    },
    platformBreakdown,
    recommendations,
  }
}

// ═══ Recomendaciones automáticas ═══

function generateRecommendations(campaigns: CampaignMetrics[], alerts: Alert[]): string[] {
  const recommendations: string[] = []

  // Campañas con CPA excelente → escalar
  const scalable = campaigns.filter(c => {
    const target = KPI_TARGETS[c.platform] || KPI_TARGETS.default
    return c.cpa > 0 && target.maxCpa > 0 && c.cpa < target.maxCpa * 0.7 && c.conversions >= 5
  })
  if (scalable.length > 0) {
    recommendations.push(
      `Considerar escalar presupuesto en ${scalable.map(c => c.name).join(', ')} — CPA muy por debajo del objetivo`
    )
  }

  // Campañas sin conversiones con gasto
  const noConversions = campaigns.filter(c => c.conversions === 0 && c.spend > 30000)
  if (noConversions.length > 0) {
    recommendations.push(
      `Revisar ${noConversions.map(c => c.name).join(', ')} — gasto sin conversiones, evaluar pausa o ajuste de segmentación`
    )
  }

  // Sobregasto general
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0)
  if (totalBudget > 0 && totalSpend > totalBudget * 1.1) {
    recommendations.push(
      `Gasto total supera presupuesto en ${((totalSpend / totalBudget - 1) * 100).toFixed(0)}% — revisar caps de campaña`
    )
  }

  // CTR bajo generalizado
  const lowCtr = campaigns.filter(c => {
    const target = KPI_TARGETS[c.platform] || KPI_TARGETS.default
    return c.impressions > 500 && c.ctr < target.minCtr
  })
  if (lowCtr.length >= 3) {
    recommendations.push(
      `${lowCtr.length} campañas con CTR bajo — evaluar refresh de creatividades o ajuste de audiencias`
    )
  }

  return recommendations
}
