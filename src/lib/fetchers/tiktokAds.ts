import { CampaignMetrics } from '@/lib/types'
import { MOCK_CAMPAIGNS } from '@/lib/mock/dashboardMock'

const BASE_URL = 'https://business-api.tiktok.com/open_api/v1.3'

export async function fetchTiktokAds(): Promise<CampaignMetrics[]> {
  if (!process.env.TIKTOK_ACCESS_TOKEN) {
    console.warn('[DEV] TikTok Ads sin credenciales → usando mock data')
    return MOCK_CAMPAIGNS.filter(c => c.platform === 'tiktok')
  }

  const today = new Date().toISOString().split('T')[0]

  const response = await fetch(`${BASE_URL}/report/integrated/get/`, {
    method: 'POST',
    headers: {
      'Access-Token': process.env.TIKTOK_ACCESS_TOKEN!,
      'Content-Type': 'application/json',
    },
    // SOLO campañas activas — filtrar por status CAMPAIGN_STATUS_ENABLE
    body: JSON.stringify({
      advertiser_id: process.env.TIKTOK_ADVERTISER_ID,
      report_type: 'BASIC',
      dimensions: ['campaign_id'],
      metrics: ['spend', 'impressions', 'clicks', 'ctr', 'conversion', 'cost_per_conversion'],
      data_level: 'AUCTION_CAMPAIGN',
      start_date: today,
      end_date: today,
      filtering: {
        campaign_status: 'CAMPAIGN_STATUS_ENABLE',
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`TikTok Ads API error: ${response.status}`)
  }

  const json = await response.json()

  return (json.data?.list || []).map((row: any): CampaignMetrics => ({
    id: `t-${row.dimensions.campaign_id}`,
    name: row.dimensions.campaign_name || `Campaign ${row.dimensions.campaign_id}`,
    platform: 'tiktok',
    status: 'active',
    spend: Math.round(Number(row.metrics.spend || 0)),
    budget: 0,
    impressions: Number(row.metrics.impressions || 0),
    clicks: Number(row.metrics.clicks || 0),
    ctr: Number(row.metrics.ctr || 0) * 100,
    conversions: Number(row.metrics.conversion || 0),
    cpa: Math.round(Number(row.metrics.cost_per_conversion || 0)),
    updatedAt: new Date().toISOString(),
  }))
}
