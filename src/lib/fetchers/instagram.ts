// ═══ Instagram Organic Metrics ═══
// Usa Instagram Graph API con token long-lived (60 días).
// Cuenta: @copywriters.cl — Business Account ID: 17841417280995899

const IG_BASE = 'https://graph.facebook.com/v19.0'

export interface InstagramProfile {
  id: string
  username: string
  name: string
  biography: string
  followers_count: number
  follows_count: number
  media_count: number
  profile_picture_url: string
  website: string
}

export interface InstagramPost {
  id: string
  caption: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url: string
  thumbnail_url?: string
  timestamp: string
  like_count: number
  comments_count: number
  reach?: number
  saved?: number
  shares?: number
  permalink: string
  engagement_rate?: number // (likes + comments + saves) / followers * 100
}

export interface InstagramStory {
  id: string
  media_type: string
  media_url?: string
  timestamp: string
  reach?: number
  impressions?: number
  exits?: number
  replies?: number
  taps_forward?: number
  taps_back?: number
}

export interface DemographicBreakdown {
  value: string
  count: number
  percentage: number
}

export interface InstagramInsights {
  reach_7d: number
  reach_30d: number
  profile_views_7d: number
  accounts_engaged_7d: number
  total_interactions_7d: number
  follower_count: number
  reach_series: { date: string; value: number }[]
  follows_series: { date: string; follows: number; unfollows: number; net: number }[]
  // Demographics
  top_countries: DemographicBreakdown[]
  age_gender: DemographicBreakdown[]
  // Content breakdown
  by_type: { type: string; avg_reach: number; avg_engagement: number; count: number }[]
  // Best hour to post
  best_hours: { hour: number; avg_engagement: number }[]
  // Stories
  stories_views_7d: number
  stories_replies_7d: number
  // Token info
  token_expires_at?: number
}

export interface InstagramData {
  profile: InstagramProfile
  posts: InstagramPost[]
  stories: InstagramStory[]
  insights: InstagramInsights
  fetchedAt: string
}

