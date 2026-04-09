'use client'

import { ApprovalRequest } from '@/lib/types'
import { useState } from 'react'

interface ApprovalCardProps {
  approval: ApprovalRequest
  onReview: (id: string, action: 'approved' | 'rejected', notes: string) => void
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-700', label: 'Pendiente' },
  approved: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', label: 'Aprobado' },
  rejected: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Rechazado' },
  expired: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: 'Expirado' },
}

export function ApprovalCard({ approval, onReview }: ApprovalCardProps) {
  const [notes, setNotes] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const style = STATUS_STYLES[approval.status]

  const handleReview = (action: 'approved' | 'rejected') => {
    onReview(approval.id, action, notes)
    setIsReviewing(false)
    setNotes('')
  }

  return (
    <div className={`${style.bg} border rounded-xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold uppercase ${style.text}`}>
          {style.label}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(approval.createdAt).toLocaleString('es-CL')}
        </span>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2">{approval.description}</h3>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <span className="text-gray-500">Plataforma:</span>{' '}
          <span className="font-medium">{approval.platform}</span>
        </div>
        <div>
          <span className="text-gray-500">Campana:</span>{' '}
          <span className="font-medium">{approval.campaignName}</span>
        </div>
        <div>
          <span className="text-gray-500">Valor actual:</span>{' '}
          <span className="font-medium">{approval.currentValue}</span>
        </div>
        <div>
          <span className="text-gray-500">Propuesto:</span>{' '}
          <span className="font-medium text-indigo-600">{approval.proposedValue}</span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-2">
        <span className="font-medium">Razon:</span> {approval.reason}
      </p>
      <p className="text-sm text-gray-600 mb-4">
        <span className="font-medium">Impacto esperado:</span> {approval.impact}
      </p>

      {approval.status === 'pending' && (
        <>
          {!isReviewing ? (
            <button
              onClick={() => setIsReviewing(true)}
              className="text-sm text-indigo-600 font-medium hover:text-indigo-700"
            >
              Revisar cambio
            </button>
          ) : (
            <div className="space-y-3 border-t border-gray-200 pt-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas de revision (opcional)"
                className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleReview('approved')}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => handleReview('rejected')}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => setIsReviewing(false)}
                  className="px-4 py-2 text-gray-500 text-sm font-medium hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {approval.reviewedBy && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-500">
          Revisado por {approval.reviewedBy} el{' '}
          {new Date(approval.reviewedAt!).toLocaleString('es-CL')}
          {approval.reviewNotes && (
            <p className="mt-1 italic">&quot;{approval.reviewNotes}&quot;</p>
          )}
        </div>
      )}
    </div>
  )
}
