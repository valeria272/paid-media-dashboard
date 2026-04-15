import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAsesoriasAnalytics() {
  const { data, isLoading } = useSWR('/api/analytics/asesorias', fetcher, {
    refreshInterval: 600000, // cada 10 min
    revalidateOnFocus: true,
  })

  return {
    current: data?.current || null,
    previous: data?.previous || null,
    variations: data?.variations || null,
    daily: data?.daily || [],
    events: data?.events || [],
    heatmap: data?.heatmap || [],
    isLoading,
  }
}
