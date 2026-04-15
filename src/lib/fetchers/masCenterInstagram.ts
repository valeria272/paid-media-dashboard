// ═══ Instagram Organic — Mas Center ═══
// Env vars requeridos:
//   MAS_CENTER_IG_TOKEN        — Long-lived token (60 días)
//   MAS_CENTER_IG_BUSINESS_ID  — Business Account ID de Instagram

import type {
  InstagramPost,
  InstagramStory,
  InstagramProfile,
  DemographicBreakdown,
} from './instagram'

const IG_BASE = 'https://graph.facebook.com/v19.0'

export interface MonthComparison {
  current_month: string      // ej: "Abril 2026"
  prev_month: string         // ej: "Marzo 2026"
  current_reach: number
  prev_reach: number
  current_interactions: number
  prev_interactions: number
  current_posts: number
  prev_posts: number
  reach_pct: number          // variación % (puede ser negativo)
  interactions_pct: number
}

export interface MasCenterInstagramData {
  profile: InstagramProfile
  posts: InstagramPost[]
  stories: InstagramStory[]
  // Series temporales
  reach_series: { date: string; value: number }[]
  // KPIs (período seleccionado)
  reach_30d: number
  reach_7d: number
  profile_views_7d: number
  accounts_engaged_7d: number
  total_interactions_7d: number
  stories_views_7d: number
  stories_replies_7d: number
  // Demographics
  top_countries: DemographicBreakdown[]
  age_gender: DemographicBreakdown[]
  // Breakdown por tipo de contenido
  by_type: { type: string; avg_reach: number; avg_engagement: number; count: number }[]
  // Mejores horarios
  best_hours: { hour: number; avg_engagement: number }[]
  // Comparativa mensual (mes actual vs mes anterior, misma cantidad de días)
  comparison: MonthComparison
  token_expires_at?: number
  fetchedAt: string
}

// ── Helpers ─────────────────────────────────────────────────

async function igFetch(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`${IG_BASE}${path}`)
  url.searchParams.set('access_token', token)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { cache: 'no-store' })
  const data = await res.json() as Record<string, unknown>
  if (data.error) throw new Error((data.error as { message: string }).message)
  return data
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 1000) / 10
}

// ── Fetcher principal ────────────────────────────────────────

