import { NextRequest, NextResponse } from 'next/server'
import { getApprovals, reviewApproval } from '@/lib/approvals/approvalStore'

// GET — listar aprobaciones
export async function GET() {
  const approvals = getApprovals()

  return NextResponse.json({
    approvals,
    pendingCount: approvals.filter(a => a.status === 'pending').length,
  })
}

// POST — revisar una aprobación (aprobar/rechazar)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id, action, reviewedBy, notes } = body

  if (!id || !action || !['approved', 'rejected'].includes(action)) {
    return NextResponse.json(
      { error: 'Se requiere id y action (approved/rejected)' },
      { status: 400 }
    )
  }

  const result = reviewApproval(id, action, reviewedBy || 'Unknown', notes)

  if (!result) {
    return NextResponse.json(
      { error: 'Aprobacion no encontrada' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    success: true,
    approval: result,
    message: action === 'approved'
      ? 'Cambio aprobado. Se ejecutara el cambio en la plataforma.'
      : 'Cambio rechazado. No se realizara ningun cambio.',
  })
}
