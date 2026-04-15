// ═══ API: Generador de Grilla de Contenido — Mas Center ═══
// POST /api/social/mas-center/content-grid
//
// Input:
//   briefing: string    — descripción del mes (ej: "viene día de los enamorados, día del perro")
//   context: {          — contexto de performance (opcional, para mejores sugerencias)
//     best_hours: { hour: number; avg_engagement: number }[]
//     by_type: { type: string; avg_reach: number; count: number }[]
//     top_themes: string[]
//   }
//
// Output: ContentGrid

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export interface ContentGridItem {
  week: number             // 1-4
  day_name: string         // ej: "Lunes"
  date_label: string       // ej: "Lunes 7 de abril"
  platform: 'Instagram' | 'Facebook' | 'LinkedIn' | 'TikTok' | 'Todas'
  content_type: 'Reel' | 'Carrusel' | 'Foto' | 'Story' | 'Post' | 'Video'
  theme: string            // tema central
  topic: string            // título/idea del contenido
  caption_idea: string     // sugerencia de copy (2-3 oraciones)
  hook: string             // primer párrafo o texto de apertura
  cta: string              // llamado a la acción
  best_time: string        // hora sugerida para publicar (ej: "18:00")
  hashtags: string[]
  priority: 'alta' | 'media' | 'baja'
  event_related?: string   // si está ligado a una fecha o evento especial
}

export interface ContentGridResponse {
  month_label: string
  briefing_summary: string   // resumen del briefing interpretado
  grid: ContentGridItem[]
  monthly_themes: string[]   // temas del mes
  notes: string              // observaciones generales del estratega
}

interface RequestBody {
  briefing: string
  context?: {
    best_hours?: { hour: number; avg_engagement: number }[]
    by_type?: { type: string; avg_reach: number; count: number }[]
    top_themes?: string[]
    followers?: number
    username?: string
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurado' }, { status: 500 })
  }

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  if (!body.briefing?.trim()) {
    return NextResponse.json({ error: 'El briefing no puede estar vacío' }, { status: 400 })
  }

  const today = new Date()
  const monthLabel = today.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const dayOfWeekStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toLocaleDateString('es-CL', { weekday: 'long' })

  // Construir contexto de performance si viene
  let performanceContext = ''
  if (body.context) {
    const { best_hours, by_type, top_themes, followers, username } = body.context
    const lines: string[] = []
    if (username) lines.push(`Cuenta: @${username}${followers ? ` (${followers.toLocaleString('es-CL')} seguidores)` : ''}`)
    if (best_hours?.length) {
      const top3 = best_hours.slice(0, 3).map(h => `${h.hour}:00h (ER ${h.avg_engagement}%)`).join(', ')
      lines.push(`Mejores horarios: ${top3}`)
    }
    if (by_type?.length) {
      const types = by_type.map(t => `${t.type}: avg ${t.avg_reach.toLocaleString()} alcance`).join(', ')
      lines.push(`Rendimiento por tipo: ${types}`)
    }
    if (top_themes?.length) {
      lines.push(`Temas que funcionan: ${top_themes.join(', ')}`)
    }
    if (lines.length) {
      performanceContext = `\n\nDATOS DE PERFORMANCE DE LA CUENTA:\n${lines.join('\n')}`
    }
  }

  const prompt = `Eres una estratega de contenido para redes sociales especializada en marcas chilenas y latinoamericanas.

Tu tarea es crear una GRILLA DE CONTENIDO MENSUAL completa y accionable para Mas Center.

MES: ${monthLabel} (${daysInMonth} días, empieza ${dayOfWeekStart})
HOY: ${today.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}

BRIEFING DEL MES:
"${body.briefing}"
${performanceContext}

INSTRUCCIONES:
- Crea exactamente 20 publicaciones para el mes (distribución: ~5 por semana, prioriza Instagram y Facebook)
- Distribuye las plataformas: Instagram (~8), Facebook (~6), LinkedIn (~3), TikTok (~3)
- Mezcla formatos: Reels, Carruseles, Fotos, Stories, Posts
- Conecta el contenido con los eventos del briefing naturalmente (sin forzarlo)
- Los hooks deben ser de máximo 15 palabras, directos e impactantes
- Horarios sugeridos basados en las mejores prácticas para Chile: 12:00, 18:00, 20:00
- Tono: profesional pero cercano, en español chileno/latinoamericano
- Distribuye semanas del mes del 1 al 4

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "month_label": "${monthLabel}",
  "briefing_summary": "Resumen en 1-2 oraciones de lo que interpretaste del briefing",
  "monthly_themes": ["tema1", "tema2", "tema3"],
  "notes": "Observación estratégica sobre el mes y cómo aprovechar los eventos (2-3 oraciones)",
  "grid": [
    {
      "week": 1,
      "day_name": "Lunes",
      "date_label": "Lunes 6 de ${monthLabel}",
      "platform": "Instagram|Facebook|LinkedIn|TikTok|Todas",
      "content_type": "Reel|Carrusel|Foto|Story|Post|Video",
      "theme": "Tema del contenido",
      "topic": "Título o idea del contenido",
      "caption_idea": "Sugerencia de copy de 2-3 oraciones para la publicación",
      "hook": "Gancho o primera línea para captar atención (máx 15 palabras)",
      "cta": "Llamado a la acción específico",
      "best_time": "18:00",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "priority": "alta|media|baja",
      "event_related": "Nombre del evento si aplica (o null)"
    }
  ]
}

Reglas de JSON:
- event_related debe ser null (sin comillas) cuando no aplica, no una cadena vacía
- Todos los campos son obligatorios excepto event_related
- El array grid debe tener exactamente 20 elementos`

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: 'Eres estratega de contenido para redes sociales en LATAM. Respondes SOLO con JSON válido, sin markdown ni texto adicional.',
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result: ContentGridResponse = JSON.parse(text)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Content Grid API]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error generando grilla' },
      { status: 500 }
    )
  }
}
