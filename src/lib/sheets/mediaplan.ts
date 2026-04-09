import { MediaPlanRow, MediaPlanComparison, CampaignMetrics, Platform } from '@/lib/types'
import { MOCK_MEDIA_PLAN } from '@/lib/mock/dashboardMock'

// ═══ Conexión a Google Sheets — Planilla de Medios ═══

export async function fetchMediaPlan(): Promise<MediaPlanRow[]> {
  if (!process.env.GOOGLE_SHEETS_API_KEY || !process.env.MEDIA_PLAN_SHEET_ID) {
    console.warn('[DEV] Google Sheets sin configurar → usando mock media plan')
    return MOCK_MEDIA_PLAN
  }

  const sheetId = process.env.MEDIA_PLAN_SHEET_ID
  const range = process.env.MEDIA_PLAN_RANGE || 'MediaPlan!A2:I100'
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status}`)
  }

  const data = await response.json()

  return (data.values || []).map((row: string[]): MediaPlanRow => ({
    platform: (row[0]?.toLowerCase() || 'google') as Platform,
    campaignName: row[1] || '',
    monthlyBudget: Number(row[2]) || 0,
    dailyBudget: Number(row[3]) || 0,
    kpiTarget: row[4] || 'CPA',
    kpiValue: Number(row[5]) || 0,
    startDate: row[6] || '',
    endDate: row[7] || '',
    status: row[8] || 'active',
  }))
}

// ═══ Comparar planilla vs datos reales ═══

export function compareWithMediaPlan(
  campaigns: CampaignMetrics[],
  mediaPlan: MediaPlanRow[]
): MediaPlanComparison[] {
  // SOLO comparar campañas activas contra planilla
  const activeCampaigns = campaigns.filter(c => c.status === 'active')
  const comparisons: MediaPlanComparison[] = []

  for (const planned of mediaPlan) {
    // Buscar campaña real que matchee por nombre y plataforma
    const actual = activeCampaigns.find(
      c => c.platform === planned.platform &&
        c.name.toLowerCase().includes(planned.campaignName.toLowerCase().split(' - ')[1]?.toLowerCase() || planned.campaignName.toLowerCase())
    )

    const actualSpend = actual?.spend || 0
    const actualKpi = actual?.cpa || 0

    const variance = actualSpend - planned.dailyBudget
    const variancePercent = planned.dailyBudget > 0
      ? ((actualSpend - planned.dailyBudget) / planned.dailyBudget) * 100
      : 0

    // On track si el gasto está dentro del ±20% y KPI está dentro del objetivo
    const spendOnTrack = Math.abs(variancePercent) <= 20
    const kpiOnTrack = planned.kpiValue > 0 ? actualKpi <= planned.kpiValue * 1.2 : true

    comparisons.push({
      platform: planned.platform,
      campaignName: planned.campaignName,
      plannedSpend: planned.dailyBudget,
      actualSpend,
      variance,
      variancePercent,
      plannedKpi: planned.kpiValue,
      actualKpi,
      onTrack: spendOnTrack && kpiOnTrack,
    })
  }

  return comparisons
}

// ═══ Detectar alertas de gasto vs planilla ═══

export function detectMediaPlanAlerts(comparisons: MediaPlanComparison[]) {
  const alerts: Array<{
    severity: 'critical' | 'warning'
    platform: string
    campaign: string
    message: string
  }> = []

  for (const comp of comparisons) {
    // Sobregasto >30% vs planilla
    if (comp.variancePercent > 30) {
      alerts.push({
        severity: 'critical',
        platform: comp.platform,
        campaign: comp.campaignName,
        message: `Gasto real supera planilla en ${comp.variancePercent.toFixed(0)}% ($${Math.round(comp.actualSpend).toLocaleString('es-CL')} vs $${Math.round(comp.plannedSpend).toLocaleString('es-CL')} planificado)`,
      })
    }

    // Subgasto >50% vs planilla
    if (comp.variancePercent < -50) {
      alerts.push({
        severity: 'warning',
        platform: comp.platform,
        campaign: comp.campaignName,
        message: `Gasto real muy por debajo de planilla (${Math.abs(comp.variancePercent).toFixed(0)}% menos)`,
      })
    }

    // KPI fuera de rango
    if (comp.plannedKpi > 0 && comp.actualKpi > comp.plannedKpi * 1.5) {
      alerts.push({
        severity: 'critical',
        platform: comp.platform,
        campaign: comp.campaignName,
        message: `CPA real ($${Math.round(comp.actualKpi).toLocaleString('es-CL')}) supera 50% el objetivo de planilla ($${Math.round(comp.plannedKpi).toLocaleString('es-CL')})`,
      })
    }
  }

  return alerts
}
