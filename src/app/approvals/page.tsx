'use client'

import { useApprovals } from '@/hooks/useApprovals'
import { Sidebar } from '@/components/layout/Sidebar'
import { ApprovalCard } from '@/components/approvals/ApprovalCard'

export default function ApprovalsPage() {
  const { approvals, pendingCount, reviewApproval } = useApprovals()

  const pending = approvals.filter(a => a.status === 'pending')
  const reviewed = approvals.filter(a => a.status !== 'pending')

  return (
    <div className="flex min-h-screen">
      <Sidebar pendingApprovals={pendingCount} />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900">Aprobaciones</h1>
            <p className="text-sm text-gray-500 mt-1">
              Todos los cambios requieren revision del Paid Media Specialist antes de ejecutarse.
            </p>
          </div>

          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Pendientes ({pending.length})
              </h2>
              <div className="space-y-4">
                {pending.map(approval => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onReview={reviewApproval}
                  />
                ))}
              </div>
            </div>
          )}

          {pending.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mb-8">
              <p className="text-green-700 font-medium">Sin cambios pendientes de revision</p>
              <p className="text-sm text-green-600 mt-1">Todas las solicitudes han sido procesadas.</p>
            </div>
          )}

          {reviewed.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-4">
                Historial
              </h2>
              <div className="space-y-4">
                {reviewed.map(approval => (
                  <ApprovalCard
                    key={approval.id}
                    approval={approval}
                    onReview={reviewApproval}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
