import { CampaignMetrics } from '@/lib/types'
import { MOCK_CAMPAIGNS } from '@/lib/mock/dashboardMock'

import { CampaignStatus } from '@/lib/types'

const microsToCLP = (micros: number): number => Math.round(micros / 1_000_000)

export async function fetchGoogleAds(startDate?: string, endDate?: string): Promise<CampaignMetrics[]> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    console.warn('[DEV] Google Ads sin credenciales → usando mock data')
    return MOCK_CAMPAIGNS.filter(c => c.platform === 'google')
  }

  try {
    const { GoogleAdsApi } = await import('google-ads-api')

    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    })

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    })

    // Default: mes actual (1ro a hoy)
    const now = new Date()
    const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const end = endDate || now.toISOString().split('T')[0]

    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.conversions,
        metrics.cost_per_conversion
      FROM campaign
      WHERE segments.date BETWEEN '${start}' AND '${end}'
        AND metrics.cost_micros > 0
      ORDER BY metrics.cost_micros DESC
    `)

    const statusMap: Record<string | number, CampaignStatus> = {
      ENABLED: 'active',
      PAUSED: 'paused',
      REMOVED: 'ended',
      2: 'active',   // google-ads-api devuelve enums numéricos
      3: 'paused',
      4: 'ended',
    }

    return campaigns.map((row: any): CampaignMetrics => ({
      id: `g-${row.campaign.id}`,
      name: row.campaign.name,
      platform: 'google',
      status: statusMap[row.campaign.status] || 'paused',
      spend: microsToCLP(Number(row.metrics.cost_micros || 0)),
      budget: microsToCLP(Number(row.campaign_budget.amount_micros || 0)),
      impressions: Number(row.metrics.impressions || 0),
      clicks: Number(row.metrics.clicks || 0),
      ctr: Number(row.metrics.ctr || 0) * 100,
      conversions: Math.round(Number(row.metrics.conversions || 0)),
      cpa: microsToCLP(Number(row.metrics.cost_per_conversion || 0)),
      updatedAt: new Date().toISOString(),
    }))
  } catch (error) {
    console.error('[Google Ads] Error:', error)
    throw error
  }
}
