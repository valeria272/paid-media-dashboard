import { CampaignMetrics } from '@/lib/types'
import { MOCK_CAMPAIGNS } from '@/lib/mock/dashboardMock'
import { ensureValidMetaToken } from './metaTokenRefresh'

const BASE_URL = 'https://graph.facebook.com/v19.0'

export async function fetchMetaAds(startDate?: string, endDate?: string): Promise<CampaignMetrics[]> {
  if (!process.env.META_ACCESS_TOKEN) {
    console.warn('[DEV] Meta Ads sin credenciales → usando mock data')
    return MOCK_CAMPAIGNS.filter(c => c.platform === 'meta')
  }

  const token = await ensureValidMetaToken()
  const adAccount = `act_${process.env.META_AD_ACCOUNT_ID}`

  // Obtener IDs de campanas activas
  const activeCampaignsUrl = `${BASE_URL}/${adAccount}/campaigns?fields=id&filtering=${encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]))}&access_token=${token}`
  const activeCampaignsRes = await fetch(activeCampaignsUrl)
  const activeCampaignsData = await activeCampaignsRes.json()
  const activeIds = (activeCampaignsData.data || []).map((c: any) => c.id)

  if (activeIds.length === 0) {
    console.log('[Meta Ads] No hay campanas activas')
    return []
  }

  // Rango de fechas: default mes actual
  const now = new Date()
  const start = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const end = endDate || now.toISOString().split('T')[0]

  const params = new URLSearchParams({
    access_token: token,
    level: 'campaign',
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,actions,cost_per_action_type',
    filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: activeIds }]),
    time_range: JSON.stringify({ since: start, until: end }),
  })

  const response = await fetch(`${BASE_URL}/${adAccount}/insights?${params}`)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Meta Ads] API error:', response.status, errorText)
    throw new Error(`Meta Ads API error: ${response.status}`)
  }

  const json = await response.json()

  if (!json.data || json.data.length === 0) {
    return await fetchActiveCampaignsBasic(token, adAccount)
  }

  return (json.data || []).map((row: any): CampaignMetrics => {
    const leadActions = row.actions?.find((a: any) =>
      a.action_type === 'lead' || a.action_type === 'offsite_conversion' || a.action_type === 'onsite_conversion.lead_grouped'
    )
    const conversions = Number(leadActions?.value || 0)

    const leadCpa = row.cost_per_action_type?.find((a: any) =>
      a.action_type === 'lead' || a.action_type === 'offsite_conversion' || a.action_type === 'onsite_conversion.lead_grouped'
    )
    const cpa = Number(leadCpa?.value || 0)

    return {
      id: `m-${row.campaign_id}`,
      name: row.campaign_name,
      platform: 'meta',
      status: 'active',
      spend: Math.round(Number(row.spend || 0)),
      budget: 0,
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      ctr: Number(row.ctr || 0),
      conversions,
      cpa: Math.round(cpa),
      updatedAt: new Date().toISOString(),
    }
  })
}

async function fetchActiveCampaignsBasic(token: string, adAccount: string): Promise<CampaignMetrics[]> {
  const url = `${BASE_URL}/${adAccount}/campaigns?fields=name,status,effective_status,daily_budget&filtering=${encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]))}&access_token=${token}`
  const response = await fetch(url)
  if (!response.ok) return []
  const json = await response.json()

  return (json.data || []).map((row: any): CampaignMetrics => ({
    id: `m-${row.id}`,
    name: row.name,
    platform: 'meta',
    status: 'active',
    spend: 0,
    budget: Math.round(Number(row.daily_budget || 0) / 100),
    impressions: 0, clicks: 0, ctr: 0, conversions: 0, cpa: 0,
    updatedAt: new Date().toISOString(),
  }))
}
