// ═══ Estado actual del pacing — solo lectura de planilla ═══
// No llama a APIs de ad platforms, solo lee el estado guardado en Sheets
// Acumulado: suma de semanas escritas (no fórmula del sheet, que puede estar vacía)

import { NextResponse } from 'next/server'
import { readPacingRows, calculateProjection } from '@/lib/fetchers/pacingSheet'

export interface PacingStatusRow {
  clientName: string
  channel: string
  approvedBudget: number
  accumulatedSpend: number
  projectedSpend: number
  percentUsed: number
  percentProjected: number
  overspendAmount: number   // > 0 si proyecta sobrepasar el presupuesto
  status: 'ok' | 'warning' | 'critical' | 'inactive'
}

export async function GET() {
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  const rows = await readPacingRows(undefined, undefined, true)

  const data: PacingStatusRow[] = rows.map(row => {
    // Sumar semanas escritas directamente (más confiable que la fórmula del sheet)
    const accumulatedSpend = row.weeklySpend.reduce<number>(
      (sum, s) => sum + (s ?? 0),
      0
    )

    const projected = calculateProjection(accumulatedSpend, currentDay, daysInMonth)
    const percentUsed = row.approvedBudget > 0 ? (accumulatedSpend / row.approvedBudget) * 100 : 0
    const percentProjected = row.approvedBudget > 0 ? (projected / row.approvedBudget) * 100 : 0
    const overspendAmount = Math.max(0, projected - row.approvedBudget)

    let status: 'ok' | 'warning' | 'critical' | 'inactive' = 'ok'
    if (row.approvedBudget > 0 && accumulatedSpend === 0) status = 'inactive'
    else if (percentProjected > 100) status = 'critical'
    else if (percentProjected > 90) status = 'warning'

    return {
      clientName: row.clientName,
      channel: row.channel,
      approvedBudget: row.approvedBudget,
      accumulatedSpend,
      projectedSpend: projected,
      percentUsed,
      percentProjected,
      overspendAmount,
      status,
    }
  })

  const totalBudget = data.reduce((s, r) => s + r.approvedBudget, 0)
  const totalAccumulated = data.reduce((s, r) => s + r.accumulatedSpend, 0)
  const totalProjected = data.reduce((s, r) => s + r.projectedSpend, 0)
  const criticalCount = data.filter(r => r.status === 'critical').length
  const warningCount = data.filter(r => r.status === 'warning').length
  const inactiveCount = data.filter(r => r.status === 'inactive').length

  return NextResponse.json({
    rows: data,
    totals: { totalBudget, totalAccumulated, totalProjected, criticalCount, warningCount, inactiveCount },
    period: { day: currentDay, daysInMonth, date: now.toISOString().split('T')[0] },
  })
}

export const dynamic = 'force-dynamic'
