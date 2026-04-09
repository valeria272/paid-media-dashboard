// ═══ Cliente Slack unificado ═══
// Usa Bot Token para enviar mensajes con formato rico (blocks)

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN
// Default: DM al usuario configurado. Cambiar por canal si se prefiere.
const DEFAULT_CHANNEL = process.env.SLACK_ALERT_CHANNEL || process.env.SLACK_USER_ID || ''

export async function sendSlackMessage(
  blocks: any[],
  text: string,
  channel?: string
): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn('[Slack] Sin SLACK_BOT_TOKEN — mensaje no enviado')
    return false
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channel || DEFAULT_CHANNEL,
        text, // fallback para notificaciones
        blocks,
      }),
    })

    const data = await response.json()
    if (!data.ok) {
      console.error('[Slack] Error:', data.error)
      return false
    }
    return true
  } catch (error) {
    console.error('[Slack] Error enviando:', error)
    return false
  }
}

// ═══ Helpers de formato ═══

export function slackHeader(text: string) {
  return { type: 'header', text: { type: 'plain_text', text } }
}

export function slackSection(text: string) {
  return { type: 'section', text: { type: 'mrkdwn', text } }
}

export function slackFields(fields: string[]) {
  return {
    type: 'section',
    fields: fields.map(f => ({ type: 'mrkdwn', text: f })),
  }
}

export function slackDivider() {
  return { type: 'divider' }
}

export function slackContext(text: string) {
  return { type: 'context', elements: [{ type: 'mrkdwn', text }] }
}
