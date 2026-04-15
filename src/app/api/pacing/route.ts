// ═══ Endpoint de pacing semanal ═══
// Orquesta: lee planilla → fetcha gasto real → detecta sobreinversión → actualiza planilla → alerta Slack
// Protegido con CRON_SECRET
// Llamado por el cron cada lunes a las 09:00 CLT

import { NextRequest, NextResponse } from 'next/server'
import { readPacingRows, writeWeeklySpend, calculateProjection } from '@/lib/fetchers/pacingSheet'
import { fetchSpendByChannel } from '@/lib/fetchers/pacingSpend'
import { findPacingClient } from '@/config/pacing-clients'
import { sendPacingOverspendAlerts, sendPacingWeeklySummary, sendPacingInactiveAlerts, type PacingAlertItem, type PacingInactiveItem } from '@/lib/slack/pacingAlerts'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const weekParam = request.nextUrl.searchParams.get('week')
  const targetWeek = weekParam ? parseInt(weekParam, 10) : undefined

  return runPacing(targetWeek)
}

// También permite llamada directa desde el cron sin pasar por la autenticación del request
export async function runPacing(targetWeek?: number) {
  const now = new Date()
  const currentDay = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

  console.log(`[pacing] Iniciando run — día ${currentDay}/${daysInMonth}`)

  // 1. Leer filas del mes actual desde la planilla
  const rows = await readPacingRows(undefined, targetWeek)

  if (rows.length === 0) {
    console.warn('[pacing] No se encontraron filas para el mes actual')
    return NextResponse.json({ success: false, reason: 'no_rows' })
  }

  console.log(`[pacing] ${rows.length} filas encontradas para procesar`)

  // 2. Para cada fila, fetchear el gasto real del período de la semana
  const updates: Array<{ row: typeof rows[0]; spend: number }> = []
  const results: Array<{
    clientName: string
    channel: string
    approvedBudget: number
    weeklySpend: number
    accumulatedSpend: number
    percentUsed: number
    weekLabel: string
  }> = []
  const critical: PacingAlertItem[] = []
  const warning: PacingAlertItem[] = []
  const inactive: PacingInactiveItem[] = []
  const skipped: string[] = []

  await Promise.allSettled(
    rows.map(async (row) => {
      // Buscar config del cliente
      const clientConfig = findPacingClient(row.clientName)

      if (!clientConfig) {
        skipped.push(`${row.clientName} — no está en pacing-clients.ts`)
        return
      }

      // Verificar que la semana actual no tenga ya datos registrados
      const existingSpend = row.weeklySpend[row.currentWeek - 1]
      if (existingSpend !== null && existingSpend > 0) {
        console.log(`[pacing] ${row.clientName} | ${row.channel} — Semana ${row.currentWeek} ya tiene datos ($${existingSpend})`)
        return
      }

      // Fetchear gasto real de la API correspondiente
      const spend = await fetchSpendByChannel(
        clientConfig,
        row.channel,
        row.weekRange.start,
        row.weekRange.end
      )

      if (spend === null) {
        skipped.push(`${row.clientName} | ${row.channel} — ID de cuenta no configurado (PENDING)`)
        return
      }

      // Calcular gasto acumulado incluyendo esta semana
      const previousSpend = row.weeklySpend
        .slice(0, row.currentWeek - 1)
        .reduce((sum, s) => (sum ?? 0) + (s ?? 0), 0) as number
      const newAccumulated = previousSpend + spend

      // Proyección al cierre del mes
      const projected = calculateProjection(newAccumulated, currentDay, daysInMonth)
      const percentUsed = row.approvedBudget > 0 ? (newAccumulated / row.approvedBudget) * 100 : 0
      const percentProjected = row.approvedBudget > 0 ? (projected / row.approvedBudget) * 100 : 0

      const weekLabel = `Semana ${row.currentWeek} (${row.weekRange.start} → ${row.weekRange.end})`

      const alertItem: PacingAlertItem = {
        clientName: row.clientName,
        channel: row.channel,
        approvedBudget: row.approvedBudget,
        accumulatedSpend: newAccumulated,
        projectedSpend: projected,
        percentUsed,
        percentProjected,
        daysElapsed: currentDay,
        daysInMonth,
        weekLabel,
      }

      // Clasificar alertas
      if (percentProjected > 100) {
        critical.push(alertItem)
      } else if (percentProjected > 90) {
        warning.push(alertItem)
      }

      // Agregar a actualizaciones de planilla
      updates.push({ row, spend })

      results.push({
        clientName: row.clientName,
        channel: row.channel,
        approvedBudget: row.approvedBudget,
        weeklySpend: spend,
        accumulatedSpend: newAccumulated,
        percentUsed,
        weekLabel,
      })
    })
  )

  // 3. Escribir gasto semanal en la planilla
  const writeResult = await writeWeeklySpend(updates)

  // 4. Detectar cuentas inactivas (presupuesto aprobado pero sin gasto en ninguna semana)
  for (const row of rows) {
    if (row.approvedBudget <= 0) continue
    const totalSpend = row.weeklySpend.reduce<number>((s, v) => s + (v ?? 0), 0)
    if (totalSpend === 0) {
      inactive.push({
        clientName: row.clientName,
        channel: row.channel,
        approvedBudget: row.approvedBudget,
        daysElapsed: currentDay,
        daysInMonth,
      })
    }
  }

  // 5. Enviar alertas Slack
  let slackSent = false

  if (critical.length > 0 || warning.length > 0) {
    slackSent = await sendPacingOverspendAlerts(critical, warning)
  } else if (results.length > 0) {
    slackSent = await sendPacingWeeklySummary(results)
  }

  if (inactive.length > 0) {
    await sendPacingInactiveAlerts(inactive)
  }

  console.log(`[pacing] Completado — ${updates.length} actualizadas, ${skipped.length} omitidas, ${critical.length} críticas, ${inactive.length} inactivas`)

  return NextResponse.json({
    success: true,
    summary: {
      rowsProcessed: rows.length,
      updated: writeResult.written,
      skipped: skipped.length,
      skippedReasons: skipped,
      criticalAlerts: critical.length,
      warningAlerts: warning.length,
      inactiveAlerts: inactive.length,
      slackSent,
    },
    critical: critical.map(a => ({
      client: a.clientName,
      channel: a.channel,
      approved: a.approvedBudget,
      projected: a.projectedSpend,
      overBy: a.projectedSpend - a.approvedBudget,
    })),
    period: {
      day: currentDay,
      daysInMonth,
      date: now.toISOString().split('T')[0],
    },
  })
}

// POST: disparo manual desde el dashboard (sin CRON_SECRET)
export async function POST() {
  return runPacing()
}

export const dynamic = 'force-dynamic'