export async function fetchMasCenterInstagram(periodDays = 30): Promise<MasCenterInstagramData> {
  const token = process.env.MAS_CENTER_IG_TOKEN
  const igId = process.env.MAS_CENTER_IG_BUSINESS_ID
  if (!token) throw new Error('MAS_CENTER_IG_TOKEN no configurado')
  if (!igId) throw new Error('MAS_CENTER_IG_BUSINESS_ID no configurado')

  const now = Math.floor(Date.now() / 1000)
  const since = now - periodDays * 86400

  // ── Perfil ───────────────────────────────────────────────
  const profile = await igFetch(`/${igId}`, token, {
    fields: 'username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
  }) as InstagramProfile

  // ── Posts (top 30) ───────────────────────────────────────
  const mediaPaged = await igFetch(`/${igId}/media`, token, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
    limit: '30',
  }) as { data: InstagramPost[] }

  const posts: InstagramPost[] = await Promise.all(
    (mediaPaged.data || []).map(async (post) => {
      try {
        const insRes = await igFetch(`/${post.id}/insights`, token, {
          metric: 'reach,saved,shares',
        }) as { data: { name: string; values: { value: number }[] }[] }
        const m: Record<string, number> = {}
        for (const item of insRes.data || []) m[item.name] = item.values?.[0]?.value ?? 0
        const engagement_rate = profile.followers_count > 0
          ? ((post.like_count + post.comments_count + (m.saved ?? 0)) / profile.followers_count) * 100
          : 0
        return { ...post, reach: m.reach, saved: m.saved, shares: m.shares,
          engagement_rate: Math.round(engagement_rate * 100) / 100 }
      } catch { return post }
    })
  )

  // ── Reach diario ─────────────────────────────────────────
  const reachSeriesRes = await igFetch(`/${igId}/insights`, token, {
    metric: 'reach',
    period: 'day',
    since: String(since),
    until: String(now),
  }) as { data: { name: string; values: { value: number; end_time: string }[] }[] }

  const reachValues = reachSeriesRes.data?.find(m => m.name === 'reach')?.values || []
  const reach7d = reachValues.slice(-7).reduce((s, v) => s + v.value, 0)
  const reach30d = reachValues.reduce((s, v) => s + v.value, 0)
  const reach_series = reachValues.map(v => ({
    date: v.end_time.slice(0, 10),
    value: v.value,
  }))

  // ── Total value metrics (7d) ──────────────────────────────
  const since7 = now - 7 * 86400
  const tvRes = await igFetch(`/${igId}/insights`, token, {
    metric: 'profile_views,accounts_engaged,total_interactions',
    metric_type: 'total_value',
    period: 'day',
    since: String(since7),
    until: String(now),
  }) as { data: { name: string; total_value: { value: number } }[] }
  const tv: Record<string, number> = {}
  for (const m of tvRes.data || []) tv[m.name] = m.total_value?.value ?? 0

  // ── Demographics ──────────────────────────────────────────
  let top_countries: DemographicBreakdown[] = []
  let age_gender: DemographicBreakdown[] = []
  try {
    const cRes = await igFetch(`/${igId}/insights`, token, {
      metric: 'follower_demographics',
      metric_type: 'total_value',
      period: 'lifetime',
      breakdown: 'country',
    }) as { data: { total_value: { breakdowns: { results: { dimension_values: string[]; value: number }[] }[] } }[] }
    const cData = cRes.data?.[0]?.total_value?.breakdowns?.[0]?.results || []
    const cTotal = cData.reduce((s, r) => s + r.value, 0)
    top_countries = cData.sort((a, b) => b.value - a.value).slice(0, 5)
      .map(r => ({ value: r.dimension_values[0], count: r.value,
        percentage: cTotal > 0 ? Math.round((r.value / cTotal) * 1000) / 10 : 0 }))
  } catch { /* opcional */ }

  try {
    const aRes = await igFetch(`/${igId}/insights`, token, {
      metric: 'follower_demographics',
      metric_type: 'total_value',
      period: 'lifetime',
      breakdown: 'age',
    }) as { data: { total_value: { breakdowns: { results: { dimension_values: string[]; value: number }[] }[] } }[] }
    const aData = aRes.data?.[0]?.total_value?.breakdowns?.[0]?.results || []
    const aTotal = aData.reduce((s, r) => s + r.value, 0)
    age_gender = aData.sort((a, b) => a.dimension_values[0].localeCompare(b.dimension_values[0]))
      .map(r => ({ value: r.dimension_values[0], count: r.value,
        percentage: aTotal > 0 ? Math.round((r.value / aTotal) * 1000) / 10 : 0 }))
  } catch { /* opcional */ }

  // ── Breakdown por tipo ────────────────────────────────────
  const typeMap: Record<string, { reach: number[]; engagement: number[] }> = {}
  for (const post of posts) {
    const t = post.media_type
    if (!typeMap[t]) typeMap[t] = { reach: [], engagement: [] }
    if (post.reach != null) typeMap[t].reach.push(post.reach)
    if (post.engagement_rate != null) typeMap[t].engagement.push(post.engagement_rate)
  }
  const by_type = Object.entries(typeMap).map(([type, d]) => ({
    type: type === 'VIDEO' ? 'Reel' : type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Foto',
    avg_reach: d.reach.length ? Math.round(d.reach.reduce((a, b) => a + b) / d.reach.length) : 0,
    avg_engagement: d.engagement.length
      ? Math.round((d.engagement.reduce((a, b) => a + b) / d.engagement.length) * 100) / 100 : 0,
    count: d.reach.length,
  })).sort((a, b) => b.avg_reach - a.avg_reach)

  // ── Mejores horarios ──────────────────────────────────────
  const hourMap: Record<number, number[]> = {}
  for (const post of posts) {
    const hour = new Date(post.timestamp).getHours()
    if (!hourMap[hour]) hourMap[hour] = []
    if (post.engagement_rate != null) hourMap[hour].push(post.engagement_rate)
  }
  const best_hours = Object.entries(hourMap)
    .map(([h, rates]) => ({
      hour: Number(h),
      avg_engagement: rates.length ? Math.round((rates.reduce((a, b) => a + b) / rates.length) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.avg_engagement - a.avg_engagement)

  // ── Stories activas ───────────────────────────────────────
  let stories: InstagramStory[] = []
  try {
    const sRes = await igFetch(`/${igId}/stories`, token, {
      fields: 'id,media_type,media_url,timestamp',
    }) as { data: InstagramStory[] }
    stories = await Promise.all(
      (sRes.data || []).map(async (story) => {
        try {
          const ins = await igFetch(`/${story.id}/insights`, token, {
            metric: 'reach,exits,replies,taps_forward,taps_back',
          }) as { data: { name: string; values: { value: number }[] }[] }
          const m: Record<string, number> = {}
          for (const item of ins.data || []) m[item.name] = item.values?.[0]?.value ?? 0
          return { ...story, reach: m.reach, exits: m.exits, replies: m.replies,
            taps_forward: m.taps_forward, taps_back: m.taps_back }
        } catch { return story }
      })
    )
  } catch { /* stories puede ser vacío */ }

  // ── Views/Replies de stories (7d) ─────────────────────────
  let stories_views_7d = 0
  let stories_replies_7d = 0
  try {
    const svRes = await igFetch(`/${igId}/insights`, token, {
      metric: 'views,replies',
      metric_type: 'total_value',
      period: 'day',
      since: String(since7),
      until: String(now),
    }) as { data: { name: string; total_value: { value: number } }[] }
    for (const m of svRes.data || []) {
      if (m.name === 'views') stories_views_7d = m.total_value?.value ?? 0
      if (m.name === 'replies') stories_replies_7d = m.total_value?.value ?? 0
    }
  } catch { /* opcional */ }

  // ── Comparativa mensual ───────────────────────────────────
  const today = new Date()
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const daysElapsed = Math.ceil((today.getTime() - currentMonthStart.getTime()) / 86400000) || 1

  const prevMonthEnd = new Date(currentMonthStart.getTime() - 86400000)
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
  const prevEquivalentEnd = new Date(prevMonthStart)
  prevEquivalentEnd.setDate(prevMonthStart.getDate() + daysElapsed)

  const currSince = Math.floor(currentMonthStart.getTime() / 1000)
  const prevSince = Math.floor(prevMonthStart.getTime() / 1000)
  const prevUntil = Math.floor(prevEquivalentEnd.getTime() / 1000)

  let comparison: MonthComparison = {
    current_month: monthLabel(today),
    prev_month: monthLabel(prevMonthEnd),
    current_reach: 0, prev_reach: 0,
    current_interactions: 0, prev_interactions: 0,
    current_posts: 0, prev_posts: 0,
    reach_pct: 0, interactions_pct: 0,
  }

  try {
    const [currReachRes, prevReachRes, currIntRes, prevIntRes] = await Promise.all([
      igFetch(`/${igId}/insights`, token, { metric: 'reach', period: 'day', since: String(currSince), until: String(now) }),
      igFetch(`/${igId}/insights`, token, { metric: 'reach', period: 'day', since: String(prevSince), until: String(prevUntil) }),
      igFetch(`/${igId}/insights`, token, {
        metric: 'total_interactions', metric_type: 'total_value', period: 'day',
        since: String(currSince), until: String(now),
      }),
      igFetch(`/${igId}/insights`, token, {
        metric: 'total_interactions', metric_type: 'total_value', period: 'day',
        since: String(prevSince), until: String(prevUntil),
      }),
    ])

    const sumReach = (res: unknown) => {
      const r = res as { data: { name: string; values: { value: number }[] }[] }
      return (r.data?.find(m => m.name === 'reach')?.values || []).reduce((s, v) => s + v.value, 0)
    }
    const sumInt = (res: unknown) => {
      const r = res as { data: { name: string; total_value: { value: number } }[] }
      return r.data?.[0]?.total_value?.value ?? 0
    }

    const currReach = sumReach(currReachRes)
    const prevReach = sumReach(prevReachRes)
    const currInt = sumInt(currIntRes)
    const prevInt = sumInt(prevIntRes)

    const currPosts = posts.filter(p => new Date(p.timestamp) >= currentMonthStart).length
    const prevPosts = posts.filter(p => {
      const d = new Date(p.timestamp)
      return d >= prevMonthStart && d < prevEquivalentEnd
    }).length

    comparison = {
      current_month: monthLabel(today),
      prev_month: monthLabel(prevMonthEnd),
      current_reach: currReach,
      prev_reach: prevReach,
      current_interactions: currInt,
      prev_interactions: prevInt,
      current_posts: currPosts,
      prev_posts: prevPosts,
      reach_pct: pctChange(currReach, prevReach),
      interactions_pct: pctChange(currInt, prevInt),
    }
  } catch { /* comparison es opcional */ }

  // ── Token expiry ──────────────────────────────────────────
  let token_expires_at: number | undefined
  try {
    const dbgUrl = `${IG_BASE}/debug_token?input_token=${token}&access_token=${token}`
    const dbgRes = await fetch(dbgUrl, { cache: 'no-store' })
    const dbgData = await dbgRes.json() as { data?: { expires_at?: number } }
    token_expires_at = dbgData.data?.expires_at
  } catch { /* opcional */ }

  return {
    profile, posts, stories, reach_series,
    reach_30d: reach30d, reach_7d: reach7d,
    profile_views_7d: tv.profile_views ?? 0,
    accounts_engaged_7d: tv.accounts_engaged ?? 0,
    total_interactions_7d: tv.total_interactions ?? 0,
    stories_views_7d, stories_replies_7d,
    top_countries, age_gender, by_type, best_hours,
    comparison, token_expires_at,
    fetchedAt: new Date().toISOString(),
  }
}
