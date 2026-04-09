import { CampaignMetrics, Alert } from '@/lib/types'
import { KPI_TARGETS } from '@/config/kpis'

/**
 * Detecta alertas basado en metricas de campanas.
 * @param campaigns - Campanas activas con datos
 * @param periodDays - Numero de dias del periodo (para calcular pacing correctamente)
 */
export function detectAlerts(campaigns: CampaignMetrics[], periodDays?: number): Alert[] {
  const alerts: Alert[] = []
  let alertId = 0

  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const days = periodDays || new Date().getDate() // default: dia del mes actual

  for (const campaign of activeCampaigns) {
    const targets = KPI_TARGETS[campaign.platform] || KPI_TARGETS.default

    // ═══ PACING — comparar gasto promedio diario vs presupuesto diario ═══

    if (campaign.budget > 0 && days > 0) {
      const avgDailySpend = campaign.spend / days
      const pacingPct = (avgDailySpend / campaign.budget) * 100

      // Gasto promedio diario supera presupuesto diario en >20%
      if (pacingPct > 120) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'critical',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `Gasto diario promedio (${formatCLPSimple(avgDailySpend)}) supera presupuesto diario (${formatCLPSimple(campaign.budget)}) en ${(pacingPct - 100).toFixed(0)}%`,
          metric: 'pacing',
          currentValue: avgDailySpend,
          expectedValue: campaign.budget,
          detectedAt: new Date().toISOString(),
        })
      }

      // Subejecutando presupuesto (<50% del diario en promedio)
      if (pacingPct < 50 && days >= 3) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'warning',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `Pacing bajo: promedio diario ${formatCLPSimple(avgDailySpend)} de ${formatCLPSimple(campaign.budget)} (${pacingPct.toFixed(0)}%)`,
          metric: 'pacing',
          currentValue: avgDailySpend,
          expectedValue: campaign.budget,
          detectedAt: new Date().toISOString(),
        })
      }
    }

    // ═══ CPA ═══

    if (campaign.cpa > 0 && targets.maxCpa > 0) {
      // CPA >2x objetivo → critico
      if (campaign.cpa > targets.maxCpa * 2) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'critical',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `CPA ${formatCLPSimple(campaign.cpa)} supera 2x el objetivo de ${formatCLPSimple(targets.maxCpa)}`,
          metric: 'cpa',
          currentValue: campaign.cpa,
          expectedValue: targets.maxCpa,
          detectedAt: new Date().toISOString(),
        })
      }
      // CPA 20-100% sobre objetivo → warning
      else if (campaign.cpa > targets.maxCpa * 1.2) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'warning',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `CPA ${formatCLPSimple(campaign.cpa)} supera 20% el objetivo de ${formatCLPSimple(targets.maxCpa)}`,
          metric: 'cpa',
          currentValue: campaign.cpa,
          expectedValue: targets.maxCpa,
          detectedAt: new Date().toISOString(),
        })
      }
      // CPA 30%+ mejor que objetivo con volumen → oportunidad
      else if (campaign.cpa < targets.maxCpa * 0.7 && campaign.conversions >= 5) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'opportunity',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `CPA ${formatCLPSimple(campaign.cpa)} esta 30%+ bajo objetivo (${formatCLPSimple(targets.maxCpa)}). Oportunidad de escalar.`,
          metric: 'cpa',
          currentValue: campaign.cpa,
          expectedValue: targets.maxCpa,
          detectedAt: new Date().toISOString(),
        })
      }
    }

    // ═══ SIN CONVERSIONES ═══

    // Ajustar umbral al periodo: minSpend * dias
    const minSpendThreshold = targets.minSpendForConversionAlert * Math.max(days, 1)
    if (campaign.spend > minSpendThreshold && campaign.conversions === 0) {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: 'critical',
        platform: campaign.platform,
        campaignName: campaign.name,
        message: `Sin conversiones con ${formatCLPSimple(campaign.spend)} gastados en ${days} dias`,
        metric: 'conversions',
        currentValue: 0,
        expectedValue: '>0',
        detectedAt: new Date().toISOString(),
      })
    }

    // ═══ CTR BAJO ═══

    if (campaign.impressions > 500 && campaign.ctr < targets.minCtr) {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: 'warning',
        platform: campaign.platform,
        campaignName: campaign.name,
        message: `CTR de ${campaign.ctr.toFixed(2).replace('.', ',')}% por debajo del minimo (${targets.minCtr}%)`,
        metric: 'ctr',
        currentValue: campaign.ctr,
        expectedValue: targets.minCtr,
        detectedAt: new Date().toISOString(),
      })
    }
  }

  return alerts.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, opportunity: 2 }
    return order[a.severity] - order[b.severity]
  })
}

function formatCLPSimple(value: number): string {
  return '$' + Math.round(value).toLocaleString('es-CL')
}
