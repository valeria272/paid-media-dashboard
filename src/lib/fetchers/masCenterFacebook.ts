// ═══ Facebook Page Organic — Mas Center ═══
// Env vars requeridos:
//   MAS_CENTER_FB_TOKEN    — Page Access Token (o User token con pages_read_engagement)
//   MAS_CENTER_FB_PAGE_ID  — Facebook Page ID

const FB_BASE = 'https://graph.facebook.com/v19.0'

export interface FacebookPost {
  id: string
  message?: string
  created_time: string
  full_picture?: string
  permalink_url: string
  reactions_count: number
  comments_count: number
  shares_count: number
  reach?: number
  impressions?: number
  type: 'video' | 'photo' | 'link' | 'status'
  engagement_rate?: number
}

export interface MasCenterFacebookData {
  page_name: string
  page_id: string
  fan_count: number           // total seguidores
  fan_adds_month: number      // nuevos seguidores este mes
  reach_month: number         // alcance único mensual
  impressions_month: number   // impresiones totales
  engaged_users_month: number
  page_views_month: number
  posts: FacebookPost[]
  // Series para gráfico (últimos 30 días)
  reach_series: { date: string; value: number }[]
  // Comparativa (vs mismo período mes anterior)
  comparison: {
    current_month: string
    prev_month: string
    current_reach: number
    prev_reach: number
    current_engaged: number
    prev_engaged: number
    reach_pct: number
    engaged_pct: number
  }
  fetchedAt: string
}

async function fbFetch(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`${FB_BASE}${path}`)
  url.searchParams.set('access_token', token)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  const data = await res.json() as Record<string, unknown>
  if (data.error) throw new Error((data.error as { message: string }).message)
  return data
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 1000) / 10
}

