import { NextRequest, NextResponse } from 'next/server'
import { sendAlertToSlack, sendAlertBatchToSlack } from '@/lib/slack/sendAlert'
import { Alert } from '@/lib/types'

// POST — enviar alerta(s) manualmente a Slack
export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.alerts && Array.isArray(body.alerts)) {
    const success = await sendAlertBatchToSlack(body.alerts as Alert[])
    return NextResponse.json({ success, type: 'batch', count: body.alerts.length })
  }

  if (body.alert) {
    const success = await sendAlertToSlack(body.alert as Alert)
    return NextResponse.json({ success, type: 'single' })
  }

  return NextResponse.json(
    { error: 'Se requiere alert o alerts en el body' },
    { status: 400 }
  )
}
