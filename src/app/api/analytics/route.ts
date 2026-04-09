import { NextResponse } from 'next/server'
import { fetchGA4Metrics, fetchGA4ConversionPages } from '@/lib/fetchers/analytics'
import { getMonthRange, calcVariation } from '@/lib/dates'

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID
  if (!propertyId) {
    return NextResponse.json({ error: 'GA4_PROPERTY_ID no configurado' }, { status: 500 })
  }

  const range = getMonthRange()

  const [currentMetrics, prevMetrics, conversionPages] = await Promise.allSettled([
    fetchGA4Metrics(propertyId, range.current.start, range.current.end),
    fetchGA4Metrics(propertyId, range.previous.start, range.previous.end),
    fetchGA4ConversionPages(propertyId, range.current.start, range.current.end),
  ])

  const current = currentMetrics.status === 'fulfilled' ? currentMetrics.value : null
  const previous = prevMetrics.status === 'fulfilled' ? prevMetrics.value : null
  const pages = conversionPages.status === 'fulfilled' ? conversionPages.value : []

  return NextResponse.json({
    current,
    previous,
    conversionPages: pages,
    variations: current && previous ? {
      sessions: calcVariation(current.sessions, previous.sessions),
      users: calcVariation(current.users, previous.users),
      pageviews: calcVariation(current.pageviews, previous.pageviews),
      conversions: calcVariation(current.conversions, previous.conversions),
      bounceRate: calcVariation(current.bounceRate, previous.bounceRate),
    } : null,
    period: {
      current: range.current,
      previous: range.previous,
    },
    lastUpdated: new Date().toISOString(),
  })
}

export const dynamic = 'force-dynamic'
