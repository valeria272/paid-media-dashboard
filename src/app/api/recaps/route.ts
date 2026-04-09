import { NextResponse } from 'next/server'
import { fetchGoogleAds } from '@/lib/fetchers/googleAds'
import { fetchMetaAds } from '@/lib/fetchers/metaAds'
import { detectAlerts } from '@/lib/alerts/detectAlerts'
import { generateDailyRecap } from '@/lib/recaps/generateRecap'
import { sendRecapToSlack } from '@/lib/slack/sendAlert'

async function fetchActiveCampaigns() {
  const [google, meta] = await Promise.allSettled([
    fetchGoogleAds(),
    fetchMetaAds(),
  ])

  const all = [
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(meta.status === 'fulfilled' ? meta.value : []),
  ]

  return all.filter(c => c.status === 'active' && (c.impressions > 0 || c.spend > 0))
}

export async function GET() {
  const campaigns = await fetchActiveCampaigns()
  const alerts = detectAlerts(campaigns)
  const recap = generateDailyRecap(campaigns, alerts)
  return NextResponse.json({ recap })
}

export async function POST() {
  const campaigns = await fetchActiveCampaigns()
  const alerts = detectAlerts(campaigns)
  const recap = generateDailyRecap(campaigns, alerts)
  const slackSent = await sendRecapToSlack(recap)
  return NextResponse.json({
    recap,
    slackSent,
    message: slackSent ? 'Recap enviado a Slack' : 'Recap generado (Slack no configurado)',
  })
}
