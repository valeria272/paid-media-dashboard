import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { InstagramPost } from '@/lib/fetchers/instagram'

export const dynamic = 'force-dynamic'

export interface HookSuggestion {
  hook: string
  type: 'pregunta' | 'dato' | 'provocacion' | 'historia' | 'lista'
  why: string
}

export interface ContentIdea {
  title: string
  format: 'Reel' | 'Carrusel' | 'Foto'
  angle: string
  inspired_by?: string // caption del post que inspiró la idea
}

export interface HooksResponse {
  hooks: HookSuggestion[]
  content_ideas: ContentIdea[]
  best_practices: string[]
  top_themes: string[]
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY no configurado' },
      { status: 500 }
    )
  }

  const { posts, profile }: { posts: InstagramPost[]; profile: { username: string; followers_count: number } } = await req.json()

  // Top 10 posts por reach o likes
  const topPosts = [...posts]
    .sort((a, b) => (b.reach ?? b.like_count) - (a.reach ?? a.like_count))
    .slice(0, 10)

  const postsContext = topPosts.map((p, i) =>
    `Post ${i + 1} (${p.media_type === 'VIDEO' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carrusel' : 'Foto'}):
  - Fecha: ${p.timestamp.slice(0, 10)}
  - Likes: ${p.like_count} | Comentarios: ${p.comments_count} | Alcance: ${p.reach ?? 'N/D'} | Guardados: ${p.saved ?? 'N/D'}
  - Engagement rate: ${p.engagement_rate ?? 0}%
  - Caption: ${p.caption ? p.caption.slice(0, 200) : '(sin caption)'}`
  ).join('\n\n')

  const prompt = `Eres un experto en contenido para Instagram especializado en agencias de marketing digital en Chile y LATAM.

Analiza los siguientes posts de la cuenta @${profile.username} (${profile.followers_count.toLocaleString()} seguidores) y genera recomendaciones accionables.

MEJORES POSTS (ordenados por alcance):
${postsContext}

Responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{
  "hooks": [
    {
      "hook": "texto del hook (máx 15 palabras, en español chileno/latinoamericano)",
      "type": "pregunta|dato|provocacion|historia|lista",
      "why": "por qué este hook funciona para esta audiencia (1 oración)"
    }
  ],
  "content_ideas": [
    {
      "title": "título del contenido",
      "format": "Reel|Carrusel|Foto",
      "angle": "ángulo o enfoque del contenido (2-3 oraciones)",
      "inspired_by": "fragmento del caption del post que inspiró esta idea (opcional)"
    }
  ],
  "best_practices": ["práctica 1", "práctica 2", ...],
  "top_themes": ["tema 1", "tema 2", ...]
}

Reglas:
- Genera exactamente 8 hooks variados (2 de cada tipo mínimo)
- Genera exactamente 6 ideas de contenido (mix de Reels, Carruseles, Fotos)
- Genera 5 best practices específicas para esta cuenta, no genéricas
- Genera 4 temas principales que funcionan bien en esta cuenta
- Todo en español, tono profesional pero cercano
- Los hooks deben ser para los primeros 3 segundos de un Reel o primera línea de caption
- Basa todo en los datos reales de los posts, no en suposiciones genéricas`

  const client = new Anthropic({ apiKey })

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: 'Eres un experto en estrategia de contenido para Instagram en LATAM. Respondes SOLO con JSON válido, sin markdown ni texto adicional.',
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    // Limpiar markdown si Claude devuelve ```json ... ```
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const result: HooksResponse = JSON.parse(text)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Instagram Hooks API]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error generando sugerencias' },
      { status: 500 }
    )
  }
}
