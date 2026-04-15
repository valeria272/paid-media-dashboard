// ═══ LinkedIn Organization Organic — Mas Center ═══
// Env vars requeridos:
//   MAS_CENTER_LI_TOKEN   — OAuth 2.0 Bearer token (scopes: r_organization_social, r_organization_admin)
//   MAS_CENTER_LI_ORG_ID  — LinkedIn Organization ID (número, ej: 12345678)
//
// Para obtener el token:
//   1. Crear app en https://developer.linkedin.com/
//   2. Solicitar scopes: r_organization_social, r_organization_admin
//   3. Completar flujo OAuth 2.0 y guardar el access_token

const LI_BASE = 'https://api.linkedin.com/v2'

export interface LinkedInPost {
  id: string
  created_time: string
  text?: string
  media_type?: 'IMAGE' | 'VIDEO' | 'ARTICLE' | 'NONE'
  impressions: number
  unique_impressions: number
  clicks: number
  reactions: number
  comments: number
  shares: number
  engagement_rate: number
}

export interface MasCenterLinkedinData {
  org_name: string
  org_id: string
  follower_count: number
  follower_gain_month: number
  page_views_month: number
  unique_visitors_month: number
  total_impressions_month: number
  total_engagement_month: number
  engagement_rate: number
  posts: LinkedInPost[]
  // Comparativa
  comparison: {
    current_month: string
    prev_month: string
    current_followers: number
    prev_followers: number
    current_impressions: number
    prev_impressions: number
    followers_pct: number
    impressions_pct: number
  }
  fetchedAt: string
}