async function igFetch(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN no configurado')

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

async function getTokenExpiry(): Promise<number | undefined> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) return undefined
  try {
    const url = `${IG_BASE}/debug_token?input_token=${token}&access_token=${token}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json() as { data?: { expires_at?: number } }
    return data.data?.expires_at
  } catch {
    return undefined
  }
}

export async function fetchInstagramData(periodDays = 30): Promise<InstagramData> {
  const igId = process.env.INSTAGRAM_BUSINESS_ID || '17841417280995899'
  const until = Math.floor(Date.now() / 1000)
  const since = until - periodDays * 86400

  // ── Perfil ──────────────────────────────────────────────
  const profile = await igFetch(`/${igId}`, {
    fields: 'username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
  }) as InstagramProfile

  // ── Posts (top 30) ──────────────────────────────────────
  const mediaPaged = await igFetch(`/${igId}/media`, {
    fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink',
    limit: '30',
  }) as { data: InstagramPost[] }

  const posts: InstagramPost[] = await Promise.all(
    (mediaPaged.data || []).map(async (post) => {
      try {
        const insightsRes = await igFetch(`/${post.id}/insights`, {
          metric: 'reach,saved,shares',
        }) as { data: { name: string; values: { value: number }[] }[] }

        const map: Record<string, number> = {}
        for (const m of insightsRes.data || []) {
          map[m.name] = m.values?.[0]?.value ?? 0
        }

        const engagement_rate = profile.followers_count > 0
          ? ((post.like_count + post.comments_count + (map.saved ?? 0)) / profile.followers_count) * 100
          : 0

        return {
          ...post,
          reach: map.reach,
          saved: map.saved,
          shares: map.shares,
          engagement_rate: Math.round(engagement_rate * 100) / 100,
        }
      } catch {
        return post
      }
    })
  )

  // ── Reach diario (time_series) ───────────────────────────
  const reachSeriesRes = await igFetch(`/${igId}/insights`, {
    metric: 'reach',
    period: 'day',
    since: String(since),
    until: String(until),
  }) as { data: { name: string; values: { value: number; end_time: string }[] }[] }

  const reachValues = reachSeriesRes.data?.find(m => m.name === 'reach')?.values || []
  const reach7d = reachValues.slice(-7).reduce((sum, v) => sum + v.value, 0)
  const reach30d = reachValues.reduce((sum, v) => sum + v.value, 0)
  const reach_series = reachValues.map(v => ({
    date: v.end_time.slice(0, 10),
    value: v.value,
  }))

  // ── Follows / Unfollows (time_series) ────────────────────
  let follows_series: { date: string; follows: number; unfollows: number; net: number }[] = []
  try {
    const followsRes = await igFetch(`/${igId}/insights`, {
      metric: 'follows_and_unfollows',
      metric_type: 'total_value',
      period: 'day',
      since: String(since),
      until: String(until),
    }) as { data: { name: string; total_value: { breakdowns: { dimension_values: string[]; results: number[] }[] } }[] }

    const fData = followsRes.data?.find(m => m.name === 'follows_and_unfollows')
    if (fData?.total_value?.breakdowns) {
      const followEntry = fData.total_value.breakdowns[0]
      if (followEntry) {
        // Build daily series from reach_series dates as proxy
        follows_series = reach_series.map(d => ({
          date: d.date,
          follows: 0,
          unfollows: 0,
          net: 0,
        }))
      }
    }
  } catch {
    // follows_and_unfollows puede no estar disponible en todas las cuentas
    follows_series = reach_series.map(d => ({ date: d.date, follows: 0, unfollows: 0, net: 0 }))
  }

  // ── Total value metrics (7d) ─────────────────────────────
  const since7 = until - 7 * 86400
  const totalValueRes = await igFetch(`/${igId}/insights`, {
    metric: 'profile_views,accounts_engaged,total_interactions',
    metric_type: 'total_value',
    period: 'day',
    since: String(since7),
    until: String(until),
  }) as { data: { name: string; total_value: { value: number } }[] }

  const tvMap: Record<string, number> = {}
  for (const m of totalValueRes.data || []) {
    tvMap[m.name] = m.total_value?.value ?? 0
  }

  // ── Demographics ─────────────────────────────────────────
  let top_countries: DemographicBreakdown[] = []
  let age_gender: DemographicBreakdown[] = []
  try {
    const demoRes = await igFetch(`/${igId}/insights`, {
      metric: 'follower_demographics',
      metric_type: 'total_value',
      period: 'lifetime',
      breakdown: 'country',
    }) as { data: { name: string; total_value: { breakdowns: { dimension_values: string[]; results: { dimension_values: string[]; value: number }[] }[] } }[] }

    const demoData: { dimension_values: string[]; value: number }[] =
      demoRes.data?.[0]?.total_value?.breakdowns?.[0]?.results || []
    const total = demoData.reduce((s, r) => s + r.value, 0)
    top_countries = demoData
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(r => ({
        value: r.dimension_values[0],
        count: r.value,
        percentage: total > 0 ? Math.round((r.value / total) * 1000) / 10 : 0,
      }))
  } catch { /* demographics opcionales */ }

  try {
    const ageRes = await igFetch(`/${igId}/insights`, {
      metric: 'follower_demographics',
      metric_type: 'total_value',
      period: 'lifetime',
      breakdown: 'age',
    }) as { data: { name: string; total_value: { breakdowns: { dimension_values: string[]; results: { dimension_values: string[]; value: number }[] }[] } }[] }

    const ageData: { dimension_values: string[]; value: number }[] =
      ageRes.data?.[0]?.total_value?.breakdowns?.[0]?.results || []
    const total = ageData.reduce((s, r) => s + r.value, 0)
    age_gender = ageData
      .sort((a, b) => a.dimension_values[0].localeCompare(b.dimension_values[0]))
      .map(r => ({
        value: r.dimension_values[0],
        count: r.value,
        percentage: total > 0 ? Math.round((r.value / total) * 1000) / 10 : 0,
      }))
  } catch { /* demographics opcionales */ }

  // ── Content type breakdown ────────────────────────────────
  const typeMap: Record<string, { reach: number[]; engagement: number[] }> = {}
  for (const post of posts) {
    const t = post.media_type
    if (!typeMap[t]) typeMap[t] = { reach: [], engagement: [] }
    if (post.reach != null) typeMap[t].reach.push(post.reach)
    if (post.engagement_rate != null) typeMap[t].engagement.push(post.engagement_rate)
  }
  const by_type = Object.entries(typeMap).map(([type, data]) => ({
    type: type === 'VIDEO' ? 'Reel' : type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Foto',
    avg_reach: data.reach.length ? Math.round(data.reach.reduce((a, b) => a + b, 0) / data.reach.length) : 0,
    avg_engagement: data.engagement.length
      ? Math.round((data.engagement.reduce((a, b) => a + b, 0) / data.engagement.length) * 100) / 100
      : 0,
    count: data.reach.length,
  })).sort((a, b) => b.avg_reach - a.avg_reach)

  // ── Best hours to post ────────────────────────────────────
  const hourMap: Record<number, number[]> = {}
  for (const post of posts) {
    const hour = new Date(post.timestamp).getHours()
    if (!hourMap[hour]) hourMap[hour] = []
    if (post.engagement_rate != null) hourMap[hour].push(post.engagement_rate)
  }
  const best_hours = Object.entries(hourMap)
    .map(([hour, rates]) => ({
      hour: Number(hour),
      avg_engagement: rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.avg_engagement - a.avg_engagement)

  // ── Stories activas (últimas 24h) ────────────────────────
  let stories: InstagramStory[] = []
  try {
    const storiesRes = await igFetch(`/${igId}/stories`, {
      fields: 'id,media_type,media_url,timestamp',
    }) as { data: InstagramStory[] }

    stories = await Promise.all(
      (storiesRes.data || []).map(async (story) => {
        try {
          const ins = await igFetch(`/${story.id}/insights`, {
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

  // ── Métricas de stories (cuenta, 7d) ─────────────────────
  let stories_views_7d = 0
  let stories_replies_7d = 0
  try {
    const svRes = await igFetch(`/${igId}/insights`, {
      metric: 'views,replies',
      metric_type: 'total_value',
      period: 'day',
      since: String(since7),
      until: String(until),
    }) as { data: { name: string; total_value: { value: number } }[] }
    for (const m of svRes.data || []) {
      if (m.name === 'views') stories_views_7d = m.total_value?.value ?? 0
      if (m.name === 'replies') stories_replies_7d = m.total_value?.value ?? 0
    }
  } catch { /* opcional */ }

  // ── Token expiry ──────────────────────────────────────────
  const token_expires_at = await getTokenExpiry()

  return {
    profile,
    posts,
    stories,
    insights: {
      reach_7d: reach7d,
      reach_30d: reach30d,
      profile_views_7d: tvMap.profile_views ?? 0,
      accounts_engaged_7d: tvMap.accounts_engaged ?? 0,
      total_interactions_7d: tvMap.total_interactions ?? 0,
      follower_count: profile.followers_count,
      reach_series,
      follows_series,
      top_countries,
      age_gender,
      by_type,
      best_hours,
      stories_views_7d,
      stories_replies_7d,
      token_expires_at,
    },
    fetchedAt: new Date().toISOString(),
  }
}
