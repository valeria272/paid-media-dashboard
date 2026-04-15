import { NextResponse } from 'next/server'
import { fetchInstagramData } from '@/lib/fetchers/instagram'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const period = Math.min(90, Math.max(7, Number(searchParams.get('period') || 30)))
    const data = await fetchInstagramData(period)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Instagram API]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