export async function fetchMasCenterFacebook(): Promise<MasCenterFacebookData> {
  const token = process.env.MAS_CENTER_FB_TOKEN
  const pageId = process.env.MAS_CENTER_FB_PAGE_ID
  if (!token) throw new Error('MAS_CENTER_FB_TOKEN no configurado')
  if (!pageId) throw new Error('MAS_CENTER_FB_PAGE_ID no configurado')

  const today = new Date()
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const prevMonthEnd = new Date(currentMonthStart.getTime() - 86400000)
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
  const daysElapsed = Math.ceil((today.getTime() - currentMonthStart.getTime()) / 86400000) || 1
  const prevEquivalentEnd = new Date(prevMonthStart)
  prevEquivalentEnd.setDate(prevMonthStart.getDate() + daysElapsed)

  const nowTs = Math.floor(today.getTime() / 1000)
  const monthStartTs = Math.floor(currentMonthStart.getTime() / 1000)
  const prevStartTs = Math.floor(prevMonthStart.getTime() / 1000)
  const prevEndTs = Math.floor(prevEquivalentEnd.getTime() / 1000)
  const thirtyDaysAgo = nowTs - 30 * 86400

  // ── Info básica de la página ─────────────────────────────
  const pageInfo = await fbFetch(`/${pageId}`, token, {
    fields: 'name,fan_count',
  }) as { name: string; fan_count: number }

  // ── Métricas de la página (mes actual) ───────────────────
  let reach_month = 0
  let impressions_month = 0
  let engaged_users_month = 0
  let page_views_month = 0
  let fan_adds_month = 0
  let reach_series: { date: string; value: number }[] = []

  try {
    const insightsRes = await fbFetch(`/${pageId}/insights`, token, {
      metric: 'page_impressions_unique,page_impressions,page_engaged_users,page_views_total,page_fan_adds_unique',
      period: 'day',
      since: String(thirtyDaysAgo),
      until: String(nowTs),
    }) as {
      data: {
        name: string
        values: { value: number; end_time: string }[]
      }[]
    }

    for (const metric of insightsRes.data || []) {
      const monthly = metric.values
        .filter(v => new Date(v.end_time) >= currentMonthStart)
        .reduce((s, v) => s + v.value, 0)

      switch (metric.name) {
        case 'page_impressions_unique': reach_month = monthly; break
        case 'page_impressions': impressions_month = monthly; break
        case 'page_engaged_users': engaged_users_month = monthly; break
        case 'page_views_total': page_views_month = monthly; break
        case 'page_fan_adds_unique': fan_adds_month = monthly; break
      }

      if (metric.name === 'page_impressions_unique') {
        reach_series = metric.values.map(v => ({
          date: v.end_time.slice(0, 10),
          value: v.value,
        }))
      }
    }
  } catch { /* insights opcionales */ }

  // ── Comparativa mensual ───────────────────────────────────
  let comparison = {
    current_month: today.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
    prev_month: prevMonthEnd.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
    current_reach: reach_month,
    prev_reach: 0,
    current_engaged: engaged_users_month,
    prev_engaged: 0,
    reach_pct: 0,
    engaged_pct: 0,
  }

  try {
    const prevInsRes = await fbFetch(`/${pageId}/insights`, token, {
      metric: 'page_impressions_unique,page_engaged_users',
      period: 'day',
      since: String(prevStartTs),
      until: String(prevEndTs),
    }) as { data: { name: string; values: { value: number }[] }[] }

    let prevReach = 0
    let prevEngaged = 0
    for (const m of prevInsRes.data || []) {
      const total = m.values.reduce((s, v) => s + v.value, 0)
      if (m.name === 'page_impressions_unique') prevReach = total
      if (m.name === 'page_engaged_users') prevEngaged = total
    }
    comparison = {
      ...comparison,
      prev_reach: prevReach,
      prev_engaged: prevEngaged,
      reach_pct: pctChange(reach_month, prevReach),
      engaged_pct: pctChange(engaged_users_month, prevEngaged),
    }
  } catch { /* comparativa opcional */ }

  // ── Posts recientes (últimas 20 publicaciones) ────────────
  let posts: FacebookPost[] = []
  try {
    const postsRes = await fbFetch(`/${pageId}/posts`, token, {
      fields: 'id,message,created_time,full_picture,permalink_url,reactions.summary(total_count),comments.summary(total_count),shares',
      limit: '20',
    }) as {
      data: {
        id: string
        message?: string
        created_time: string
        full_picture?: string
        permalink_url: string
        reactions?: { summary: { total_count: number } }
        comments?: { summary: { total_count: number } }
        shares?: { count: number }
      }[]
    }

    posts = await Promise.all(
      (postsRes.data || []).map(async (post) => {
        let reach = 0
        let impressions = 0
        try {
          const pIns = await fbFetch(`/${post.id}/insights`, token, {
            metric: 'post_impressions_unique,post_impressions',
          }) as { data: { name: string; values: { value: number }[] }[] }
          for (const m of pIns.data || []) {
            if (m.name === 'post_impressions_unique') reach = m.values?.[0]?.value ?? 0
            if (m.name === 'post_impressions') impressions = m.values?.[0]?.value ?? 0
          }
        } catch { /* post insights opcionales */ }

        const reactions = post.reactions?.summary?.total_count ?? 0
        const comments = post.comments?.summary?.total_count ?? 0
        const shares = post.shares?.count ?? 0
        const engagement_rate = pageInfo.fan_count > 0
          ? ((reactions + comments + shares) / pageInfo.fan_count) * 100 : 0

        return {
          id: post.id,
          message: post.message,
          created_time: post.created_time,
          full_picture: post.full_picture,
          permalink_url: post.permalink_url,
          reactions_count: reactions,
          comments_count: comments,
          shares_count: shares,
          reach,
          impressions,
          type: 'photo' as const,
          engagement_rate: Math.round(engagement_rate * 100) / 100,
        }
      })
    )
  } catch { /* posts opcionales */ }

  return {
    page_name: pageInfo.name,
    page_id: pageId,
    fan_count: pageInfo.fan_count,
    fan_adds_month,
    reach_month,
    impressions_month,
    engaged_users_month,
    page_views_month,
    posts,
    reach_series,
    comparison,
    fetchedAt: new Date().toISOString(),
  }
}
