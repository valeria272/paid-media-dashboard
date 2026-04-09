import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useDashboardData() {
  const refreshInterval = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL) || 300000

  const { data, error, isLoading, mutate } = useSWR(
    '/api/dashboard',
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 60000,
    }
  )

  return {
    data,
    error,
    isLoading,
    refresh: mutate,
    lastUpdated: data?.lastUpdated,
  }
}
