import { ApprovalRequest, ApprovalStatus } from '@/lib/types'
import { sendApprovalRequestToSlack } from '@/lib/slack/sendAlert'

// ═══ Sistema de Aprobaciones Humanas ═══
// REGLA: NUNCA ejecutar cambios sin aprobación del paid media specialist

// En producción esto sería una base de datos.
// Para MVP usamos almacenamiento en memoria con datos de ejemplo.
let approvals: ApprovalRequest[] = [
  {
    id: 'approval-demo-1',
    type: 'pause_campaign',
    platform: 'google',
    campaignName: 'CopyLab | DSA Servicios',
    description: 'Pausar campaña por falta de conversiones',
    currentValue: 'Activa — $65.000 gastados, 0 conversiones',
    proposedValue: 'Pausar campaña',
    reason: 'Sin conversiones con gasto significativo. CPA infinito indica problema de segmentación o landing.',
    impact: 'Ahorro estimado $90.000/día. Redirigir presupuesto a Brand Search que tiene CPA excelente.',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'approval-demo-2',
    type: 'budget_change',
    platform: 'google',
    campaignName: 'CopyLab | Brand Search',
    description: 'Escalar presupuesto por CPA excelente',
    currentValue: 'Presupuesto: $100.000/día — CPA: $3.727',
    proposedValue: 'Presupuesto: $150.000/día (+50%)',
    reason: 'CPA de $3.727 es 25% mejor que el objetivo de $5.000 con 22 conversiones. Campaña claramente subexplotada.',
    impact: 'Potencial de ~11 conversiones adicionales por día manteniendo CPA bajo objetivo.',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
  },
  {
    id: 'approval-demo-3',
    type: 'bid_change',
    platform: 'meta',
    campaignName: 'CopyLab | Lookalike Compradores',
    description: 'Reducir puja por CPA fuera de rango',
    currentValue: 'CPA actual: $30.667 — Objetivo: $13.000',
    proposedValue: 'Reducir puja un 30% y limitar CPA máximo a $15.000',
    reason: 'CPA supera 2x el objetivo. La campaña está compitiendo en audiencias muy caras sin retorno.',
    impact: 'Reducir gasto ineficiente y forzar la plataforma a buscar conversiones más baratas.',
    status: 'pending',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 horas atrás
  },
  {
    id: 'approval-demo-4',
    type: 'optimization',
    platform: 'meta',
    campaignName: 'CopyLab | Retargeting Web',
    description: 'Escalar retargeting por rendimiento excepcional',
    currentValue: 'Presupuesto: $80.000/día — CPA: $3.455',
    proposedValue: 'Presupuesto: $120.000/día (+50%)',
    reason: 'CPA de $3.455 es 42% mejor que objetivo de $6.000 con 11 conversiones. Mejor campaña del portfolio.',
    impact: 'Potencial de ~6 conversiones adicionales al día. ROI más alto de todas las campañas activas.',
    status: 'approved',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // ayer
    reviewedAt: new Date(Date.now() - 82800000).toISOString(),
    reviewedBy: 'Paid Media Specialist',
    reviewNotes: 'Aprobado. Excelente performance, escalar gradualmente y monitorear frecuencia.',
  },
]

export function getApprovals(): ApprovalRequest[] {
  return [...approvals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export function getPendingApprovals(): ApprovalRequest[] {
  return approvals.filter(a => a.status === 'pending')
}

export function getApprovalById(id: string): ApprovalRequest | undefined {
  return approvals.find(a => a.id === id)
}

export async function createApproval(
  request: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>
): Promise<ApprovalRequest> {
  const approval: ApprovalRequest = {
    ...request,
    id: `approval-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  approvals.push(approval)

  // Notificar por Slack para que el humano revise
  await sendApprovalRequestToSlack(approval)

  return approval
}

export function reviewApproval(
  id: string,
  action: 'approved' | 'rejected',
  reviewedBy: string,
  reviewNotes?: string
): ApprovalRequest | null {
  const index = approvals.findIndex(a => a.id === id)
  if (index === -1) return null

  approvals[index] = {
    ...approvals[index],
    status: action as ApprovalStatus,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    reviewNotes,
  }

  return approvals[index]
}

// Expirar aprobaciones pendientes después de 24 horas
export function expireOldApprovals(): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000
  let expired = 0

  approvals = approvals.map(a => {
    if (a.status === 'pending' && new Date(a.createdAt).getTime() < cutoff) {
      expired++
      return { ...a, status: 'expired' as ApprovalStatus }
    }
    return a
  })

  return expired
}
