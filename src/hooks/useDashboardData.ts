import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useDashboardData(startDate?: string, endDate?: string) {
  const refreshInterval = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL) || 300000

  // Si hay fechas custom, agregar como query params
  let url = '/api/dashboard'
  if (startDate && endDate) {
    url += `?start=${startDate}&end=${endDate}`
  }

  const { data, error, isLoading, mutate } = useSWR(
    url,
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
