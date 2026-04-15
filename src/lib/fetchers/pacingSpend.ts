// ═══ Gasto real por cliente + canal para un rango de fechas ═══
// Usado por el sistema de pacing para comparar vs presupuesto aprobado

const META_BASE = 'https://graph.facebook.com/v19.0'
const TIKTOK_BASE = 'https://business-api.tiktok.com/open_api/v1.3'

// ─── Google Ads ──────────────────────────────────────────────────────────────

/**
 * Retorna el gasto total en CLP de una cuenta Google Ads para un período.
 * Solo campañas con gasto real (metrics.cost_micros > 0).
 * campaignNameFilter: si se indica, filtra campañas cuyo nombre contenga ese texto (LIKE).
 */
export async function fetchGoogleAdsSpendByAccount(
  customerId: string,
  startDate: string,
  endDate: string,
  campaignNameFilter?: string
): Promise<number> {
  const { GoogleAdsApi } = await import('google-ads-api')

  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  })

  const customer = client.Customer({
    customer_id: customerId.replace(/-/g, ''),
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  })

  const nameFilter = campaignNameFilter
    ? `AND campaign.name LIKE '%${campaignNameFilter}%'`
    : ''

  const rows = await customer.query(`
    SELECT metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND metrics.cost_micros > 0
      ${nameFilter}
  `)

  const totalMicros = rows.reduce(
    (sum: number, row: any) => sum + Number(row.metrics.cost_micros || 0),
    0
  )

  return Math.round(totalMicros / 1_000_000)
}

// ─── Meta Ads ─────────────────────────────────────────────────────────────────

/**
 * Retorna el gasto total en CLP de una cuenta Meta Ads para un período.
 * Solo campañas activas con gasto real.
 * campaignNameFilter: si se indica, filtra a nivel campaña por nombre (contiene).
 */
export async function fetchMetaAdsSpendByAccount(
  adAccountId: string,
  startDate: string,
  endDate: string,
  campaignNameFilter?: string
): Promise<number> {
  const { ensureValidMetaToken } = await import('./metaTokenRefresh')
  const token = await ensureValidMetaToken()

  const account = `act_${adAccountId}`

  // Si hay filtro por nombre, buscamos a nivel campaña y filtramos client-side
  if (campaignNameFilter) {
    const params = new URLSearchParams({
      access_token: token,
      level: 'campaign',
      fields: 'campaign_name,spend',
      time_range: JSON.stringify({ since: startDate, until: endDate }),
      // Sin filtro de effective_status: una campaña puede estar pausada hoy
      // pero haber tenido gasto en el período consultado
      limit: '500',
    })

    const res = await fetch(`${META_BASE}/${account}/insights?${params}`)
    if (!res.ok) {
      const text = await res.text()
      console.error(`[Meta pacing] Error cuenta ${adAccountId} (campaña):`, res.status, text)
      return 0
    }

    const json = await res.json()
    const filterLower = campaignNameFilter.toLowerCase()
    const matching = (json.data || []).filter(
      (c: any) => c.campaign_name?.toLowerCase().includes(filterLower)
    )
    const total = matching.reduce((sum: number, c: any) => sum + Number(c.spend || 0), 0)
    return Math.round(total)
  }

  // Sin filtro: gasto total de la cuenta en el período
  const params = new URLSearchParams({
    access_token: token,
    level: 'account',
    fields: 'spend',
    time_range: JSON.stringify({ since: startDate, until: endDate }),
  })

  const res = await fetch(`${META_BASE}/${account}/insights?${params}`)

  if (!res.ok) {
    const text = await res.text()
    console.error(`[Meta pacing] Error cuenta ${adAccountId}:`, res.status, text)
    return 0
  }

  const json = await res.json()
  const spend = Number(json.data?.[0]?.spend || 0)
  return Math.round(spend)
}

// ─── TikTok Ads ───────────────────────────────────────────────────────────────

/**
 * Retorna el gasto total en CLP de una cuenta TikTok Ads para un período.
 * Solo campañas activas (CAMPAIGN_STATUS_ENABLE).
 */
export async function fetchTiktokAdsSpendByAccount(
  advertiserId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  if (!process.env.TIKTOK_ACCESS_TOKEN) {
    console.warn('[TikTok pacing] Sin token → retornando 0')
    return 0
  }

  const res = await fetch(`${TIKTOK_BASE}/report/integrated/get/`, {
    method: 'POST',
    headers: {
      'Access-Token': process.env.TIKTOK_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      dimensions: ['advertiser_id'],
      metrics: ['spend'],
      data_level: 'AUCTION_ADVERTISER',
      start_date: startDate,
      end_date: endDate,
      filtering: { campaign_status: 'CAMPAIGN_STATUS_ENABLE' },
    }),
  })

  if (!res.ok) {
    console.error(`[TikTok pacing] Error cuenta ${advertiserId}:`, res.status)
    return 0
  }

  const json = await res.json()

  if (json.code !== 0) {
    console.error(`[TikTok pacing] API error:`, json.message)
    return 0
  }

  const spend = Number(json.data?.list?.[0]?.metrics?.spend || 0)
  return Math.round(spend)
}

// ─── Dispatcher: fetchSpendByChannel ─────────────────────────────────────────

export type PacingChannel = 'Google Ads' | 'Meta Ads' | 'Tik Tok Ads'

/**
 * Fetcha el gasto de un cliente en un canal específico para el período dado.
 * Retorna null si no hay ID configurado para ese canal.
 */
export async function fetchSpendByChannel(
  client: { googleAdsId?: string; metaAdAccountId?: string; tiktokAdvertiserId?: string; googleCampaignFilter?: string; metaCampaignFilter?: string },
  channel: PacingChannel,
  startDate: string,
  endDate: string
): Promise<number | null> {
  try {
    switch (channel) {
      case 'Google Ads':
        if (!client.googleAdsId || client.googleAdsId === 'PENDING') return null
        return await fetchGoogleAdsSpendByAccount(client.googleAdsId, startDate, endDate, client.googleCampaignFilter)

      case 'Meta Ads':
        if (!client.metaAdAccountId || client.metaAdAccountId === 'PENDING') return null
        return await fetchMetaAdsSpendByAccount(client.metaAdAccountId, startDate, endDate, client.metaCampaignFilter)

      case 'Tik Tok Ads':
        if (!client.tiktokAdvertiserId || client.tiktokAdvertiserId === 'PENDING') return null
        return await fetchTiktokAdsSpendByAccount(client.tiktokAdvertiserId, startDate, endDate)

      default:
        return null
    }
  } catch (error) {
    console.error(`[pacing] Error fetchando ${channel}:`, error)
    return null
  }
}
