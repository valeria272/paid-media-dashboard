import useSWR from 'swr'
import { ApprovalRequest } from '@/lib/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useApprovals() {
  const { data, mutate } = useSWR('/api/approvals', fetcher, {
    refreshInterval: 30000, // cada 30 segundos — las aprobaciones son urgentes
    revalidateOnFocus: true,
  })

  const approvals: ApprovalRequest[] = data?.approvals || []

  const reviewApproval = async (id: string, action: 'approved' | 'rejected', notes: string) => {
    await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action, reviewedBy: 'Paid Media Specialist', notes }),
    })
    mutate()
  }

  return {
    approvals,
    pendingCount: approvals.filter(a => a.status === 'pending').length,
    reviewApproval,
    refresh: mutate,
  }
}
