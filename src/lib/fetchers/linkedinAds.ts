import { CampaignMetrics } from '@/lib/types'
import { MOCK_CAMPAIGNS } from '@/lib/mock/dashboardMock'

const BASE_URL = 'https://api.linkedin.com/v2'

export async function fetchLinkedinAds(): Promise<CampaignMetrics[]> {
  if (!process.env.LINKEDIN_ACCESS_TOKEN) {
    console.warn('[DEV] LinkedIn Ads sin credenciales → usando mock data')
    return MOCK_CAMPAIGNS.filter(c => c.platform === 'linkedin')
  }

  const now = new Date()
  const day = now.getDate()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const accountId = process.env.LINKEDIN_ACCOUNT_ID

  const analyticsUrl = `${BASE_URL}/adAnalyticsV2?q=analytics&pivot=CAMPAIGN&dateRange.start.day=${day}&dateRange.start.month=${month}&dateRange.start.year=${year}&timeGranularity=DAILY&accounts=urn:li:sponsoredAccount:${accountId}&fields=costInLocalCurrency,impressions,clicks,externalWebsiteConversions`

  const response = await fetch(analyticsUrl, {
    headers: {
      Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  })

  if (!response.ok) {
    throw new Error(`LinkedIn Ads API error: ${response.status}`)
  }

  const json = await response.json()

  return (json.elements || []).map((row: any, index: number): CampaignMetrics => {
    const spend = Math.round(Number(row.costInLocalCurrency || 0))
    const conversions = Number(row.externalWebsiteConversions || 0)

    return {
      id: `l-${index}`,
      name: `LinkedIn Campaign ${index + 1}`,
      platform: 'linkedin',
      status: 'active',
      spend,
      budget: 0,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
      conversions,
      cpa: conversions > 0 ? Math.round(spend / conversions) : 0,
      updatedAt: new Date().toISOString(),
    }
  })
}
