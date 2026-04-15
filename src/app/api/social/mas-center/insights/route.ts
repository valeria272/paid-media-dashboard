// ═══ API: Insights y conclusiones mensuales — Mas Center ═══
// POST /api/social/mas-center/insights
// Input: contexto de plataformas del mes
// Output: { text: string } — análisis narrativo generado con Claude

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

interface InsightsRequest {
  instagram?: {
    username: string
    followers: number
    reach_30d: number
    interactions_7d: number
    reach_pct: number
    interactions_pct: number
    best_format: string
    best_hour: number
    stories_views: number
  }
  facebook?: {
    page_name: string
    fan_count: number
    fan_adds: number
    reach_month: number
    reach_pct: number
    engaged_users: number
  }
  linkedin?: {
    org_name: string
    followers: number
    follower_gain: number
    impressions: number
    impressions_pct: number
    engagement_rate: number
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurado' }, { status: 500 })
  }

  let body: InsightsRequest
  try {
    body = await req.json() as InsightsRequest
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const today = new Date()
  const monthLabel = today.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  const parts: string[] = []

  if (body.instagram) {
    const ig = body.instagram
    parts.push(`INSTAGRAM @${ig.username}:
- Seguidores: ${ig.followers.toLocaleString('es-CL')}
- Alcance 30d: ${ig.reach_30d.toLocaleString('es-CL')} personas (${ig.reach_pct >= 0 ? '+' : ''}${ig.reach_pct}% vs mes anterior)
- Interacciones 7d: ${ig.interactions_7d.toLocaleString('es-CL')} (${ig.interactions_pct >= 0 ? '+' : ''}${ig.interactions_pct}% vs mes anterior)
- Mejor formato: ${ig.best_format}
- Mejor hora para publicar: ${ig.best_hour}:00h
- Visualizaciones de stories (7d): ${ig.stories_views.toLocaleString('es-CL')}`)
  }

  if (body.facebook) {
    const fb = body.facebook
    parts.push(`FACEBOOK ${fb.page_name}:
- Seguidores totales: ${fb.fan_count.toLocaleString('es-CL')}
- Nuevos seguidores este mes: ${fb.fan_adds.toLocaleString('es-CL')}
- Alcance mensual: ${fb.reach_month.toLocaleString('es-CL')} (${fb.reach_pct >= 0 ? '+' : ''}${fb.reach_pct}% vs mes anterior)
- Usuarios comprometidos: ${fb.engaged_users.toLocaleString('es-CL')}`)
  }

  if (body.linkedin) {
    const li = body.linkedin
    parts.push(`LINKEDIN ${li.org_name}:
- Seguidores: ${li.followers.toLocaleString('es-CL')}
- Nuevos seguidores: ${li.follower_gain.toLocaleString('es-CL')}
- Impresiones: ${li.impressions.toLocaleString('es-CL')} (${li.impressions_pct >= 0 ? '+' : ''}${li.impressions_pct}%)
- Engagement rate: ${li.engagement_rate}%`)
  }

  if (parts.length === 0) {
    return NextResponse.json({ error: 'Sin datos suficientes para generar insights' }, { status: 400 })
  }

  const prompt = `Eres una consultora de marketing digital especializada en redes sociales para marcas chilenas.

Analiza los resultados de ${monthLabel} de Mas Center y redacta un informe conciso con este formato exacto:

**Lo que funcionó este mes**
[2-3 puntos positivos concretos basados en los datos]

**Oportunidades de mejora**
[2 áreas específicas a trabajar]

**Recomendaciones para el próximo mes**
[4-5 acciones concretas y accionables]

DATOS DEL MES:
${parts.join('\n\n')}

Reglas:
- Tono profesional pero directo, en español
- Basa cada punto en los datos reales, no en generalidades
- Las recomendaciones deben ser específicas (formato, horario, tipo de contenido)
- Máximo 250 palabras en total
- Usa viñetas con • para cada punto`

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ text })
  } catch (error) {
    console.error('[Insights API]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error generando insights' },
      { status: 500 }
    )
  }
}