async function liFetch(
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<unknown> {
  const url = new URL(`${LI_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202406',
    },
    cache: 'no-store',
  })
  const data = await res.json() as Record<string, unknown>
  if (data.status && Number(data.status) >= 400) {
    throw new Error((data.message as string) || `LinkedIn API error ${data.status}`)
  }
  return data
}

function pctChange(current: number, prev: number): number {
  if (prev === 0) return current > 0 ? 100 : 0
  return Math.round(((current - prev) / prev) * 1000) / 10
}

export async function fetchMasCenterLinkedin(): Promise<MasCenterLinkedinData> {
  const token = process.env.MAS_CENTER_LI_TOKEN
  const orgId = process.env.MAS_CENTER_LI_ORG_ID
  if (!token) throw new Error('MAS_CENTER_LI_TOKEN no configurado')
  if (!orgId) throw new Error('MAS_CENTER_LI_ORG_ID no configurado')

  const orgUrn = `urn:li:organization:${orgId}`
  const encodedOrn = encodeURIComponent(orgUrn)

  const today = new Date()
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const prevMonthEnd = new Date(currentMonthStart.getTime() - 86400000)
  const prevMonthStart = new Date(prevMonthEnd.getFullYear(), prevMonthEnd.getMonth(), 1)
  const daysElapsed = Math.ceil((today.getTime() - currentMonthStart.getTime()) / 86400000) || 1
  const prevEquivalentEnd = new Date(prevMonthStart)
  prevEquivalentEnd.setDate(prevMonthStart.getDate() + daysElapsed)

  const currStartMs = currentMonthStart.getTime()
  const currEndMs = today.getTime()
  const prevStartMs = prevMonthStart.getTime()
  const prevEndMs = prevEquivalentEnd.getTime()

  // ── Seguidores totales ────────────────────────────────────
  let follower_count = 0
  let org_name = `Organización ${orgId}`
  try {
    const followRes = await liFetch(`/networkSizes/${encodedOrn}`, token, {
      edgeType: 'CompanyFollowedByMember',
    }) as { firstDegreeSize?: number }
    follower_count = followRes.firstDegreeSize ?? 0
  } catch { /* opcional */ }

  // ── Info de la organización ───────────────────────────────
  try {
    const orgRes = await liFetch(`/organizations/${orgId}`, token, {
      fields: 'localizedName',
    }) as { localizedName?: string }
    org_name = orgRes.localizedName ?? org_name
  } catch { /* opcional */ }

  // ── Page statistics (mes actual) ─────────────────────────
  let page_views_month = 0
  let unique_visitors_month = 0
  let follower_gain_month = 0

  try {
    const pageStatsRes = await liFetch('/organizationPageStatistics', token, {
      q: 'timeIntervals',
      organizationUrn: orgUrn,
      'timeIntervals.timeGranularityType': 'DAY',
      'timeIntervals.timeRange.start': String(currStartMs),
      'timeIntervals.timeRange.end': String(currEndMs),
    }) as {
      elements?: {
        timeRange: { start: number; end: number }
        totalPageStatistics?: {
          views?: { allPageViews?: { pageViews?: number }; mobilePageViews?: { pageViews?: number } }
          uniqueVisitorCount?: number
        }
        followerGains?: { organicFollowerGain?: number; paidFollowerGain?: number }
      }[]
    }

    for (const elem of pageStatsRes.elements || []) {
      page_views_month += elem.totalPageStatistics?.views?.allPageViews?.pageViews ?? 0
      unique_visitors_month += elem.totalPageStatistics?.uniqueVisitorCount ?? 0
      follower_gain_month += (elem.followerGains?.organicFollowerGain ?? 0) + (elem.followerGains?.paidFollowerGain ?? 0)
    }
  } catch { /* opcional */ }

  // ── Share statistics (mes actual) ────────────────────────
  let total_impressions_month = 0
  let total_engagement_month = 0
  let prev_impressions = 0

  try {
    const shareStatsRes = await liFetch('/organizationalEntityShareStatistics', token, {
      q: 'organizationalEntity',
      organizationalEntity: orgUrn,
      'timeIntervals.timeGranularityType': 'MONTH',
      'timeIntervals.timeRange.start': String(currStartMs),
      'timeIntervals.timeRange.end': String(currEndMs),
    }) as {
      elements?: {
        totalShareStatistics?: {
          impressionCount?: number
          uniqueImpressionsCount?: number
          clickCount?: number
          likeCount?: number
          commentCount?: number
          shareCount?: number
          engagement?: number
        }
      }[]
    }

    for (const elem of shareStatsRes.elements || []) {
      const s = elem.totalShareStatistics
      if (s) {
        total_impressions_month += s.impressionCount ?? 0
        const eng = (s.likeCount ?? 0) + (s.commentCount ?? 0) + (s.shareCount ?? 0) + (s.clickCount ?? 0)
        total_engagement_month += eng
      }
    }
  } catch { /* opcional */ }

  // ── Comparativa (mes previo) ──────────────────────────────
  try {
    const prevShareRes = await liFetch('/organizationalEntityShareStatistics', token, {
      q: 'organizationalEntity',
      organizationalEntity: orgUrn,
      'timeIntervals.timeGranularityType': 'MONTH',
      'timeIntervals.timeRange.start': String(prevStartMs),
      'timeIntervals.timeRange.end': String(prevEndMs),
    }) as {
      elements?: { totalShareStatistics?: { impressionCount?: number } }[]
    }
    for (const elem of prevShareRes.elements || []) {
      prev_impressions += elem.totalShareStatistics?.impressionCount ?? 0
    }
  } catch { /* opcional */ }

  // Seguidores previos (aproximación: follower_count - follower_gain_month)
  const prev_followers = Math.max(0, follower_count - follower_gain_month)

  // ── Posts recientes ───────────────────────────────────────
  let posts: LinkedInPost[] = []
  try {
    const postsRes = await liFetch('/ugcPosts', token, {
      q: 'authors',
      authors: `List(${encodeURIComponent(orgUrn)})`,
      count: '10',
      sortBy: 'LAST_MODIFIED',
    }) as {
      elements?: {
        id: string
        created?: { time?: number }
        specificContent?: {
          'com.linkedin.ugc.ShareContent'?: {
            shareCommentary?: { text?: string }
            shareMediaCategory?: string
          }
        }
      }[]
    }

    posts = await Promise.all(
      (postsRes.elements || []).map(async (post) => {
        let impressions = 0
        let unique_impressions = 0
        let clicks = 0
        let reactions = 0
        let comments = 0
        let shares = 0
        try {
          const statsRes = await liFetch('/organizationalEntityShareStatistics', token, {
            q: 'organizationalEntity',
            organizationalEntity: orgUrn,
            shares: `List(${encodeURIComponent(post.id)})`,
          }) as {
            elements?: {
              shareStatistics?: {
                impressionCount?: number
                uniqueImpressionsCount?: number
                clickCount?: number
                likeCount?: number
                commentCount?: number
                shareCount?: number
              }
            }[]
          }
          const s = statsRes.elements?.[0]?.shareStatistics
          if (s) {
            impressions = s.impressionCount ?? 0
            unique_impressions = s.uniqueImpressionsCount ?? 0
            clicks = s.clickCount ?? 0
            reactions = s.likeCount ?? 0
            comments = s.commentCount ?? 0
            shares = s.shareCount ?? 0
          }
        } catch { /* stats opcionales */ }

        const er = impressions > 0
          ? ((reactions + comments + shares + clicks) / impressions) * 100 : 0
        const content = post.specificContent?.['com.linkedin.ugc.ShareContent']

        return {
          id: post.id,
          created_time: new Date(post.created?.time ?? 0).toISOString(),
          text: content?.shareCommentary?.text,
          media_type: (content?.shareMediaCategory || 'NONE') as LinkedInPost['media_type'],
          impressions,
          unique_impressions,
          clicks,
          reactions,
          comments,
          shares,
          engagement_rate: Math.round(er * 100) / 100,
        }
      })
    )
  } catch { /* posts opcionales */ }

  const engagement_rate = total_impressions_month > 0
    ? Math.round((total_engagement_month / total_impressions_month) * 10000) / 100 : 0

  return {
    org_name,
    org_id: orgId,
    follower_count,
    follower_gain_month,
    page_views_month,
    unique_visitors_month,
    total_impressions_month,
    total_engagement_month,
    engagement_rate,
    posts,
    comparison: {
      current_month: today.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      prev_month: prevMonthEnd.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }),
      current_followers: follower_count,
      prev_followers,
      current_impressions: total_impressions_month,
      prev_impressions,
      followers_pct: pctChange(follower_count, prev_followers),
      impressions_pct: pctChange(total_impressions_month, prev_impressions),
    },
    fetchedAt: new Date().toISOString(),
  }
}
