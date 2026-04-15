// ═══ Cliente Slack unificado ═══
// Usa Bot Token para enviar mensajes con formato rico (blocks)
// Incluye timeout, retry y error handling robusto

const BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const DEFAULT_CHANNEL = process.env.SLACK_ALERT_CHANNEL || process.env.SLACK_USER_ID || ''

const TIMEOUT_MS = 5000
const MAX_RETRIES = 2

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function sendSlackMessage(
  blocks: any[],
  text: string,
  channel?: string,
  attachments?: any[]
): Promise<boolean> {
  if (!BOT_TOKEN) {
    console.warn('[Slack] Sin SLACK_BOT_TOKEN — mensaje no enviado')
    return false
  }

  const target = channel || DEFAULT_CHANNEL
  if (!target) {
    console.warn('[Slack] Sin canal destino — mensaje no enviado')
    return false
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channel: target, text, blocks, ...(attachments ? { attachments } : {}) }),
      }, TIMEOUT_MS)

      const data = await response.json()

      if (data.ok) return true

      // Rate limited — esperar y reintentar
      if (data.error === 'ratelimited' && attempt < MAX_RETRIES) {
        const retryAfter = Number(response.headers.get('Retry-After') || '2')
        console.warn(`[Slack] Rate limited, reintentando en ${retryAfter}s...`)
        await new Promise(r => setTimeout(r, retryAfter * 1000))
        continue
      }

      console.error(`[Slack] Error API: ${data.error}`)
      return false
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error(`[Slack] Timeout (${TIMEOUT_MS}ms) — intento ${attempt + 1}/${MAX_RETRIES + 1}`)
      } else {
        console.error(`[Slack] Error de red: ${error.message} — intento ${attempt + 1}/${MAX_RETRIES + 1}`)
      }
      if (attempt === MAX_RETRIES) return false
    }
  }

  return false
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
