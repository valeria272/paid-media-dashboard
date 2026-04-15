// ═══ Instagram Benchmark ═══
// Retorna datos de competidores configurados manualmente en src/config/instagramBenchmark.ts
// La API business_discovery de Meta requiere App Review — se usa config manual.

import { BENCHMARK_ACCOUNTS, type BenchmarkAccount } from '@/config/instagramBenchmark'

export interface BenchmarkProfile extends BenchmarkAccount {
  engagement_rate: number // (avg_likes + avg_comments) / followers * 100
  ig_url: string
}

export async function fetchBenchmarkData(): Promise<BenchmarkProfile[]> {
  return BENCHMARK_ACCOUNTS.map(account => ({
    ...account,
    engagement_rate:
      account.followers > 0
        ? Math.round(((account.avg_likes + account.avg_comments) / account.followers) * 10000) / 100
        : 0,
    ig_url: `https://www.instagram.com/${account.username}/`,
  }))
}
