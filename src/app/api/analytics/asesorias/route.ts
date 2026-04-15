import { NextResponse } from 'next/server'
import {
  fetchAsesoriasMetrics,
  fetchAsesoriasDaily,
  fetchAsesoriasEvents,
  fetchAsesoriasHeatmap,
} from '@/lib/fetchers/analytics'
import { getMonthRange, calcVariation } from '@/lib/dates'

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID
  if (!propertyId) {
    return NextResponse.json({ error: 'GA4_PROPERTY_ID no configurado' }, { status: 500 })
  }

  const range = getMonthRange()

  const [current, previous, daily, events, heatmap] = await Promise.allSettled([
    fetchAsesoriasMetrics(propertyId, range.current.start, range.current.end),
    fetchAsesoriasMetrics(propertyId, range.previous.start, range.previous.end),
    fetchAsesoriasDaily(propertyId, range.current.start, range.current.end),
    fetchAsesoriasEvents(propertyId, range.current.start, range.current.end),
    fetchAsesoriasHeatmap(propertyId, range.current.start, range.current.end),
  ])

  const cur = current.status === 'fulfilled' ? current.value : null
  const prev = previous.status === 'fulfilled' ? previous.value : null

  return NextResponse.json({
    current: cur,
    previous: prev,
    variations: cur && prev ? {
      sessions: calcVariation(cur.sessions, prev.sessions),
      users: calcVariation(cur.users, prev.users),
      pageviews: calcVariation(cur.pageviews, prev.pageviews),
      conversions: calcVariation(cur.conversions, prev.conversions),
      bounceRate: calcVariation(cur.bounceRate, prev.bounceRate),
    } : null,
    daily: daily.status === 'fulfilled' ? daily.value : [],
    events: events.status === 'fulfilled' ? events.value : [],
    heatmap: heatmap.status === 'fulfilled' ? heatmap.value : [],
    period: { current: range.current, previous: range.previous },
    lastUpdated: new Date().toISOString(),
  })
}

export const dynamic = 'force-dynamic'
