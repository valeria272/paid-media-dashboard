// ═══ Google Analytics 4 — Visitas y conversiones web ═══

export interface WebMetrics {
  sessions: number
  users: number
  pageviews: number
  conversions: number   // eventos de lead/form_submit
  bounceRate: number
  avgSessionDuration: number
}

export interface WebMetricsByDay {
  date: string
  sessions: number
  conversions: number
}

export interface AsesoriasEvent {
  eventName: string
  eventCount: number
  users: number
}

export interface HeatmapCell {
  day: number    // GA4: 0=Domingo … 6=Sábado
  hour: number   // 0-23
  sessions: number
}

// ═══ Helper compartido ═══

async function ga4Request(propertyId: string, body: object): Promise<any> {
  const token = await getGoogleAccessToken()
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`GA4 ${res.status}: ${await res.text()}`)
  return res.json()
}

const ASESORIAS_FILTER = {
  dimensionFilter: {
    filter: {
      fieldName: 'hostname',
      stringFilter: { matchType: 'EXACT', value: 'asesorias.copywriters.cl' },
    },
  },
}

// ═══ copywriters.cl — métricas principales ═══

export async function fetchGA4Metrics(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<WebMetrics> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    console.warn('[DEV] GA4 sin credenciales → usando mock')
    return MOCK_WEB_METRICS
  }
  try {
    const data = await ga4Request(propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'conversions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
    })
    const v = data.rows?.[0]?.metricValues || []
    return {
      sessions: Number(v[0]?.value || 0),
      users: Number(v[1]?.value || 0),
      pageviews: Number(v[2]?.value || 0),
      conversions: Number(v[3]?.value || 0),
      bounceRate: Number(v[4]?.value || 0),
      avgSessionDuration: Number(v[5]?.value || 0),
    }
  } catch (error) {
    console.error('[GA4] Error:', error)
    return MOCK_WEB_METRICS
  }
}

export async function fetchGA4DailyData(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<WebMetricsByDay[]> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return []
  try {
    const data = await ga4Request(propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    })
    return (data.rows || []).map((row: any) => ({
      date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      sessions: Number(row.metricValues[0]?.value || 0),
      conversions: Number(row.metricValues[1]?.value || 0),
    }))
  } catch {
    return []
  }
}

export async function fetchGA4ConversionPages(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ page: string; conversions: number; sessions: number }>> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return []
  try {
    const data = await ga4Request(propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: 'gracias' },
        },
      },
    })
    return (data.rows || []).map((row: any) => ({
      page: row.dimensionValues[0].value,
      sessions: Number(row.metricValues[0]?.value || 0),
      conversions: Number(row.metricValues[1]?.value || 0),
    }))
  } catch {
    return []
  }
}

// ═══ asesorias.copywriters.cl — filtrado por hostname ═══

export async function fetchAsesoriasMetrics(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<WebMetrics> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return MOCK_WEB_METRICS
  try {
    const data = await ga4Request(propertyId, {
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'screenPageViews' },
        { name: 'conversions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
      ],
      ...ASESORIAS_FILTER,
    })
    const v = data.rows?.[0]?.metricValues || []
    return {
      sessions: Number(v[0]?.value || 0),
      users: Number(v[1]?.value || 0),
      pageviews: Number(v[2]?.value || 0),
      conversions: Number(v[3]?.value || 0),
      bounceRate: Number(v[4]?.value || 0),
      avgSessionDuration: Number(v[5]?.value || 0),
    }
  } catch (error) {
    console.error('[GA4 Asesorias] Metrics error:', error)
    return MOCK_WEB_METRICS
  }
}

export async function fetchAsesoriasDaily(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<WebMetricsByDay[]> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return []
  try {
    const data = await ga4Request(propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'sessions' }, { name: 'conversions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      ...ASESORIAS_FILTER,
    })
    return (data.rows || []).map((row: any) => ({
      date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      sessions: Number(row.metricValues[0]?.value || 0),
      conversions: Number(row.metricValues[1]?.value || 0),
    }))
  } catch {
    return []
  }
}

const EXCLUDED_EVENTS = new Set(['session_start', 'user_engagement', 'first_visit'])

export async function fetchAsesoriasEvents(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<AsesoriasEvent[]> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return []
  try {
    const data = await ga4Request(propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 20,
      ...ASESORIAS_FILTER,
    })
    return (data.rows || [])
      .map((row: any) => ({
        eventName: row.dimensionValues[0].value,
        eventCount: Number(row.metricValues[0]?.value || 0),
        users: Number(row.metricValues[1]?.value || 0),
      }))
      .filter((e: AsesoriasEvent) => !EXCLUDED_EVENTS.has(e.eventName))
  } catch {
    return []
  }
}

export async function fetchAsesoriasHeatmap(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<HeatmapCell[]> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return []
  try {
    const data = await ga4Request(propertyId, {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'dayOfWeek' }, { name: 'hour' }],
      metrics: [{ name: 'sessions' }],
      ...ASESORIAS_FILTER,
    })
    return (data.rows || []).map((row: any) => ({
      day: Number(row.dimensionValues[0].value),
      hour: Number(row.dimensionValues[1].value),
      sessions: Number(row.metricValues[0]?.value || 0),
    }))
  } catch {
    return []
  }
}

// ═══ Helpers ═══

async function getGoogleAccessToken(): Promise<string> {
  const { google } = await import('googleapis')
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  })
  const { token } = await oauth2Client.getAccessToken()
  return token || ''
}

const MOCK_WEB_METRICS: WebMetrics = {
  sessions: 0,
  users: 0,
  pageviews: 0,
  conversions: 0,
  bounceRate: 0,
  avgSessionDuration: 0,
}
