import { CampaignMetrics, DashboardSummary, MediaPlanRow } from '@/lib/types'

// ═══ MVP CopyLab — Campañas reales de la agencia ═══
// Escenarios diseñados para probar TODAS las alertas del sistema

export const MOCK_CAMPAIGNS: CampaignMetrics[] = [
  // ─── GOOGLE ADS ────────────────────────────────────────
  {
    id: 'g-1',
    name: 'CopyLab | Brand Search',
    platform: 'google',
    status: 'active',
    spend: 82000,
    budget: 100000,
    impressions: 14200,
    clicks: 710,
    ctr: 5.0,
    conversions: 22,
    cpa: 3727,       // Excelente — debería disparar OPORTUNIDAD de escalar
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'g-2',
    name: 'CopyLab | PMax Leads',
    platform: 'google',
    status: 'active',
    spend: 155000,     // Sobregasto >120% — dispara ALERTA CRÍTICA
    budget: 120000,
    impressions: 38000,
    clicks: 570,
    ctr: 1.5,
    conversions: 5,
    cpa: 31000,        // Sobre objetivo — dispara WARNING
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'g-3',
    name: 'CopyLab | DSA Servicios',
    platform: 'google',
    status: 'active',
    spend: 65000,       // Gasto sin conversiones — dispara ALERTA CRÍTICA
    budget: 90000,
    impressions: 8900,
    clicks: 89,
    ctr: 1.0,           // CTR bajo — dispara WARNING
    conversions: 0,
    cpa: 0,
    updatedAt: new Date().toISOString(),
  },

  // ─── META ADS ──────────────────────────────────────────
  {
    id: 'm-1',
    name: 'CopyLab | Prospección RM',
    platform: 'meta',
    status: 'active',
    spend: 135000,
    budget: 150000,
    impressions: 52000,
    clicks: 624,
    ctr: 1.2,
    conversions: 15,
    cpa: 9000,         // Bueno, bajo objetivo
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm-2',
    name: 'CopyLab | Retargeting Web',
    platform: 'meta',
    status: 'active',
    spend: 38000,
    budget: 80000,      // Pacing bajo ~47% — si es PM dispara CRÍTICA
    impressions: 18500,
    clicks: 296,
    ctr: 1.6,
    conversions: 11,
    cpa: 3455,          // Excelente — dispara OPORTUNIDAD
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'm-3',
    name: 'CopyLab | Lookalike Compradores',
    platform: 'meta',
    status: 'active',
    spend: 92000,
    budget: 100000,
    impressions: 41000,
    clicks: 164,
    ctr: 0.4,           // CTR bajo — dispara WARNING
    conversions: 3,
    cpa: 30667,          // CPA >2x objetivo — dispara ALERTA CRÍTICA
    updatedAt: new Date().toISOString(),
  },

  // ─── TIKTOK ADS ────────────────────────────────────────
  {
    id: 't-1',
    name: 'CopyLab | Video Awareness',
    platform: 'tiktok',
    status: 'active',
    spend: 55000,
    budget: 70000,
    impressions: 120000,
    clicks: 2400,
    ctr: 2.0,
    conversions: 3,
    cpa: 18333,         // Apenas sobre objetivo
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't-2',
    name: 'CopyLab | Spark Ads Creadores',
    platform: 'tiktok',
    status: 'active',
    spend: 42000,        // Gasto sin conversiones — dispara ALERTA CRÍTICA
    budget: 60000,
    impressions: 85000,
    clicks: 1700,
    ctr: 2.0,
    conversions: 0,
    cpa: 0,
    updatedAt: new Date().toISOString(),
  },

  // ─── LINKEDIN ADS ──────────────────────────────────────
  {
    id: 'l-1',
    name: 'CopyLab | Lead Gen Directores MKT',
    platform: 'linkedin',
    status: 'active',
    spend: 175000,
    budget: 200000,
    impressions: 9200,
    clicks: 184,
    ctr: 2.0,
    conversions: 3,
    cpa: 58333,         // Dentro del rango
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'l-2',
    name: 'CopyLab | Sponsored Content Tech',
    platform: 'linkedin',
    status: 'active',
    spend: 110000,
    budget: 150000,
    impressions: 6800,
    clicks: 136,
    ctr: 2.0,
    conversions: 1,
    cpa: 110000,         // CPA altísimo — dispara ALERTA CRÍTICA
    updatedAt: new Date().toISOString(),
  },
]

// ═══ Mock Spend History (últimos 30 días) ═══
// Genera curva realista con tendencia y variación diaria

