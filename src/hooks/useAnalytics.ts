import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAnalytics() {
  const { data, isLoading } = useSWR('/api/analytics', fetcher, {
    refreshInterval: 600000, // cada 10 min — GA4 no cambia tan rapido
    revalidateOnFocus: true,
  })

  return {
    web: data?.current || null,
    webPrevious: data?.previous || null,
    webVariations: data?.variations || null,
    conversionPages: data?.conversionPages || [],
    isLoading,
  }
}
