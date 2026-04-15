// ═══ Discovery de cuentas publicitarias ═══
// Llama a este endpoint UNA VEZ para obtener todos los IDs de Google Ads y Meta
// Usar los resultados para completar src/config/pacing-clients.ts
// Protegido con CRON_SECRET para evitar exposición pública

import { NextRequest, NextResponse } from 'next/server'

const META_BASE = 'https://graph.facebook.com/v19.0'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [googleAccounts, metaAccounts] = await Promise.allSettled([
    discoverGoogleAdsAccounts(),
    discoverMetaAccounts(),
  ])

  return NextResponse.json({
    google: googleAccounts.status === 'fulfilled' ? googleAccounts.value : { error: String(googleAccounts.reason) },
    meta: metaAccounts.status === 'fulfilled' ? metaAccounts.value : { error: String(metaAccounts.reason) },
    timestamp: new Date().toISOString(),
  })
}

// ─── Google Ads: listar todas las cuentas bajo el MCC ───

async function discoverGoogleAdsAccounts() {
  const { GoogleAdsApi } = await import('google-ads-api')

  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  })

  // Conectar al MCC directamente
  const mcc = client.Customer({
    customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
    login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID!,
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
  })

  const rows = await mcc.query(`
    SELECT
      customer_client.id,
      customer_client.descriptive_name,
      customer_client.currency_code,
      customer_client.status,
      customer_client.level
    FROM customer_client
    WHERE customer_client.level = 1
    ORDER BY customer_client.descriptive_name
  `)

  return rows.map((row: any) => ({
    id: String(row.customer_client.id),
    name: row.customer_client.descriptive_name,
    currency: row.customer_client.currency_code,
    status: row.customer_client.status,
  }))
}

// ─── Meta: listar todas las ad accounts accesibles ───

async function discoverMetaAccounts() {
  const { ensureValidMetaToken } = await import('@/lib/fetchers/metaTokenRefresh')
  const token = await ensureValidMetaToken()

  // 1. Listar todos los Business Managers accesibles
  const bizRes = await fetch(
    `${META_BASE}/me/businesses?fields=id,name&limit=50&access_token=${token}`
  )
  const bizData = await bizRes.json()

  if (!bizData.data) {
    throw new Error(`Meta businesses error: ${JSON.stringify(bizData)}`)
  }

  const result: Array<{ businessId: string; businessName: string; accountId: string; accountName: string; status: number }> = []

  // 2. Para cada BM, listar cuentas propias y cuentas de clientes
  for (const biz of bizData.data) {
    const [owned, client] = await Promise.allSettled([
      fetchBizAccounts(token, biz.id, 'owned_ad_accounts'),
      fetchBizAccounts(token, biz.id, 'client_ad_accounts'),
    ])

    const accounts = [
      ...(owned.status === 'fulfilled' ? owned.value : []),
      ...(client.status === 'fulfilled' ? client.value : []),
    ]

    for (const acc of accounts) {
      // Evitar duplicados
      if (!result.find(r => r.accountId === acc.id)) {
        result.push({
          businessId: biz.id,
          businessName: biz.name,
          accountId: acc.id.replace('act_', ''),
          accountName: acc.name,
          status: acc.account_status,
        })
      }
    }
  }

  return result.sort((a, b) => a.accountName.localeCompare(b.accountName))
}

async function fetchBizAccounts(token: string, bizId: string, type: string) {
  const res = await fetch(
    `${META_BASE}/${bizId}/${type}?fields=id,name,account_status&limit=50&access_token=${token}`
  )
  const data = await res.json()
  return data.data || []
}

export const dynamic = 'force-dynamic'
