import { CampaignMetrics, Alert } from '@/lib/types'
import { KPI_TARGETS } from '@/config/kpis'

export function detectAlerts(campaigns: CampaignMetrics[]): Alert[] {
  const alerts: Alert[] = []
  let alertId = 0

  // SOLO analizar campañas activas — ignorar pausadas, desactivadas, terminadas
  const activeCampaigns = campaigns.filter(c => c.status === 'active')

  for (const campaign of activeCampaigns) {
    const targets = KPI_TARGETS[campaign.platform] || KPI_TARGETS.default

    // ═══ CRÍTICOS ═══

    // Sobregasto
    if (campaign.budget > 0) {
      const pacingPct = (campaign.spend / campaign.budget) * 100
      if (pacingPct > 120) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'critical',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `Gasto supera el presupuesto diario en ${(pacingPct - 100).toFixed(0)}%`,
          metric: 'pacing',
          currentValue: campaign.spend,
          expectedValue: campaign.budget,
          detectedAt: new Date().toISOString(),
        })
      }

      // Presupuesto frenado (después de mediodía)
      if (pacingPct < 50 && isAfterNoon()) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'critical',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `Campaña ejecutando solo el ${pacingPct.toFixed(0)}% del presupuesto diario`,
          metric: 'pacing',
          currentValue: campaign.spend,
          expectedValue: campaign.budget,
          detectedAt: new Date().toISOString(),
        })
      }
    }

    // CPA muy alto vs objetivo (2x)
    if (campaign.cpa > 0 && targets.maxCpa > 0) {
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
    }

    // Sin conversiones con gasto significativo
    if (campaign.spend > targets.minSpendForConversionAlert && campaign.conversions === 0) {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: 'critical',
        platform: campaign.platform,
        campaignName: campaign.name,
        message: `Sin conversiones con ${formatCLPSimple(campaign.spend)} gastados`,
        metric: 'conversions',
        currentValue: 0,
        expectedValue: '>0',
        detectedAt: new Date().toISOString(),
      })
    }

    // ═══ ADVERTENCIAS ═══

    // CTR muy bajo
    if (campaign.impressions > 500 && campaign.ctr < targets.minCtr) {
      alerts.push({
        id: `alert-${++alertId}`,
        severity: 'warning',
        platform: campaign.platform,
        campaignName: campaign.name,
        message: `CTR de ${campaign.ctr.toFixed(2).replace('.', ',')}% está por debajo del mínimo esperado (${targets.minCtr}%)`,
        metric: 'ctr',
        currentValue: campaign.ctr,
        expectedValue: targets.minCtr,
        detectedAt: new Date().toISOString(),
      })
    }

    // CPA alto (no crítico, 1.2x - 2x del objetivo)
    if (campaign.cpa > 0 && targets.maxCpa > 0) {
      if (campaign.cpa > targets.maxCpa * 1.2 && campaign.cpa <= targets.maxCpa * 2) {
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
    }

    // ═══ OPORTUNIDADES ═══

    // CPA mejor que objetivo → oportunidad de escalar
    if (campaign.cpa > 0 && targets.maxCpa > 0) {
      if (campaign.cpa < targets.maxCpa * 0.7 && campaign.conversions >= 5) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'opportunity',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `CPA ${formatCLPSimple(campaign.cpa)} es 30%+ mejor que objetivo. Oportunidad de escalar presupuesto.`,
          metric: 'cpa',
          currentValue: campaign.cpa,
          expectedValue: targets.maxCpa,
          detectedAt: new Date().toISOString(),
        })
      }
    }

    // Presupuesto subutilizado
    if (campaign.budget > 0) {
      const pacingPct = (campaign.spend / campaign.budget) * 100
      if (pacingPct < 40 && isAfterNoon()) {
        alerts.push({
          id: `alert-${++alertId}`,
          severity: 'opportunity',
          platform: campaign.platform,
          campaignName: campaign.name,
          message: `Presupuesto subutilizado (${pacingPct.toFixed(0)}%). Considerar revisar pujas o segmentación.`,
          metric: 'pacing',
          currentValue: campaign.spend,
          expectedValue: campaign.budget,
          detectedAt: new Date().toISOString(),
        })
      }
    }
  }

  // Ordenar: críticos primero, luego advertencias, luego oportunidades
  return alerts.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, warning: 1, opportunity: 2 }
    return order[a.severity] - order[b.severity]
  })
}

function isAfterNoon(): boolean {
  return new Date().getHours() >= 12
}

function formatCLPSimple(value: number): string {
  return '$' + Math.round(value).toLocaleString('es-CL')
}
