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
    const token = await getGoogleAccessToken()

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'screenPageViews' },
            { name: 'conversions' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
        }),
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error('[GA4] Error:', response.status, err)
      throw new Error(`GA4 API error: ${response.status}`)
    }

    const data = await response.json()
    const values = data.rows?.[0]?.metricValues || []

    return {
      sessions: Number(values[0]?.value || 0),
      users: Number(values[1]?.value || 0),
      pageviews: Number(values[2]?.value || 0),
      conversions: Number(values[3]?.value || 0),
      bounceRate: Number(values[4]?.value || 0),
      avgSessionDuration: Number(values[5]?.value || 0),
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
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return []
  }

  try {
    const token = await getGoogleAccessToken()

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'sessions' },
            { name: 'conversions' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        }),
      }
    )

    if (!response.ok) return []

    const data = await response.json()

    return (data.rows || []).map((row: any) => ({
      date: row.dimensionValues[0].value.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
      sessions: Number(row.metricValues[0]?.value || 0),
      conversions: Number(row.metricValues[1]?.value || 0),
    }))
  } catch {
    return []
  }
}

// Obtener paginas de conversion (gracias, thank-you, etc)
export async function fetchGA4ConversionPages(
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<Array<{ page: string; conversions: number; sessions: number }>> {
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) return []

  try {
    const token = await getGoogleAccessToken()

    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'sessions' },
            { name: 'conversions' },
          ],
          dimensionFilter: {
            filter: {
              fieldName: 'pagePath',
              stringFilter: {
                matchType: 'CONTAINS',
                value: 'gracias',
              },
            },
          },
        }),
      }
    )

    if (!response.ok) return []

    const data = await response.json()

    return (data.rows || []).map((row: any) => ({
      page: row.dimensionValues[0].value,
      sessions: Number(row.metricValues[0]?.value || 0),
      conversions: Number(row.metricValues[1]?.value || 0),
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