export function generateSpendHistory(days = 30) {
  const history = []
  const now = new Date()
  // Seed para consistencia visual (mismo patrón cada vez que se carga)
  let seed = 42

  function seededRandom() {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  for (let i = days; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const dayOfWeek = date.getDay()

    // Fines de semana gastan menos
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1.0
    // Tendencia creciente leve en el mes
    const trendFactor = 1 + ((days - i) / days) * 0.15

    const baseSpend = 750000 * weekendFactor * trendFactor + (seededRandom() - 0.5) * 150000
    const baseBudget = 950000

    history.push({
      date: dateStr,
      spend: Math.round(Math.max(baseSpend, 400000)),
      budget: baseBudget,
    })
  }

  return history
}

// ═══ Mock Media Plan ═══

export const MOCK_MEDIA_PLAN: MediaPlanRow[] = [
  {
    platform: 'google',
    campaignName: 'CopyLab | Brand Search',
    monthlyBudget: 3000000,
    dailyBudget: 100000,
    kpiTarget: 'CPA',
    kpiValue: 5000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'google',
    campaignName: 'CopyLab | PMax Leads',
    monthlyBudget: 3600000,
    dailyBudget: 120000,
    kpiTarget: 'CPA',
    kpiValue: 25000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'google',
    campaignName: 'CopyLab | DSA Servicios',
    monthlyBudget: 2700000,
    dailyBudget: 90000,
    kpiTarget: 'CPA',
    kpiValue: 20000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'meta',
    campaignName: 'CopyLab | Prospección RM',
    monthlyBudget: 4500000,
    dailyBudget: 150000,
    kpiTarget: 'CPA',
    kpiValue: 12000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'meta',
    campaignName: 'CopyLab | Retargeting Web',
    monthlyBudget: 2400000,
    dailyBudget: 80000,
    kpiTarget: 'CPA',
    kpiValue: 6000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'meta',
    campaignName: 'CopyLab | Lookalike Compradores',
    monthlyBudget: 3000000,
    dailyBudget: 100000,
    kpiTarget: 'CPA',
    kpiValue: 13000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'tiktok',
    campaignName: 'CopyLab | Video Awareness',
    monthlyBudget: 2100000,
    dailyBudget: 70000,
    kpiTarget: 'CPA',
    kpiValue: 18000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'tiktok',
    campaignName: 'CopyLab | Spark Ads Creadores',
    monthlyBudget: 1800000,
    dailyBudget: 60000,
    kpiTarget: 'CPA',
    kpiValue: 16000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'linkedin',
    campaignName: 'CopyLab | Lead Gen Directores MKT',
    monthlyBudget: 6000000,
    dailyBudget: 200000,
    kpiTarget: 'CPA',
    kpiValue: 55000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
  {
    platform: 'linkedin',
    campaignName: 'CopyLab | Sponsored Content Tech',
    monthlyBudget: 4500000,
    dailyBudget: 150000,
    kpiTarget: 'CPA',
    kpiValue: 50000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    status: 'active',
  },
]

// ═══ Build Summary from Campaigns ═══

export function buildSummary(campaigns: CampaignMetrics[]): Omit<DashboardSummary, 'alerts' | 'lastUpdated'> {
  // SOLO procesar campañas activas
  campaigns = campaigns.filter(c => c.status === 'active')
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0)
  const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0)
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0)
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0)
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)

  const byPlatform: Record<string, any> = {}
  for (const c of campaigns) {
    if (!byPlatform[c.platform]) {
      byPlatform[c.platform] = {
        spend: 0, budget: 0, impressions: 0, clicks: 0,
        ctr: 0, conversions: 0, cpa: 0, campaignCount: 0, activeCampaignCount: 0,
      }
    }
    const p = byPlatform[c.platform]
    p.spend += c.spend
    p.budget += c.budget
    p.impressions += c.impressions
    p.clicks += c.clicks
    p.conversions += c.conversions
    p.campaignCount++
    if (c.status === 'active') p.activeCampaignCount++
  }

  for (const key of Object.keys(byPlatform)) {
    const p = byPlatform[key]
    p.ctr = p.impressions > 0 ? (p.clicks / p.impressions) * 100 : 0
    p.cpa = p.conversions > 0 ? p.spend / p.conversions : 0
  }

  return {
    totalSpend,
    totalBudget,
    totalImpressions,
    totalClicks,
    totalConversions,
    avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    avgCpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
    byPlatform,
  }
}
