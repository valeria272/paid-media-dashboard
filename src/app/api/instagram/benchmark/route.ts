import { NextResponse } from 'next/server'
import { fetchBenchmarkData } from '@/lib/fetchers/instagramBenchmark'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await fetchBenchmarkData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Instagram Benchmark API]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
}
